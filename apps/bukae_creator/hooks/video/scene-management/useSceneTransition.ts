/**
 * 씬 전환 훅
 * 씬 간 전환 효과를 관리하는 함수를 제공합니다.
 */

import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import { MOVEMENT_EFFECTS } from '../types/effects'
import type { StageDimensions } from '../types/common'
import type { ApplyEnterEffectFunction } from '../types/scene'

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

      // 다른 씬들 숨기기
      const shouldHideOthers =
        previousIndex === null && previousSceneIndexRef.current !== actualSceneIndex
      if (shouldHideOthers) {
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== actualSceneIndex) {
            sprite.visible = false
            sprite.alpha = 0
          }
        })
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== actualSceneIndex) {
            text.visible = false
            text.alpha = 0
          }
        })
      }

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
    [previousSceneIndexRef, spritesRef, textsRef, renderSubtitlePartRef]
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
        console.warn(`[updateCurrentScene] 씬 ${actualSceneIndex} 스프라이트를 찾을 수 없음`)
        onAnimationComplete?.(actualSceneIndex)
        previousSceneIndexRef.current = actualSceneIndex
        return
      }

      // 같은 씬 내 구간 전환 처리
      const isSameSceneTransition =
        previousIndex === actualSceneIndex &&
        currentScene &&
        previousScene &&
        currentScene.sceneId === previousScene.sceneId &&
        partIndex !== null &&
        partIndex !== undefined &&
        !isManualSceneSelectRef.current

      if (isSameSceneTransition) {
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

        if (currentText) {
          currentText.visible = true
          currentText.alpha = 1
        }

        textsRef.current.forEach((text, idx) => {
          if (text && idx !== actualSceneIndex) {
            text.visible = false
            text.alpha = 0
          }
        })

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
        if (!isManualSceneSelectRef.current) {
          let textToUpdate = currentText

          if (!textToUpdate && currentScene.sceneId !== undefined) {
            const firstSceneIndexInGroup = timeline.scenes.findIndex(
              (s) => s.sceneId === currentScene.sceneId
            )
            if (firstSceneIndexInGroup >= 0) {
              textToUpdate = textsRef.current.get(firstSceneIndexInGroup) || undefined
            }
          }

          if (textToUpdate && currentScene.text?.content) {
            let displayText: string
            if (partIndex === null || partIndex === undefined) {
              displayText = currentScene.text.content
            } else {
              const scriptParts = currentScene.text.content
                .split(/\s*\|\|\|\s*/)
                .map((part) => part.trim())
                .filter((part) => part.length > 0)
              displayText = scriptParts.length > 1 ? scriptParts[0] : currentScene.text.content
            }
            if (textToUpdate.text !== displayText) {
              textToUpdate.text = displayText
            }
            textToUpdate.visible = displayText.length > 0
            textToUpdate.alpha = displayText.length > 0 ? 1 : 0
          }
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

        if (!isManualSceneSelectRef.current) {
          textsRef.current.forEach((text, idx) => {
            if (text && idx !== actualSceneIndex && idx !== previousIndex) {
              const otherScene = timeline.scenes[idx]
              const isOtherInSameGroup =
                otherScene && currentScene && hasSceneId && otherScene.sceneId === currentScene.sceneId
              if (!isOtherInSameGroup) {
                text.visible = false
                text.alpha = 0
              }
            }
          })
        }
      }

      // 전환 효과 적용을 위한 wrappedOnComplete 미리 정의
      const wrappedOnComplete = onAnimationComplete
        ? () => {
            // 재생 중일 때: 전환 효과 완료 후에도 이미지를 유지 (그룹 재생 완료 시 끊기지 않도록)
            // 이미지 숨김은 usePixiEffects의 onComplete에서 처리하므로 여기서는 숨기지 않음

            // 이전 씬 숨기기 (전환 효과 완료 후)
            if (previousIndex !== null && previousIndex !== actualSceneIndex) {
              const prevSprite = spritesRef.current.get(previousIndex)
              const prevText = textsRef.current.get(previousIndex)
              
              if (prevSprite) {
                prevSprite.visible = false
                prevSprite.alpha = 0
                }
              if (prevText) {
                prevText.visible = false
                prevText.alpha = 0
              }
            }

            // 다른 모든 씬 숨기기 (현재 씬과 같은 그룹 제외)
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

        let transition: string
        let transitionDuration: number

        if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
          const firstSceneInGroup = timeline.scenes[firstSceneIndex]
          transition = forceTransition || firstSceneInGroup?.transition || 'fade'

          if (firstSceneIndex === actualSceneIndex) {
            transitionDuration =
              overrideTransitionDuration !== undefined
                ? overrideTransitionDuration
                : currentScene.transitionDuration && currentScene.transitionDuration > 0
                  ? currentScene.transitionDuration
                  : currentScene.duration && currentScene.duration > 0
                    ? currentScene.duration
                    : 0.5
          } else {
            transitionDuration =
              overrideTransitionDuration !== undefined
                ? overrideTransitionDuration
                : currentScene.duration && currentScene.duration > 0
                  ? currentScene.duration
                  : 0.5
          }
        } else {
          transition = forceTransition || currentScene.transition || 'fade'
          transitionDuration =
            overrideTransitionDuration !== undefined
              ? overrideTransitionDuration
              : currentScene.transitionDuration && currentScene.transitionDuration > 0
                ? currentScene.transitionDuration
                : 0.5
        }

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

          if (currentText) {
            if (currentText.parent !== containerRef.current && containerRef.current) {
              if (currentText.parent) {
                currentText.parent.removeChild(currentText)
              }
              containerRef.current.addChild(currentText)
            }
            currentText.visible = true
            currentText.alpha = 1
          }

          previousSceneIndexRef.current = actualSceneIndex

          setTimeout(() => {
            wrappedOnComplete()
          }, 50)

          return
        }

        // 현재 씬을 컨테이너에 추가
        if (!containerRef.current) {
          console.error(
            `[updateCurrentScene] containerRef.current가 null - sceneIndex: ${actualSceneIndex}`
          )
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

        // 텍스트 처리
        textsRef.current.forEach((text) => {
          if (!text || text === currentText) return
          text.visible = false
          text.alpha = 0
        })

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

        if (currentText && !isManualSceneSelectRef.current) {
          if (currentText.parent !== containerRef.current && containerRef.current) {
            if (currentText.parent) {
              currentText.parent.removeChild(currentText)
            }
            containerRef.current.addChild(currentText)
          }
          // visible/alpha는 applyEnterEffect에서 설정하므로 여기서는 설정하지 않음 (중복 렌더링 방지)
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

        // 같은 그룹 내 씬인 경우
        if (isInSameGroup && !isFirstSceneInGroup) {
          let textToUpdate = currentText

          if (!textToUpdate && firstSceneIndex >= 0) {
            textToUpdate = textsRef.current.get(firstSceneIndex) || undefined
          }

          if (currentScene.sceneId !== undefined) {
            let textWithDebugId: PIXI.Text | null = null
            let maxDebugId = ''
            textsRef.current.forEach((text, idx) => {
              if (text) {
                const textScene = timeline.scenes[idx]
                const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
                const matchesSceneId = textScene?.sceneId === currentScene.sceneId
                const matchesIndex = idx === actualSceneIndex
                if (matchesIndex || matchesSceneId) {
                  if (debugId && debugId.startsWith('text_')) {
                    if (debugId > maxDebugId) {
                      maxDebugId = debugId
                      textWithDebugId = text
                    }
                  }
                }
              }
            })

            if (textWithDebugId !== null) {
              textToUpdate = textWithDebugId
            } else {
              let visibleText: PIXI.Text | null = null
              textsRef.current.forEach((text, idx) => {
                if (text && text.visible && text.alpha > 0) {
                  const textScene = timeline.scenes[idx]
                  if (textScene?.sceneId === currentScene.sceneId || idx === actualSceneIndex) {
                    visibleText = text
                  }
                }
              })

              if (visibleText) {
                textToUpdate = visibleText
              } else if (firstSceneIndex >= 0) {
                const firstText = textsRef.current.get(firstSceneIndex)
                if (firstText) {
                  textToUpdate = firstText
                }
              }
            }
          }

          if (!textToUpdate) {
            if (currentText) {
              textToUpdate = currentText
            } else if (firstSceneIndex >= 0) {
              textToUpdate = textsRef.current.get(firstSceneIndex) || undefined
            }
          }

          if (!isManualSceneSelectRef.current) {
            if (previousText && previousIndex !== null && previousIndex !== actualSceneIndex) {
              previousText.visible = false
              previousText.alpha = 0
            }

            if (textToUpdate && appRef.current) {
              if (textToUpdate.parent !== containerRef.current) {
                if (textToUpdate.parent) {
                  textToUpdate.parent.removeChild(textToUpdate)
                }
                containerRef.current.addChild(textToUpdate)
              }
            }
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
            
            // 디버깅: 컨테이너에 있는 스프라이트 확인
            if (spritesInContainer.length > 0) {
              console.warn(
                `[전환효과] 컨테이너에 spriteToUse 외 ${spritesInContainer.length}개의 스프라이트가 있습니다. 제거합니다.`
              )
            }
            
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
              previousSceneIndexRef.current = actualSceneIndex
              wrappedOnComplete()
            },
            previousIndex,
            isFirstInGroup ? groupTransitionTimelinesRef : undefined,
            currentScene.sceneId,
            isPlaying
          )
        }
      }

      if (!currentSprite) {
        spritesRef.current.forEach((sprite, index) => {
          if (sprite?.parent) {
            sprite.visible = index === actualSceneIndex
            sprite.alpha = index === actualSceneIndex ? 1 : 0
          }
        })

        if (!isManualSceneSelectRef.current) {
          textsRef.current.forEach((text, index) => {
            if (text?.parent) {
              text.visible = index === actualSceneIndex
              text.alpha = index === actualSceneIndex ? 1 : 0
            }
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
      handleSkipAnimation,
    ]
  )

  return {
    updateCurrentScene,
    groupTransitionTimelinesRef,
  }
}

