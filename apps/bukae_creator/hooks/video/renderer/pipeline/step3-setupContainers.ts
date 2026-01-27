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

    // 모든 텍스트 객체를 숨기고 현재 씬의 텍스트만 표시 (자막 누적 방지)
    textsRef.current.forEach((textObj, textSceneIndex) => {
      if (textSceneIndex !== sceneIndex && !textObj.destroyed) {
        textObj.visible = false
      }
    })
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

    // 모든 텍스트 객체 숨기기 (자막 누적 방지)
    textsRef.current.forEach((textObj) => {
      if (!textObj.destroyed && textObj !== sceneText) {
        textObj.visible = false
      }
    })
  }

  // 현재 씬의 이미지 렌더링 (컨테이너에 추가)
  if (sprite && !sprite.destroyed && containerRef.current) {
    const container = containerRef.current
    const spriteAlreadyInContainer = sprite.parent === container

    // 스프라이트가 다른 부모에 있으면 제거
    if (sprite.parent && sprite.parent !== container) {
      console.log('[useTransportRenderer] Removing sprite from different parent:', {
        tSec: tSec.toFixed(3),
        sceneIndex,
        oldParent: sprite.parent.constructor.name,
      })
      sprite.parent.removeChild(sprite)
    }

    // 이미 컨테이너에 있으면 추가하지 않음 (중복 방지)
    // children.includes는 비용이 있으므로 parent 체크로 최적화
    if (!spriteAlreadyInContainer) {
      // 중복 체크: 같은 스프라이트가 이미 컨테이너에 있는지 확인 (더 엄격하게)
      const existingSpriteIndex = container.children.findIndex((child) => child === sprite)
      const isDuplicate = existingSpriteIndex >= 0

      if (!isDuplicate) {
        // 로그 제거됨
        container.addChild(sprite)
      } else {
        // 중복된 스프라이트가 있으면 제거 후 다시 추가
        container.removeChildAt(existingSpriteIndex)
        container.addChild(sprite)
      }
    }

    // 인덱스가 0이 아니면 변경 (불필요한 호출 방지)
    const currentIndex = container.getChildIndex(sprite)
    if (currentIndex !== 0 && currentIndex >= 0) {
      container.setChildIndex(sprite, 0)
    }

    // 중복 스프라이트 체크: 같은 스프라이트가 여러 번 있는지 확인 (같은 참조)
    // 먼저 같은 스프라이트가 여러 번 있는지 확인
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

    // 다른 씬의 스프라이트가 남아있는지 확인 (Transition 진행 중이 아닐 때만)
    if (!isTransitionInProgress && !isTransitionInProgressForRender) {
      const spriteSceneMap = new Map<PIXI.Sprite, number>()
      spritesRef.current.forEach((spriteRef, sceneIdx) => {
        spriteSceneMap.set(spriteRef, sceneIdx)
      })

      const duplicateSprites: Array<{ sprite: PIXI.Sprite; sceneIndex: number; index: number }> = []
      container.children.forEach((child, idx) => {
        if (child instanceof PIXI.Sprite && child !== sprite) {
          const childSceneIndex = spriteSceneMap.get(child)
          if (childSceneIndex !== undefined && childSceneIndex !== sceneIndex) {
            // 현재 씬의 스프라이트가 아니고, 다른 씬의 스프라이트인 경우
            duplicateSprites.push({ sprite: child, sceneIndex: childSceneIndex, index: idx })
          }
        }
      })

      if (duplicateSprites.length > 0) {
        duplicateSprites.forEach((dup) => {
          if (dup.sprite.parent === container) {
            container.removeChild(dup.sprite)
          }
        })
      }
    }

    // Checking transition conditions 로그 제거 (불필요한 로그 정리)
    if (sceneChanged && process.env.NODE_ENV === 'development') {
      // 로그 제거됨
    }

    // ANIMATION.md 표준: progress 기반 Transition 직접 계산 (GSAP 제거)
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
          if (process.env.NODE_ENV === 'development') {
            console.log('%c🎬 TRANSITION SKIPPED (First scene)', 'color: #9E9E9E; font-weight: bold; font-size: 11px;', {
              tSec: tSec.toFixed(3),
              sceneIndex,
              previousRenderedSceneIndex,
            })
          }
        } else {
          // 전환 효과 정보 가져오기
          const nextScene = timeline.scenes[sceneIndex + 1]
          const isSameSceneId = nextScene && currentScene.sceneId === nextScene.sceneId
          const transitionDuration = isSameSceneId ? 0 : (currentScene?.transitionDuration || 0.5)

          if (transitionDuration > 0) {
            // 이전 스프라이트도 컨테이너에 추가 (페이드 아웃 효과를 위해)
            if (previousSprite && !previousSprite.destroyed && previousSprite.parent !== container) {
              if (previousSprite.parent) {
                previousSprite.parent.removeChild(previousSprite)
              }
              container.addChild(previousSprite)
              container.setChildIndex(previousSprite, 0)
            }

            // Transition은 매 프레임 업데이트 부분에서만 적용
            // 씬 변경 시점에는 스프라이트만 컨테이너에 추가하고, Transition 적용은 매 프레임 업데이트에서 처리
            // 이렇게 하면 progress가 올바르게 계산되어 Transition이 제대로 진행됨
          } else {
            // 전환 효과가 없으면 즉시 표시
            sprite.visible = true
            sprite.alpha = 1
            if (previousSprite && !previousSprite.destroyed) {
              previousSprite.visible = false
              previousSprite.alpha = 0
            }
          }
        }
      }
    } else {
      // 씬이 변경되지 않았거나 skipAnimation이면 즉시 표시
      sprite.visible = true
      sprite.alpha = 1
    }

    // 스프라이트 렌더링 완료 (로그 제거)
  }

  return true
}
