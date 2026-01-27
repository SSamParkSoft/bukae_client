/**
 * Step 6: Transition 적용
 * ANIMATION.md 표준 파이프라인 6단계
 */

import { TransitionFactory } from '../../effects/transitions/TransitionFactory'
import { isShaderTransition } from '../../effects/transitions/shader/shaders'
import type { PipelineContext, Step8Result } from './types'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import * as PIXI from 'pixi.js'

/**
 * 6단계: Transition 적용
 * 
 * @param context 파이프라인 컨텍스트
 * @param sceneIndex 씬 인덱스
 * @param scene 씬 데이터
 * @param sceneText 텍스트 객체
 * @param step8Result Step 8 결과 (Transition 진행 중 여부 확인용)
 */
export function step6ApplyTransition(
  context: PipelineContext,
  sceneIndex: number,
  scene: TimelineScene,
  sceneText: PIXI.Text | undefined,
  step8Result: Step8Result
): void {
  const {
    timeline,
    tSec,
    options,
    containerRef,
    spritesRef,
    textsRef,
    subtitleContainerRef,
    transitionShaderManagerRef,
    applyShaderTransition,
    applyDirectTransition,
    lastTransitionLogRef,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
  } = context

  // Transition Shader Pass 또는 GSAP 기반 Transition 처리
  if (step8Result.isTransitionInProgress && !options?.skipAnimation) {
    const transitionType = scene.transition || 'none'
    const transitionMode = TransitionFactory.getMode(sceneIndex)

    // 디버깅 로그 (개발 모드)
    // Transition state 로그 제거 (불필요한 로그 정리)
    const DEBUG_TRANSITION = process.env.NODE_ENV === 'development'
    if (DEBUG_TRANSITION && Math.floor(tSec * 30) % 10 === 0) {
      // 로그 제거됨
    }

    // Shader 기반 Transition인지 확인
    if (transitionMode === 'shader' && isShaderTransition(transitionType)) {
      // Shader Transition 처리
      applyShaderTransition(
        tSec,
        sceneIndex,
        step8Result.previousRenderedSceneIndex,
        transitionType,
        scene
      )
    } else {
      // Shader가 지원되지 않는 Transition은 applyDirectTransition으로 처리됨
      // (아래의 Transition 매 프레임 업데이트 부분에서 처리)
    }
  } else {
    // Transition이 없으면 Shader Manager 정리
    if (transitionShaderManagerRef.current?.isActive()) {
      transitionShaderManagerRef.current.endTransition()
    }
  }

  // 현재 씬의 텍스트 객체를 자막 Container에 추가 (Shader Transition을 위한 분리)
  if (sceneText && !sceneText.destroyed) {
    const targetContainer = subtitleContainerRef.current || containerRef.current
    if (targetContainer) {
      // 텍스트 객체가 다른 부모에 있으면 제거
      if (sceneText.parent && sceneText.parent !== targetContainer) {
        sceneText.parent.removeChild(sceneText)
      }
      // 컨테이너에 없으면 추가
      if (sceneText.parent !== targetContainer) {
        targetContainer.addChild(sceneText)
      }
      // 자막 Container를 사용하는 경우, 자막 Container를 최상위로 유지
      if (subtitleContainerRef.current && containerRef.current) {
        // subtitleContainerRef.current가 containerRef.current의 자식인지 확인
        if (subtitleContainerRef.current.parent === containerRef.current) {
          const subtitleIndex = containerRef.current.getChildIndex(subtitleContainerRef.current)
          const maxIndex = containerRef.current.children.length - 1
          if (subtitleIndex !== maxIndex) {
            containerRef.current.setChildIndex(subtitleContainerRef.current, maxIndex)
          }
        } else {
          // 자식이 아니면 추가
          containerRef.current.addChild(subtitleContainerRef.current)
          const maxIndex = containerRef.current.children.length - 1
          containerRef.current.setChildIndex(subtitleContainerRef.current, maxIndex)
        }
      } else if (targetContainer === containerRef.current) {
        // 기존 방식: 텍스트는 항상 최상위 레이어
        const maxIndex = targetContainer.children.length - 1
        if (maxIndex > 0 && targetContainer.getChildIndex(sceneText) !== maxIndex) {
          targetContainer.setChildIndex(sceneText, maxIndex)
        }
      }
    }
  }

  // 다른 씬의 텍스트 객체 숨기기 (자막 누적 방지)
  // 드래그 중 쓰로틀링으로 인한 자막 겹침을 방지하기 위해 먼저 모든 텍스트 숨김
  textsRef.current.forEach((textObj, textSceneIndex) => {
    if (textSceneIndex !== sceneIndex && !textObj.destroyed) {
      textObj.visible = false
      textObj.alpha = 0
    }
  })

  // 같은 그룹 내 다른 씬의 텍스트도 숨김 (같은 텍스트 객체를 공유하는 경우)
  const currentScene = timeline.scenes[sceneIndex]
  if (currentScene?.sceneId !== undefined) {
    const sameGroupSceneIndices = timeline.scenes
      .map((s, idx) => (s.sceneId === currentScene.sceneId ? idx : -1))
      .filter((idx) => idx >= 0 && idx !== sceneIndex)

    sameGroupSceneIndices.forEach((groupSceneIndex) => {
      const groupTextObj = textsRef.current.get(groupSceneIndex)
      if (groupTextObj && !groupTextObj.destroyed) {
        groupTextObj.visible = false
        groupTextObj.alpha = 0
      }
    })
  }

  // Transition 매 프레임 업데이트 (ANIMATION.md 표준: progress 기반)
  // GSAP timeline 동기화 로직 제거 → applyDirectTransition으로 대체
  if (!options?.skipAnimation) {
    const currentScene = timeline.scenes[sceneIndex]
    const nextScene = timeline.scenes[sceneIndex + 1]
    const isSameSceneId = nextScene && currentScene?.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (currentScene?.transitionDuration || 0.5)

    // Transition이 있을 때만 업데이트
    // 주의: hasPreviousScene 체크 제거 - Transition 진행 중에는 이전 씬 스프라이트를 찾아서 사용
    if (transitionDuration > 0) {
      const currentTransition = (currentScene?.transition || 'fade').toLowerCase()
      const currentSprite = spritesRef.current.get(sceneIndex)

      // Transition 시작 시간 계산 (TTS 캐시 사용하여 정확한 duration 계산)
      // Transition은 현재 씬이 시작되기 전에 시작되어야 함
      let sceneStartTime = 0
      for (let i = 0; i < sceneIndex; i++) {
        const prevScene = timeline.scenes[i]
        if (!prevScene) continue

        let sceneDuration = 0
        if (ttsCacheRef && buildSceneMarkup && makeTtsKey) {
          const sceneVoiceTemplate = prevScene.voiceTemplate || voiceTemplate
          if (sceneVoiceTemplate) {
            const markups = buildSceneMarkup(timeline, i)
            for (const markup of markups) {
              const key = makeTtsKey(sceneVoiceTemplate, markup)
              const cached = ttsCacheRef.current.get(key)
              if (cached?.durationSec && cached.durationSec > 0) {
                sceneDuration += cached.durationSec
              }
            }
          }
        }

        if (sceneDuration === 0) {
          sceneDuration = prevScene.duration || 0
        }

        const prevNextScene = timeline.scenes[i + 1]
        const prevIsSameSceneId = prevNextScene && prevScene.sceneId === prevNextScene.sceneId
        const prevTransitionDuration = prevIsSameSceneId ? 0 : (prevScene.transitionDuration || 0.5)

        sceneStartTime += sceneDuration + prevTransitionDuration
      }

      // Transition 시작 시간 = 현재 씬 시작 시간 - transitionDuration
      const transitionStartTime = sceneStartTime - transitionDuration
      const relativeTime = tSec - transitionStartTime

      // Transition 진행 중이거나 방금 끝난 경우 업데이트
      const isTransitionActive = relativeTime >= 0 && relativeTime <= transitionDuration
      const isJustCompleted = relativeTime > transitionDuration && relativeTime <= transitionDuration + 0.1

      // Transition 진행 중에는 매 프레임마다 렌더링되어야 함
      if (isTransitionActive || isJustCompleted) {
        // Transition이 완료되면 이전 씬 스프라이트 제거 (먼저 처리)
        if (isJustCompleted || (isTransitionActive && relativeTime >= transitionDuration - 0.01)) {
          const previousSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : null
          const previousSprite = previousSceneIndex !== null
            ? spritesRef.current.get(previousSceneIndex)
            : null

          if (previousSprite && !previousSprite.destroyed && containerRef.current) {
            // Transition 완료 후 이전 씬 스프라이트 제거 (로그 없음 - 정상 동작)
            if (previousSprite.parent === containerRef.current) {
              containerRef.current.removeChild(previousSprite)
            }
            previousSprite.visible = false
            previousSprite.alpha = 0
          }
        }
        const progress = Math.min(1, Math.max(0, relativeTime / transitionDuration))

        // 스프라이트가 없으면 생성해야 함
        if (!currentSprite && containerRef.current) {
          // 스프라이트가 아직 로드되지 않았을 수 있음 - 다음 프레임에 다시 시도
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Transition] Sprite not found for scene ${sceneIndex} at t=${tSec.toFixed(3)}`)
          }
        }

        // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
        if (currentSprite && !currentSprite.destroyed && containerRef.current) {
          // 중복 체크: 같은 스프라이트가 이미 컨테이너에 있는지 확인
          const spriteAlreadyInContainer = currentSprite.parent === containerRef.current

          // 중복 체크: 같은 스프라이트가 이미 컨테이너에 있는지 확인 (더 엄격하게)
          const existingSpriteIndices: number[] = []
          containerRef.current.children.forEach((child, idx) => {
            if (child === currentSprite) {
              existingSpriteIndices.push(idx)
            }
          })

          // 중복된 스프라이트가 있으면 제거 (첫 번째를 제외한 나머지)
          if (existingSpriteIndices.length > 1) {
            for (let i = existingSpriteIndices.length - 1; i > 0; i--) {
              const idx = existingSpriteIndices[i]
              if (containerRef.current.children[idx] === currentSprite) {
                containerRef.current.removeChildAt(idx)
              }
            }
          }

          if (!spriteAlreadyInContainer) {
            if (currentSprite.parent) {
              currentSprite.parent.removeChild(currentSprite)
            }
            containerRef.current.addChild(currentSprite)
            containerRef.current.setChildIndex(currentSprite, 0)
          }

          // 이전 씬 스프라이트 찾기 (Transition 진행 중이므로 이전 씬은 sceneIndex - 1)
          const previousSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : null
          const previousSprite = previousSceneIndex !== null
            ? spritesRef.current.get(previousSceneIndex)
            : null

          // applyDirectTransition으로 Transition 적용 (ANIMATION.md 표준)
          // Transition 진행 중에는 매 프레임마다 호출되어야 함
          applyDirectTransition(
            currentSprite,
            previousSprite && !previousSprite.destroyed ? previousSprite : null,
            currentTransition,
            progress,
            sceneIndex
          )

          // Transition 로그 출력 (디버깅용 - 최소화)
          if (process.env.NODE_ENV === 'development') {
            const lastLog = lastTransitionLogRef.current
            const isNewTransition = !lastLog || lastLog.sceneIndex !== sceneIndex

            // IN PROGRESS는 Transition 진행 중에 출력 (샘플링: 매 3프레임마다)
            if (progress > 0 && progress < 1) {
              const shouldLog = Math.floor(relativeTime * 30) % 3 === 0 // 매 3프레임마다
              if (shouldLog) {
                console.log(`%c🎬 TRANSITION IN PROGRESS`, `color: #9C27B0; font-weight: bold; font-size: 11px;`, {
                  progress: progress.toFixed(3),
                  tSec: tSec.toFixed(3),
                  sceneIndex,
                  relativeTime: relativeTime.toFixed(3),
                  transitionDuration: transitionDuration.toFixed(3),
                })
                lastTransitionLogRef.current = { sceneIndex, progress, logType: 'IN_PROGRESS' }
              }
            }
            // COMPLETED는 Transition이 끝날 때 한 번만 출력
            else if (progress >= 1 || relativeTime >= transitionDuration) {
              if (isNewTransition || lastLog?.logType !== 'COMPLETED') {
                console.log(`%c🎬 TRANSITION COMPLETED`, `color: #4CAF50; font-weight: bold; font-size: 11px;`, {
                  progress: progress.toFixed(3),
                  tSec: tSec.toFixed(3),
                  sceneIndex,
                  relativeTime: relativeTime.toFixed(3),
                  transitionDuration: transitionDuration.toFixed(3),
                })
                lastTransitionLogRef.current = { sceneIndex, progress, logType: 'COMPLETED' }
              }
            }
          }
        }
      }
    }
  }
}
