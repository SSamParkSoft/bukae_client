/**
 * Step 3: 컨테이너 구성 보장
 * ANIMATION.md 표준 파이프라인 3단계
 */

import type { PipelineContext, Step8Result } from './types'
import * as PIXI from 'pixi.js'

/**
 * 3단계: 컨테이너 구성 보장
 * 
 * 현재 씬 container 존재 보장
 * 전환(Transition) 중에는 이전 씬 container도 유지
 * 전환이 아닐 때만 이전 씬 리소스 정리
 * 
 * @param context 파이프라인 컨텍스트
 * @param sceneIndex 씬 인덱스
 * @param sprite 스프라이트
 * @param sceneText 텍스트 객체
 * @param step8Result Step 8 결과 (씬 변경 및 Transition 진행 중 여부 확인용)
 * @returns 컨테이너가 없으면 false (조기 반환 필요)
 */
export function step3SetupContainers(
  context: PipelineContext,
  sceneIndex: number,
  sprite: PIXI.Sprite | undefined,
  sceneText: PIXI.Text | undefined,
  step8Result: Step8Result
): boolean {
  const {
    timeline,
    tSec,
    options,
    containerRef,
    spritesRef,
    textsRef,
    sceneContainersRef,
    subtitleContainerRef,
    transitionQuadContainerRef,
    lastRenderedSceneIndexRef,
    resetBaseStateCallback: _resetBaseStateCallback,
    fabricCanvasRef: _fabricCanvasRef,
    fabricScaleRatioRef: _fabricScaleRatioRef,
    stageDimensions: _stageDimensions,
  } = context

  const { sceneChanged, previousRenderedSceneIndex, isTransitionInProgress, isTransitionInProgressForRender } = step8Result

  // 현재 씬 container 존재 보장
  // 전환(Transition) 중에는 이전 씬 container도 유지
  // 전환이 아닐 때만 이전 씬 리소스 정리
  if (!containerRef.current) {
    return false
  }

  // 디버깅: 컨테이너 상태 확인 (샘플링 - 씬 변경 시에만 출력)
  if (containerRef.current && (sceneChanged || Math.floor(tSec * 10) % 20 === 0)) {
    // 중복 스프라이트 확인
    const spriteMap = new Map<number, number>()
    containerRef.current.children.forEach((child) => {
      if (child instanceof PIXI.Sprite) {
        spritesRef.current.forEach((spriteRef, idx) => {
          if (spriteRef === child) {
            spriteMap.set(idx, (spriteMap.get(idx) || 0) + 1)
          }
        })
      }
    })
    const duplicateScenes = Array.from(spriteMap.entries()).filter(([, count]) => count > 1)

    // Container state 로그 제거 (불필요한 로그 정리)
    if (sceneChanged || duplicateScenes.length > 0) {
      // 로그 제거됨
    }
  }

  // 전환 효과가 진행 중이면 컨테이너를 비우지 않음
  // Transition이 진행 중이 아니고 씬이 변경되었을 때만 이전 씬 스프라이트 제거
  // 단, Transition 완료 후 제거는 Transition 업데이트 부분에서 처리하므로 여기서는 제거하지 않음
  if (!isTransitionInProgress && !isTransitionInProgressForRender && previousRenderedSceneIndex !== null && previousRenderedSceneIndex !== sceneIndex && containerRef.current) {
    // Transition이 없는 경우에만 즉시 제거 (Transition이 있으면 Transition 완료 후 제거)
    const currentScene = timeline.scenes[sceneIndex]
    const nextScene = timeline.scenes[sceneIndex + 1]
    const isSameSceneId = nextScene && currentScene?.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (currentScene?.transitionDuration || 0.5)

    // Transition이 없을 때만 즉시 제거
    if (transitionDuration === 0) {
      // 이전 씬의 스프라이트와 텍스트만 제거 (현재 씬의 것은 유지)
      const previousSprite = spritesRef.current.get(previousRenderedSceneIndex)
      const previousText = textsRef.current.get(previousRenderedSceneIndex)

      if (previousSprite && !previousSprite.destroyed && previousSprite.parent === containerRef.current) {
        // Transition이 없을 때만 즉시 제거 (로그 없음 - 정상 동작)
        containerRef.current.removeChild(previousSprite)
        previousSprite.visible = false
        previousSprite.alpha = 0
      }
      if (previousText && !previousText.destroyed && previousText.parent === containerRef.current) {
        containerRef.current.removeChild(previousText)
      }
    }

    // 텍스트 객체 관리는 step7에서 처리하므로 여기서는 건드리지 않음
    // step7에서 매 프레임마다 자막을 렌더링하므로, step3에서 텍스트를 숨기면 자막이 사라지는 문제 발생
    // 자막의 visible/alpha는 step7의 renderSubtitlePart에서 관리됨
  } else if (!isTransitionInProgress && !sceneChanged && containerRef.current) {
    // 전환 효과가 없고 씬이 변경되지 않았으면 전체 비우기
    // 단, sceneChanged가 true이면 Transition 처리가 진행될 예정이므로 removeChildren()을 호출하지 않음
    // 중요: 현재 씬의 sprite는 제거하지 않도록 보호
    const childrenToRemove: Array<PIXI.Container | PIXI.Sprite | PIXI.Text> = []

    containerRef.current.children.forEach((child) => {
      // 현재 씬의 sprite와 자막 Container, Transition Quad Container는 제거하지 않음
      if (child === sprite) {
        return // 현재 씬 sprite는 유지
      }
      if (child === subtitleContainerRef.current) {
        return // 자막 Container는 유지
      }
      if (child === transitionQuadContainerRef.current) {
        return // Transition Quad Container는 유지
      }
      // 씬별 Container도 유지
      let isSceneContainer = false
      sceneContainersRef.current.forEach((sceneContainer) => {
        if (child === sceneContainer) {
          isSceneContainer = true
        }
      })
      if (isSceneContainer) {
        return
      }
      childrenToRemove.push(child)
    })

    childrenToRemove.forEach((child) => {
      containerRef.current?.removeChild(child)
    })

    // 텍스트 객체 관리는 step7에서 처리하므로 여기서는 건드리지 않음
    // step7에서 매 프레임마다 자막을 렌더링하므로, step3에서 텍스트를 숨기면 자막이 사라지는 문제 발생
    // 자막의 visible/alpha는 step7의 renderSubtitlePart에서 관리됨
  }

  // 현재 씬의 이미지 렌더링 (컨테이너에 추가)
  // 숨기는 로직: 씬이 변경되면 이전 씬 스프라이트를 즉시 숨김
  if (sprite && !sprite.destroyed && containerRef.current) {
    const container = containerRef.current
    
    // 씬이 변경되면 이전 씬의 스프라이트를 숨김 (한 번만 실행)
    // Transition 진행 중일 때는 step6에서 처리하므로 여기서는 건드리지 않음
    // 중요: sceneChanged가 true이고 Transition이 진행 중가 아닐 때만 실행
    // step6에서 Transition 진행 중일 때 이전 스프라이트를 보이게 하므로 충돌 방지
    if (sceneChanged && previousRenderedSceneIndex !== null && previousRenderedSceneIndex !== sceneIndex) {
      // Transition이 진행 중이 아닐 때만 즉시 숨김
      // step6에서 Transition 진행 중일 때 이전 스프라이트를 보이게 하므로 여기서는 건드리지 않음
      if (!isTransitionInProgress && !isTransitionInProgressForRender) {
        // 이전 씬의 스프라이트만 숨김 (같은 그룹이 아닌 경우에만)
        const previousSprite = spritesRef.current.get(previousRenderedSceneIndex)
        if (previousSprite && !previousSprite.destroyed) {
          const previousScene = timeline.scenes[previousRenderedSceneIndex]
          const currentScene = timeline.scenes[sceneIndex]
          const isPrevInSameGroup = 
            previousScene && currentScene && 
            previousScene.sceneId !== undefined && 
            previousScene.sceneId === currentScene.sceneId
          
          // 같은 그룹이 아닌 경우에만 숨기기
          if (!isPrevInSameGroup) {
            previousSprite.visible = false
            previousSprite.alpha = 0
          }
        }
        
        // 다른 모든 씬의 스프라이트도 숨김 (현재 씬과 같은 그룹 제외)
        const currentScene = timeline.scenes[sceneIndex]
        const currentSceneId = currentScene?.sceneId
        spritesRef.current.forEach((spriteRef, spriteSceneIndex) => {
          if (spriteSceneIndex !== sceneIndex && spriteSceneIndex !== previousRenderedSceneIndex && spriteRef && !spriteRef.destroyed) {
            const otherScene = timeline.scenes[spriteSceneIndex]
            const isOtherInSameGroup = 
              otherScene && currentScene && 
              currentSceneId !== undefined && 
              otherScene.sceneId === currentSceneId
            
            // 같은 그룹이 아닌 경우에만 숨기기
            if (!isOtherInSameGroup) {
              spriteRef.visible = false
              spriteRef.alpha = 0
            }
          }
        })
      }
    }
    
    // Transition 진행 중가 아닐 때 현재 씬이 아닌 다른 스프라이트 숨김 (매 프레임 체크)
    // 하지만 Transition 진행 중일 때는 step6에서 이전 스프라이트를 보이게 하므로 건드리지 않음
    if (!isTransitionInProgress && !isTransitionInProgressForRender && !sceneChanged) {
      // 씬이 변경되지 않았고 Transition도 진행 중가 아니면 다른 스프라이트 숨김
      spritesRef.current.forEach((spriteRef, spriteSceneIndex) => {
        if (spriteSceneIndex !== sceneIndex && spriteRef && !spriteRef.destroyed) {
          spriteRef.visible = false
          spriteRef.alpha = 0
        }
      })
    }

    // 현재 씬 스프라이트가 컨테이너에 없으면 추가
    if (sprite.parent !== container) {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite)
      }
      container.addChild(sprite)
      container.setChildIndex(sprite, 0)
    }

    // 중복 스프라이트 체크: 같은 스프라이트가 여러 번 있는지 확인
    const spriteIndices: number[] = []
    container.children.forEach((child, idx) => {
      if (child === sprite) {
        spriteIndices.push(idx)
      }
    })
    if (spriteIndices.length > 1) {
      // 첫 번째를 제외한 나머지 제거
      for (let i = spriteIndices.length - 1; i > 0; i--) {
        const idx = spriteIndices[i]
        if (container.children[idx] === sprite) {
          container.removeChildAt(idx)
        }
      }
    }

    // Checking transition conditions 로그 제거 (불필요한 로그 정리)
    if (sceneChanged && process.env.NODE_ENV === 'development') {
      // 로그 제거됨
    }

    // ANIMATION.md 표준: progress 기반 Transition 직접 계산 (GSAP 제거)
    // 씬이 변경될 때만 실행 (렌더링 충돌 방지)
    if (sceneChanged && !options?.skipAnimation) {
      const previousSceneIndex = lastRenderedSceneIndexRef.current

      // 이미 같은 씬이면 전환 효과를 적용하지 않음
      if (previousSceneIndex === sceneIndex) {
        // 같은 씬이면 즉시 표시
        sprite.visible = true
        sprite.alpha = 1
      } else {
        lastRenderedSceneIndexRef.current = sceneIndex

        // 전환 효과 적용 전에 스프라이트가 컨테이너에 있는지 확인
        if (sprite.parent !== container) {
          if (sprite.parent) {
            sprite.parent.removeChild(sprite)
          }
          container.addChild(sprite)
          container.setChildIndex(sprite, 0)
        }

        const currentScene = timeline.scenes[sceneIndex]
        const previousSprite = previousRenderedSceneIndex !== null && previousRenderedSceneIndex >= 0
          ? spritesRef.current.get(previousRenderedSceneIndex)
          : null

        // 첫 번째 씬이거나 이전 씬이 없으면 Transition 없이 즉시 표시
        const hasPreviousScene = previousRenderedSceneIndex !== null && previousRenderedSceneIndex >= 0 && previousSprite

        if (!hasPreviousScene) {
          // 첫 번째 씬이거나 이전 씬이 없으면 즉시 표시
          sprite.visible = true
          sprite.alpha = 1
        } else {
          // 전환 효과 정보 가져오기
          const nextScene = timeline.scenes[sceneIndex + 1]
          const isSameSceneId = nextScene && currentScene.sceneId === nextScene.sceneId
          const transitionDuration = isSameSceneId ? 0 : (currentScene?.transitionDuration || 0.5)

          if (transitionDuration > 0) {
            // Transition이 설정되어 있으면 step6에서 처리
            // 여기서는 이전 스프라이트를 숨김 (step6에서 Transition 진행 중일 때만 보이게 함)
            // Transition 진행 중가 아닐 때만 숨김 (렌더링 충돌 방지)
            // UX 개선: 현재 스프라이트를 미리 표시하여 깜빡임 방지
            if (!isTransitionInProgress && !isTransitionInProgressForRender) {
              // 현재 스프라이트를 미리 표시 (전환 시작 전 준비)
              if (sprite && !sprite.visible) {
                sprite.visible = true
                sprite.alpha = 0 // 전환 시작 전에는 투명하게
              }
              if (previousSprite && !previousSprite.destroyed) {
                previousSprite.visible = false
                previousSprite.alpha = 0
              }
            }
          } else {
            // 전환 효과가 없으면 즉시 표시하고 이전 스프라이트는 숨김
            // UX 개선: 부드러운 전환을 위해 순차적으로 처리
            if (sprite) {
              sprite.visible = true
              sprite.alpha = 1
            }
            if (previousSprite && !previousSprite.destroyed) {
              // 이전 스프라이트는 약간의 지연 후 숨김 (깜빡임 방지)
              previousSprite.visible = false
              previousSprite.alpha = 0
            }
          }
        }
      }
    } else if (!sceneChanged) {
      // 씬이 변경되지 않았거나 skipAnimation이면 즉시 표시
      // 하지만 Transition 진행 중일 때는 step6에서 처리하므로 건드리지 않음
      if (!isTransitionInProgress && !isTransitionInProgressForRender) {
        sprite.visible = true
        sprite.alpha = 1
      }
    }

    // 스프라이트 렌더링 완료 (로그 제거)
  }

  return true
}
