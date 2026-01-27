/**
 * Step 6: Transition 적용
 * ANIMATION.md 표준 파이프라인 6단계
 */

import { TransitionFactory } from '../../effects/transitions/TransitionFactory'
import { isShaderTransition } from '../../effects/transitions/shader/shaders'
import { calculateTransitionStartTime } from '../utils/calculateTransitionTiming'
import { applyMotionToSprite } from './step5-applyMotion'
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

  // Transition Shader Pass 처리 (Shader Transition만 별도 처리)
  // Shader Transition이 활성화되어 있고 지원되는 타입이면 Shader Transition 사용
  // 그 외의 경우는 아래의 Direct Transition으로 처리됨
  if (step8Result.isTransitionInProgress && !options?.skipAnimation) {
    const transitionType = scene.transition || 'none'
    const transitionMode = TransitionFactory.getMode(sceneIndex)

    // Shader 기반 Transition인지 확인
    if (transitionMode === 'shader' && isShaderTransition(transitionType)) {
      // Shader Transition 처리 (fade, wipe, circle 등)
      applyShaderTransition(
        tSec,
        sceneIndex,
        step8Result.previousRenderedSceneIndex,
        transitionType,
        scene
      )
      // Shader Transition을 사용하면 Direct Transition은 실행하지 않음
      return
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

  // 텍스트 객체 관리는 step7에서 처리하므로 여기서는 건드리지 않음
  // step7에서 매 프레임마다 자막을 렌더링하므로, step6에서 텍스트를 숨기면 자막이 사라지는 문제 발생
  // 자막의 visible/alpha는 step7의 renderSubtitlePart에서 관리됨

  // Transition 매 프레임 업데이트 (ANIMATION.md 표준: progress 기반)
  // GSAP timeline 동기화 로직 제거 → applyDirectTransition으로 대체
  if (!options?.skipAnimation) {
    const currentScene = timeline.scenes[sceneIndex]
    const nextScene = timeline.scenes[sceneIndex + 1]
    const isSameSceneId = nextScene && currentScene?.sceneId === nextScene.sceneId
    
    // Transition duration을 1초로 고정 (움직임효과만 TTS 캐시 duration 사용)
    let transitionDuration = 0
    if (!isSameSceneId) {
      transitionDuration = 1.0 // 1초로 고정
    }

    // Transition이 있을 때만 업데이트
    // 주의: hasPreviousScene 체크 제거 - Transition 진행 중에는 이전 씬 스프라이트를 찾아서 사용
    if (transitionDuration > 0) {
      const currentTransition = (currentScene?.transition || 'none').toLowerCase()
      const currentSprite = spritesRef.current.get(sceneIndex)

      // Transition 시작 시간 계산 (TTS 캐시 사용하여 정확한 duration 계산)
      // Transition은 씬 시작 시점에 시작되도록 함
      // calculateTransitionStartTime 함수 사용하여 일관성 유지
      const transitionStartTime = calculateTransitionStartTime({
        timeline,
        sceneIndex,
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
      })
      const relativeTime = tSec - transitionStartTime

      // Transition 진행 중이거나 방금 끝난 경우 업데이트
      const isTransitionActive = relativeTime >= 0 && relativeTime <= transitionDuration
      const isJustCompleted = relativeTime > transitionDuration && relativeTime <= transitionDuration + 0.1

      // Transition 진행 중에는 매 프레임마다 렌더링되어야 함
      if (isTransitionActive || isJustCompleted) {
        const progress = Math.min(1, Math.max(0, relativeTime / transitionDuration))
        
        // Transition이 완료되면 이전 씬 스프라이트 숨김 (progress가 1에 가까울 때)
        if (progress >= 0.99 || isJustCompleted) {
          const previousSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : null
          const previousSprite = previousSceneIndex !== null
            ? spritesRef.current.get(previousSceneIndex)
            : null

          if (previousSprite && !previousSprite.destroyed) {
            // Transition 완료 후 이전 씬 스프라이트 숨김
            previousSprite.visible = false
            previousSprite.alpha = 0
            // 컨테이너에서도 제거 (선택사항 - 숨김만으로도 충분하지만 깔끔하게 제거)
            if (containerRef.current && previousSprite.parent === containerRef.current) {
              containerRef.current.removeChild(previousSprite)
            }
          }
        }

        // 스프라이트가 없으면 생성해야 함
        if (!currentSprite && containerRef.current) {
          // 스프라이트가 아직 로드되지 않았을 수 있음 - 다음 프레임에 다시 시도
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

          // Transition 진행 중일 때만 이전 스프라이트를 보이게 함
          // step3에서 숨긴 것을 여기서 다시 보이게 함 (Transition에 필요)
          if (previousSprite && !previousSprite.destroyed && containerRef.current && previousSceneIndex !== null && previousSceneIndex >= 0) {
            // 이전 씬의 Motion을 중지하기 위해 원래 위치로 리셋 (한 번만)
            // 매 프레임마다 리셋하면 성능 저하이므로, 첫 프레임에만 리셋
            if (progress < 0.01) {
              const previousScene = timeline.scenes[previousSceneIndex]
              if (previousScene) {
                const { resetBaseStateCallback } = context
                resetBaseStateCallback(previousSprite, null, previousSceneIndex, previousScene)
              }
            }
            
            // 이전 스프라이트를 컨테이너에 추가하고 보이게 함
            if (previousSprite.parent !== containerRef.current) {
              if (previousSprite.parent) {
                previousSprite.parent.removeChild(previousSprite)
              }
              containerRef.current.addChild(previousSprite)
              containerRef.current.setChildIndex(previousSprite, 0)
            }
            // Transition 진행 중이므로 이전 스프라이트를 보이게 함
            // applyDirectTransition이 alpha를 설정하므로 여기서는 visible만 설정
            previousSprite.visible = true
            // alpha는 applyDirectTransition에서 설정하므로 여기서는 설정하지 않음
          }

          // applyDirectTransition으로 Transition 적용 (ANIMATION.md 표준)
          // Transition 진행 중에는 매 프레임마다 호출되어야 함
          // applyDirectTransition이 toSprite와 fromSprite의 alpha를 설정함
          applyDirectTransition(
            currentSprite,
            previousSprite && !previousSprite.destroyed ? previousSprite : null,
            currentTransition,
            progress,
            sceneIndex
          )

          // Transition 적용 후 Motion을 다시 적용 (Transition이 적용한 위치를 기준으로 Motion 추가 적용)
          // Transition과 Motion을 동시에 적용하여 씬 전환 중에도 이미지 움직임 효과 가능
          if (currentSprite && !currentSprite.destroyed && scene.motion) {
            applyMotionToSprite(context, sceneIndex, scene, currentSprite, step8Result, true)
          }

        }
      }
    }
  }
}
