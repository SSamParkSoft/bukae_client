/**
 * 씬 전환 훅
 * 씬 간 전환 효과를 관리하는 함수를 제공합니다.
 */

import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import { MOVEMENT_EFFECTS } from '../../types/effects'
import type { StageDimensions } from '../../types/common'
import type { ApplyEnterEffectFunction } from '../../types/scene'

interface UseSceneTransitionParams {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  isManualSceneSelectRef: React.MutableRefObject<boolean>
  timeline: TimelineData | null
  stageDimensions: StageDimensions
  applyEnterEffect: ApplyEnterEffectFunction
  renderSubtitlePartRef: React.MutableRefObject<
    ((
      sceneIndex: number,
      partIndex: number | null,
      options?: { skipAnimation?: boolean; onComplete?: () => void; prepareOnly?: boolean }
    ) => void) | null
  >
}

/**
 * 씬 전환 훅
 * updateCurrentScene 함수를 제공합니다.
 */
export function useSceneTransition({
  appRef,
  containerRef,
  spritesRef,
  textsRef,
  currentSceneIndexRef,
  previousSceneIndexRef,
  isManualSceneSelectRef,
  timeline,
  stageDimensions,
  applyEnterEffect,
  renderSubtitlePartRef,
}: UseSceneTransitionParams) {
  // 그룹별 전환 효과 애니메이션 Timeline 추적 (sceneId를 키로 사용)
  const groupTransitionTimelinesRef = useRef<Map<number, gsap.core.Timeline>>(new Map())

  // 애니메이션 스킵 처리 헬퍼 함수
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSkipAnimation = useCallback(
    ({
      actualSceneIndex,
      previousIndex,
      currentSprite,
      previousSprite,
      previousText,
      isPlaying,
      partIndex,
      onAnimationComplete,
    }: {
      actualSceneIndex: number
      previousIndex: number | null
      currentScene: TimelineData['scenes'][number]
      currentSprite: PIXI.Sprite | null
      currentText: PIXI.Text | null
      previousSprite: PIXI.Sprite | null
      previousText: PIXI.Text | null
      isPlaying?: boolean
      partIndex?: number | null
      onAnimationComplete?: (sceneIndex: number) => void
    }) => {
      // 이미 같은 씬이 표시되어 있으면 텍스트만 업데이트
      const isAlreadyDisplayed =
        previousSceneIndexRef.current === actualSceneIndex &&
        currentSprite?.visible &&
        currentSprite?.alpha === 1

      if (isAlreadyDisplayed) {
        onAnimationComplete?.(actualSceneIndex)
        return
      }

      // 이전 씬 숨기기
      const shouldHidePrevious = previousIndex !== null && previousIndex !== actualSceneIndex
      if (shouldHidePrevious) {
        if (previousSprite) {
          previousSprite.visible = false
          previousSprite.alpha = 0
        }
        if (previousText) {
          previousText.visible = false
          previousText.alpha = 0
        }
      }

      // 다른 씬들 숨기기 - 씬이 넘어갔을 때만 이전 씬 숨김
      // 기본적으로는 모든 씬을 보이게 하고, 씬이 넘어갔을 때만 이전 씬을 숨김
      // (이 부분은 제거 - 씬이 넘어갔을 때만 이전 씬을 숨기도록 변경)

      // 현재 씬 표시
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }

      previousSceneIndexRef.current = actualSceneIndex

      // 재생 중이 아닐 때만 자막 렌더링
      if (!isPlaying && renderSubtitlePartRef.current) {
        if (partIndex !== undefined && partIndex !== null) {
          renderSubtitlePartRef.current(actualSceneIndex, partIndex, {
            skipAnimation: true,
            onComplete: () => {
              onAnimationComplete?.(actualSceneIndex)
            },
          })
        } else {
          renderSubtitlePartRef.current(actualSceneIndex, null, {
            skipAnimation: true,
            onComplete: () => {
              onAnimationComplete?.(actualSceneIndex)
            },
          })
        }
      } else {
        onAnimationComplete?.(actualSceneIndex)
      }
    },
    [previousSceneIndexRef, renderSubtitlePartRef]
  )

  // 현재 씬 업데이트
  const updateCurrentScene = useCallback(
    (
      explicitPreviousIndex?: number | null,
      forceTransition?: string,
      onAnimationComplete?: (sceneIndex: number) => void,
      isPlaying?: boolean,
      partIndex?: number | null,
      sceneIndex?: number,
      overrideTransitionDuration?: number
    ) => {
      // 기본 값 설정
      const actualSceneIndex =
        sceneIndex !== undefined ? sceneIndex : currentSceneIndexRef.current

      // previousIndex 계산
      let previousIndex: number | null
      const hasExplicitPreviousIndex = explicitPreviousIndex !== undefined
      if (hasExplicitPreviousIndex) {
        previousIndex = explicitPreviousIndex
      } else {
        const prevRefValue = previousSceneIndexRef.current
        previousIndex =
          prevRefValue !== null && prevRefValue === actualSceneIndex ? null : prevRefValue
      }

      // 필수 참조 확인
      const hasRequiredRefs = containerRef.current && timeline && appRef.current
      if (!hasRequiredRefs) {
        return
      }

      // 씬 데이터 가져오기
      const currentScene = timeline.scenes[actualSceneIndex]
      const previousScene = previousIndex !== null ? timeline.scenes[previousIndex] : null

      // 전환 효과 결정
      const transition = forceTransition || currentScene?.transition || 'fade'

      // 같은 씬 내 구간 전환 중인지 확인
      const isSameScene =
        previousIndex === actualSceneIndex ||
        (previousIndex === null && currentSceneIndexRef.current === actualSceneIndex)
      const isSameScenePartTransition =
        isManualSceneSelectRef.current &&
        isSameScene &&
        partIndex !== null &&
        partIndex !== undefined &&
        partIndex >= 0

      if (isSameScenePartTransition) {
        const currentSprite = spritesRef.current.get(actualSceneIndex)
        if (currentSprite) {
          currentSprite.visible = true
          currentSprite.alpha = 1
        }
        return
      }

      // isManualSceneSelectRef가 true이고 partIndex가 null이면 전체 자막 렌더링
      const isSameSceneForNull =
        previousIndex === actualSceneIndex ||
        (previousIndex === null && currentSceneIndexRef.current === actualSceneIndex)
      if (isManualSceneSelectRef.current && isSameSceneForNull && partIndex === null) {
        const currentSprite = spritesRef.current.get(actualSceneIndex)
        if (currentSprite) {
          currentSprite.visible = true
          currentSprite.alpha = 1
        }
        if (onAnimationComplete) {
          onAnimationComplete(actualSceneIndex)
        }
        return
      }

      // 스프라이트 및 텍스트 객체 가져오기
      const currentSprite = spritesRef.current.get(actualSceneIndex)
      const currentText = textsRef.current.get(actualSceneIndex)
      const previousSprite =
        previousIndex !== null ? spritesRef.current.get(previousIndex) : null
      const previousText = previousIndex !== null ? textsRef.current.get(previousIndex) : null

      // 스프라이트 없음 처리
      if (!currentSprite) {
        onAnimationComplete?.(actualSceneIndex)
        previousSceneIndexRef.current = actualSceneIndex
        return
      }

      // 같은 씬 내 구간 전환 처리
      // 확대/축소 효과는 같은 씬 내 구간 전환에서도 전환 효과를 적용해야 함
      const isSameSceneTransition =
        previousIndex === actualSceneIndex &&
        currentScene &&
        previousScene &&
        currentScene.sceneId === previousScene.sceneId &&
        partIndex !== null &&
        partIndex !== undefined &&
        !isManualSceneSelectRef.current
      
      // 확대/축소 효과는 같은 씬 내 구간 전환에서도 전환 효과를 적용
      const isZoomEffect = forceTransition === 'zoom-in' || forceTransition === 'zoom-out' || 
                          currentScene.transition === 'zoom-in' || currentScene.transition === 'zoom-out'

      if (isSameSceneTransition && !isZoomEffect) {
        currentSprite.visible = true
        currentSprite.alpha = 1
        return
      }

      // 전환 효과가 'none'이면 애니메이션 없이 즉시 표시
      const shouldSkipAnimation = forceTransition === 'none' || transition === 'none'
      if (shouldSkipAnimation) {
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite) {
            if (idx === actualSceneIndex) {
              sprite.visible = true
              sprite.alpha = 1
            } else {
              sprite.visible = false
              sprite.alpha = 0
            }
          }
        })

        // 현재 씬의 텍스트 표시 (편집 모드) - renderSubtitlePart 사용
        if (renderSubtitlePartRef.current) {
          renderSubtitlePartRef.current(actualSceneIndex, partIndex ?? null, {
            skipAnimation: true,
          })
        }

        // 씬이 넘어갔을 때만 이전 씬의 텍스트 숨김
        if (previousSceneIndexRef.current !== null && previousSceneIndexRef.current !== actualSceneIndex) {
          const previousText = textsRef.current.get(previousSceneIndexRef.current)
          if (previousText) {
            previousText.visible = false
            previousText.alpha = 0
          }
        }

        previousSceneIndexRef.current = actualSceneIndex
        if (onAnimationComplete) {
          onAnimationComplete(actualSceneIndex)
        }
        return
      }

      // 그룹 정보 계산
      const hasSceneId = currentScene.sceneId !== undefined
      const hasSplitIndex = currentScene.splitIndex !== undefined
      const previousHasSplitIndex = previousScene?.splitIndex !== undefined

      const isInSameGroup =
        previousScene &&
        currentScene &&
        hasSceneId &&
        previousScene.sceneId === currentScene.sceneId &&
        !hasSplitIndex &&
        !previousHasSplitIndex

      const firstSceneIndex =
        isInSameGroup && hasSceneId
          ? timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
          : -1
      const isFirstSceneInGroup = firstSceneIndex === actualSceneIndex

      // 그룹 전환 시 이전 그룹 Timeline 정리
      const isGroupTransition = previousScene && previousScene.sceneId !== currentScene.sceneId
      if (isGroupTransition) {
        const previousGroupTimeline = groupTransitionTimelinesRef.current.get(previousScene.sceneId)
        previousGroupTimeline?.kill()
        groupTransitionTimelinesRef.current.delete(previousScene.sceneId)
      }

      // 같은 그룹 내 씬 전환 (첫 번째 씬이 아닌 경우)
      if (isInSameGroup && !isFirstSceneInGroup) {
        if (!isManualSceneSelectRef.current && renderSubtitlePartRef.current) {
          // renderSubtitlePart를 사용하여 텍스트 렌더링 (중복 제거)
          renderSubtitlePartRef.current(actualSceneIndex, partIndex ?? null, {
            skipAnimation: true,
          })
        }

        previousSceneIndexRef.current = actualSceneIndex
        return
      }

      // 전환 효과 시작 전에 이전 씬 숨기기
      const shouldHidePreviousBeforeTransition =
        previousIndex !== null && previousIndex !== actualSceneIndex && !isFirstSceneInGroup
      if (shouldHidePreviousBeforeTransition && previousIndex !== null) {
        const prevSprite = spritesRef.current.get(previousIndex)
        const prevText = textsRef.current.get(previousIndex)
        const prevScene = previousIndex !== null ? timeline.scenes[previousIndex] : null
        const isPrevInSameGroup =
          prevScene && currentScene && hasSceneId && prevScene.sceneId === currentScene.sceneId

        if (!isPrevInSameGroup) {
          if (prevSprite) {
            prevSprite.visible = false
            prevSprite.alpha = 0
          }
          if (prevText) {
            prevText.visible = false
            prevText.alpha = 0
          }
        }

        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== actualSceneIndex && idx !== previousIndex) {
            const otherScene = timeline.scenes[idx]
            const isOtherInSameGroup =
              otherScene && currentScene && hasSceneId && otherScene.sceneId === currentScene.sceneId
            if (!isOtherInSameGroup) {
              sprite.visible = false
              sprite.alpha = 0
            }
          }
        })

        // 씬이 넘어갔을 때만 이전 씬의 텍스트 숨김 (다른 씬들은 그대로 유지)
        // 기본적으로는 모든 텍스트를 보이게 하고, 씬이 넘어갔을 때만 이전 씬의 텍스트를 숨김
        // (이 부분은 제거 - 씬이 넘어갔을 때만 이전 씬을 숨기도록 변경)
      }

      // 전환 효과 적용을 위한 wrappedOnComplete 미리 정의
      const wrappedOnComplete = onAnimationComplete
        ? () => {
            // 현재 씬의 스프라이트 처리: 이미 보이는 상태라면 그대로 유지 (깜빡임 방지)
            // 씬이 넘어가지 않는다면 이미지가 그대로 남아있어야 함
            const currentSprite = spritesRef.current.get(actualSceneIndex)
            if (currentSprite && containerRef.current) {
              // 컨테이너에 없으면 추가 (필요한 경우에만)
              if (currentSprite.parent !== containerRef.current) {
                if (currentSprite.parent) {
                  currentSprite.parent.removeChild(currentSprite)
                }
                containerRef.current.addChild(currentSprite)
              }
              
              // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
              if (currentSprite.parent === containerRef.current) {
                containerRef.current.setChildIndex(currentSprite, 0)
              }
              
              // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
              // 보이지 않는 경우에만 보이게 설정
              if (!currentSprite.visible || currentSprite.alpha < 1) {
                currentSprite.visible = true
                currentSprite.alpha = 1
              }
            }

            // 텍스트는 usePixiEffects의 onComplete에서 이미 처리되므로 여기서는 처리하지 않음 (깜빡임 방지)

            // 이전 씬 숨기기 (전환 효과 완료 후) - 현재 씬과 다른 씬만 숨김
            // 이미지와 텍스트 모두 같은 그룹이 아닌 경우에만 숨김
            if (previousIndex !== null && previousIndex !== actualSceneIndex) {
              const prevSprite = spritesRef.current.get(previousIndex)
              const prevText = textsRef.current.get(previousIndex)
              const prevScene = timeline.scenes[previousIndex]
              const isPrevInSameGroup =
                prevScene && currentScene && hasSceneId && prevScene.sceneId === currentScene.sceneId
              
              // 같은 그룹이 아닌 경우에만 숨김
              if (!isPrevInSameGroup) {
                if (prevSprite) {
                  prevSprite.visible = false
                  prevSprite.alpha = 0
                }
                if (prevText) {
                  prevText.visible = false
                  prevText.alpha = 0
                }
              }
            }

            // 다른 모든 씬 숨기기 (현재 씬과 같은 그룹 제외)
            // 이미지와 텍스트 모두 같은 그룹이 아닌 경우에만 숨김
            spritesRef.current.forEach((sprite, idx) => {
              if (sprite && idx !== actualSceneIndex && idx !== previousIndex) {
                const otherScene = timeline.scenes[idx]
                const isOtherInSameGroup =
                  otherScene && currentScene && hasSceneId && otherScene.sceneId === currentScene.sceneId
                if (!isOtherInSameGroup) {
                  sprite.visible = false
                  sprite.alpha = 0
                }
              }
            })

            if (!isManualSceneSelectRef.current) {
              textsRef.current.forEach((text, idx) => {
                if (text && idx !== actualSceneIndex && idx !== previousIndex) {
                  const otherScene = timeline.scenes[idx]
                  const isOtherInSameGroup =
                    otherScene && currentScene && hasSceneId && otherScene.sceneId === currentScene.sceneId
                  // 같은 그룹이 아닌 경우에만 텍스트 숨김
                  if (!isOtherInSameGroup) {
                    text.visible = false
                    text.alpha = 0
                  }
                }
              })
            }

            onAnimationComplete(actualSceneIndex)
          }
        : () => {
            // 현재 씬의 스프라이트가 확실히 보이도록 보장
            const currentSprite = spritesRef.current.get(actualSceneIndex)
            if (currentSprite && containerRef.current) {
              if (currentSprite.parent !== containerRef.current) {
                if (currentSprite.parent) {
                  currentSprite.parent.removeChild(currentSprite)
                }
                containerRef.current.addChild(currentSprite)
              }
              currentSprite.visible = true
              currentSprite.alpha = 1
            }

            spritesRef.current.forEach((sprite, idx) => {
              if (sprite && idx !== actualSceneIndex) {
                sprite.visible = false
                sprite.alpha = 0
              }
            })

            if (!isManualSceneSelectRef.current) {
              textsRef.current.forEach((text, idx) => {
                if (text && idx !== actualSceneIndex) {
                  text.visible = false
                  text.alpha = 0
                }
              })
            }
          }

      // 현재 씬 등장 효과 적용
      if (currentSprite) {
        const firstSceneIndex =
          currentScene.sceneId !== undefined
            ? timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
            : -1
        const isFirstSceneInGroup = firstSceneIndex === actualSceneIndex

        let isInSameGroup = false
        const currentHasSplitIndex = currentScene.splitIndex !== undefined
        if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined && !currentHasSplitIndex) {
          if (previousIndex !== null && previousScene !== null) {
            const previousHasSplitIndex = previousScene.splitIndex !== undefined
            isInSameGroup =
              (previousScene.sceneId === currentScene.sceneId ||
                previousIndex === actualSceneIndex) &&
              !previousHasSplitIndex
          } else {
            const lastRenderedIndex = previousSceneIndexRef.current
            if (lastRenderedIndex !== null) {
              const lastRenderedScene = timeline.scenes[lastRenderedIndex]
              const lastRenderedHasSplitIndex = lastRenderedScene?.splitIndex !== undefined
              if (
                lastRenderedScene &&
                lastRenderedScene.sceneId === currentScene.sceneId &&
                !lastRenderedHasSplitIndex
              ) {
                isInSameGroup = true
              }
            }
          }
        }

        let spriteToUse = currentSprite
        if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
          const firstSprite = spritesRef.current.get(firstSceneIndex)
          if (firstSprite) {
            spriteToUse = firstSprite
          }
        }

        // 씬별로 개별 전환 효과를 적용하도록 수정
        // 같은 그룹 내 씬들도 각각의 transition 속성을 사용
        // forceTransition이 있으면 우선 사용, 없으면 현재 씬의 transition 사용
        const transition: string = forceTransition || currentScene.transition || 'fade'
        const transitionDuration: number =
          overrideTransitionDuration !== undefined
            ? overrideTransitionDuration
            : currentScene.transitionDuration && currentScene.transitionDuration > 0
              ? currentScene.transitionDuration
              : currentScene.duration && currentScene.duration > 0
                ? currentScene.duration
                : 0.5

        const { width, height } = stageDimensions

        // transition이 'none'이면 애니메이션 없이 즉시 표시
        // forceTransition이 'none'이거나, currentScene.transition이 'none'이거나, transition이 'none'인 경우 모두 체크
        // 이 변수는 아래에서도 사용되므로 상위 스코프에 선언
        const isTransitionNone = forceTransition === 'none' || currentScene.transition === 'none' || transition === 'none'
        if (isTransitionNone) {
          if (previousSprite && previousIndex !== null && previousIndex !== actualSceneIndex) {
            previousSprite.visible = false
            previousSprite.alpha = 0
          }
          if (previousText && previousIndex !== null && previousIndex !== actualSceneIndex) {
            previousText.visible = false
            previousText.alpha = 0
          }

          // spriteToUse를 사용 (같은 그룹 내 씬인 경우 firstSprite를 사용)
          if (spriteToUse.parent !== containerRef.current && containerRef.current) {
            if (spriteToUse.parent) {
              spriteToUse.parent.removeChild(spriteToUse)
            }
            containerRef.current.addChild(spriteToUse)
          }

          spriteToUse.visible = true
          spriteToUse.alpha = 1

          // 텍스트는 renderSubtitlePart에서 처리하므로 여기서는 컨테이너에 추가만 수행
          if (currentText && containerRef.current) {
            if (currentText.parent !== containerRef.current) {
              if (currentText.parent) {
                currentText.parent.removeChild(currentText)
              }
              containerRef.current.addChild(currentText)
            }
            // 텍스트 visible/alpha는 renderSubtitlePart에서 처리
            // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
            if (containerRef.current) {
              const currentIndex = containerRef.current.getChildIndex(currentText)
              const maxIndex = containerRef.current.children.length - 1
              if (currentIndex !== maxIndex) {
                containerRef.current.setChildIndex(currentText, maxIndex)
              }
            }
          }
          
          // renderSubtitlePart를 사용하여 텍스트 렌더링
          if (renderSubtitlePartRef.current) {
            renderSubtitlePartRef.current(actualSceneIndex, partIndex ?? null, {
              skipAnimation: true,
            })
          }

          previousSceneIndexRef.current = actualSceneIndex

          setTimeout(() => {
            wrappedOnComplete()
          }, 50)

          return
        }

        // 현재 씬을 컨테이너에 추가
        if (!containerRef.current) {
          return
        }

        // currentSprite가 spriteToUse와 다르면 (같은 그룹 내 첫 번째 씬 스프라이트 사용 시)
        // currentSprite를 컨테이너에서 제거하고 숨김
        if (currentSprite && currentSprite !== spriteToUse) {
          if (currentSprite.parent === containerRef.current) {
            containerRef.current.removeChild(currentSprite)
          }
          currentSprite.visible = false
          currentSprite.alpha = 0
        }

        // 다른 모든 스프라이트 숨기기 및 컨테이너에서 제거 (spriteToUse 추가 전에 먼저 정리)
        spritesRef.current.forEach((sprite) => {
          if (!sprite || sprite === spriteToUse) return
          if (containerRef.current && sprite.parent === containerRef.current) {
            containerRef.current.removeChild(sprite)
          }
          sprite.visible = false
          sprite.alpha = 0
        })

        // spriteToUse를 컨테이너에 추가 (한 번만, 다른 스프라이트 제거 후)
        if (spriteToUse.parent !== containerRef.current) {
          if (spriteToUse.parent) {
            spriteToUse.parent.removeChild(spriteToUse)
          }
          containerRef.current.addChild(spriteToUse)
        }

        // 텍스트 처리 - renderSubtitlePart에서 처리하므로 여기서는 컨테이너에 추가만 수행
        // renderSubtitlePart가 텍스트 표시를 담당하므로 중복 렌더링 방지
        if (currentText && containerRef.current) {
          if (currentText.parent !== containerRef.current) {
            if (currentText.parent) {
              currentText.parent.removeChild(currentText)
            }
            containerRef.current.addChild(currentText)
          }
          // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
          // 이미 맨 위가 아니면만 setChildIndex 호출 (깜빡임 방지)
          const currentIndex = containerRef.current.getChildIndex(currentText)
          const maxIndex = containerRef.current.children.length - 1
          if (currentIndex !== maxIndex) {
            containerRef.current.setChildIndex(currentText, maxIndex)
          }
        }
        // 텍스트 visible/alpha 설정은 renderSubtitlePart에서 처리

        // spriteToUse의 visibility 설정
        // 재생 중이고 전환 효과가 있는 경우, applyEnterEffect에서 alpha를 설정하므로
        // 여기서는 visible만 true로 설정하고 alpha는 applyEnterEffect에서 처리
        // 단, 전환 효과가 'none'이면 즉시 표시
        // isTransitionNone은 위에서 이미 선언됨
        if (!isPlaying) {
          spriteToUse.visible = true
          spriteToUse.alpha = 1
        } else if (isInSameGroup || isTransitionNone) {
          // 같은 그룹 내 씬 전환이거나 전환 효과가 'none'인 경우: 이미지 표시
          spriteToUse.visible = true
          spriteToUse.alpha = 1
        } else {
          // 재생 중이고 전환 효과가 있는 경우: 
          // visible은 true로 설정하되, alpha는 0으로 시작하여 전환 효과에서 표시되도록 함
          spriteToUse.visible = true
          spriteToUse.alpha = 0  // 전환 효과 시작 전에는 숨김
          // alpha는 applyEnterEffect에서 전환 효과 시작 시 설정됨
        }

        // 텍스트는 renderSubtitlePart에서 처리하므로 여기서는 컨테이너에 추가만 수행
        if (currentText && !isManualSceneSelectRef.current && containerRef.current) {
          if (currentText.parent !== containerRef.current) {
            if (currentText.parent) {
              currentText.parent.removeChild(currentText)
            }
            containerRef.current.addChild(currentText)
          }
          // 텍스트 visible/alpha는 renderSubtitlePart에서 처리
          // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
          // 이미 맨 위가 아니면만 setChildIndex 호출 (깜빡임 방지)
          if (containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(currentText)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(currentText, maxIndex)
            }
          }
        }

        const isCurrentTransitionMovement = MOVEMENT_EFFECTS.includes(
          transition as (typeof MOVEMENT_EFFECTS)[number]
        )
        const isFirstInGroup =
          isCurrentTransitionMovement && currentScene.sceneId && isFirstSceneInGroup

        if (previousScene && previousScene.sceneId !== currentScene.sceneId) {
          const previousGroupTimeline = groupTransitionTimelinesRef.current.get(previousScene.sceneId)
          if (previousGroupTimeline) {
            previousGroupTimeline.kill()
            groupTransitionTimelinesRef.current.delete(previousScene.sceneId)
          }
        }

        // 같은 그룹 내 씬인 경우 - renderSubtitlePart를 사용하여 텍스트 렌더링 (중복 제거)
        if (isInSameGroup && !isFirstSceneInGroup) {
          if (!isManualSceneSelectRef.current && renderSubtitlePartRef.current) {
            // 이전 텍스트 숨기기
            if (previousText && previousIndex !== null && previousIndex !== actualSceneIndex) {
              previousText.visible = false
              previousText.alpha = 0
            }
            
            // renderSubtitlePart를 사용하여 텍스트 렌더링
            renderSubtitlePartRef.current(actualSceneIndex, partIndex ?? null, {
              skipAnimation: true,
            })
          }

          previousSceneIndexRef.current = actualSceneIndex
          if (wrappedOnComplete) {
            wrappedOnComplete()
          }
        } else {
          // 전환 효과 시작 전에 컨테이너의 모든 스프라이트 확인 및 정리
          const container = containerRef.current
          if (container) {
            const containerChildren = Array.from(container.children)
            const spritesInContainer = containerChildren.filter(
              (child) => child instanceof PIXI.Sprite && child !== spriteToUse
            ) as PIXI.Sprite[]
            
            // 컨테이너에 있는 다른 스프라이트 확인
            
            // spriteToUse가 아닌 모든 스프라이트를 컨테이너에서 제거
            spritesInContainer.forEach((sprite) => {
              container.removeChild(sprite)
              sprite.visible = false
              sprite.alpha = 0
            })
          }

          // 이전 씬 및 다른 모든 씬 숨기기
          if (previousIndex !== null && previousIndex !== actualSceneIndex) {
            const prevSprite = spritesRef.current.get(previousIndex)
            if (prevSprite && container) {
              if (prevSprite.parent === container) {
                container.removeChild(prevSprite)
              }
              prevSprite.visible = false
              prevSprite.alpha = 0
            }
          }

          // spritesRef의 모든 스프라이트 확인 및 정리
          spritesRef.current.forEach((sprite) => {
            if (!sprite || sprite === spriteToUse) return
            // 컨테이너에서 제거
            if (container && sprite.parent === container) {
              container.removeChild(sprite)
            }
            sprite.visible = false
            sprite.alpha = 0
          })

          applyEnterEffect(
            spriteToUse,
            currentText || null,
            transition,
            transitionDuration,
            width,
            height,
            actualSceneIndex,
            forceTransition,
            () => {
              // 전환 효과 완료 후 텍스트 렌더링 - renderSubtitlePart 사용
              if (currentText && containerRef.current) {
                if (currentText.parent !== containerRef.current) {
                  if (currentText.parent) {
                    currentText.parent.removeChild(currentText)
                  }
                  containerRef.current.addChild(currentText)
                }
                // 텍스트 visible/alpha는 renderSubtitlePart에서 처리
                const currentIndex = containerRef.current.getChildIndex(currentText)
                const maxIndex = containerRef.current.children.length - 1
                if (currentIndex !== maxIndex) {
                  containerRef.current.setChildIndex(currentText, maxIndex)
                }
                if (currentText.mask) {
                  currentText.mask = null
                }
              }
              
              // renderSubtitlePart를 사용하여 텍스트 렌더링
              if (renderSubtitlePartRef.current) {
                renderSubtitlePartRef.current(actualSceneIndex, partIndex ?? null, {
                  skipAnimation: true,
                })
              }
              
              previousSceneIndexRef.current = actualSceneIndex
              wrappedOnComplete()
            },
            previousIndex,
            isFirstInGroup ? groupTransitionTimelinesRef : undefined,
            currentScene.sceneId,
            isPlaying
          )
          
          // applyEnterEffect 호출 직후에도 텍스트를 맨 위로 올림 (전환 효과 시작 시에도 보이도록) - 이미 맨 위가 아니면만
          if (currentText && containerRef.current && currentText.parent === containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(currentText)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(currentText, maxIndex)
            }
          }
        }
      }

      if (!currentSprite) {
        spritesRef.current.forEach((sprite, index) => {
          if (sprite?.parent) {
            sprite.visible = index === actualSceneIndex
            sprite.alpha = index === actualSceneIndex ? 1 : 0
          }
        })

        // 텍스트 렌더링은 renderSubtitlePart에서 처리
        if (!isManualSceneSelectRef.current && renderSubtitlePartRef.current) {
          renderSubtitlePartRef.current(actualSceneIndex, partIndex ?? null, {
            skipAnimation: true,
          })
        }

        previousSceneIndexRef.current = actualSceneIndex
      }
    },
    [
      timeline,
      stageDimensions,
      applyEnterEffect,
      appRef,
      containerRef,
      spritesRef,
      textsRef,
      currentSceneIndexRef,
      previousSceneIndexRef,
      isManualSceneSelectRef,
      renderSubtitlePartRef,
    ]
  )

  return {
    updateCurrentScene,
    groupTransitionTimelinesRef,
  }
}

