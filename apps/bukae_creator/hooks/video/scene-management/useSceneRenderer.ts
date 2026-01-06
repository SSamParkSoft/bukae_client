/**
 * 씬 렌더링 훅
 * 씬 이미지와 자막을 렌더링하는 함수들을 제공합니다.
 */

import { useCallback, useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import type {
  RenderSceneImageOptions,
  RenderSubtitlePartOptions,
  PrepareImageAndSubtitleOptions,
} from '../types/scene'

interface UseSceneRendererParams {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  timeline: TimelineData | null
  updateCurrentScene: (
    explicitPreviousIndex?: number | null,
    forceTransition?: string,
    onAnimationComplete?: (sceneIndex: number) => void,
    isPlaying?: boolean,
    partIndex?: number | null,
    sceneIndex?: number,
    overrideTransitionDuration?: number
  ) => void
}

/**
 * 씬 렌더링 훅
 */
export function useSceneRenderer({
  appRef,
  containerRef,
  spritesRef,
  textsRef,
  currentSceneIndexRef,
  timeline,
  updateCurrentScene,
}: UseSceneRendererParams) {
  // renderSubtitlePart를 ref로 저장 (다른 곳에서 사용하기 위해)
  const renderSubtitlePartRef = useRef<
    ((
      sceneIndex: number,
      partIndex: number | null,
      options?: RenderSubtitlePartOptions
    ) => void) | null
  >(null)

  // 이미지만 렌더링하는 함수
  const renderSceneImage = useCallback(
    (sceneIndex: number, options?: RenderSceneImageOptions) => {
      if (!timeline || !appRef.current || !containerRef.current) return

      const scene = timeline.scenes[sceneIndex]
      if (!scene) return

      const { forceTransition, previousIndex, onComplete, prepareOnly = false } = options || {}

      const currentSprite = spritesRef.current.get(sceneIndex)
      if (!currentSprite) return

      const previousSprite =
        previousIndex !== null && previousIndex !== undefined
          ? spritesRef.current.get(previousIndex)
          : null

      // 이전 씬 숨기기
      if (previousSprite && previousIndex !== null && previousIndex !== sceneIndex) {
        previousSprite.visible = false
        previousSprite.alpha = 0
      }

      // 현재 씬 스프라이트를 컨테이너에 추가
      if (currentSprite.parent !== containerRef.current) {
        if (currentSprite.parent) {
          currentSprite.parent.removeChild(currentSprite)
        }
        containerRef.current.addChild(currentSprite)
      }

      const prevSpriteAlpha = currentSprite.alpha
      const prevSpriteVisible = currentSprite.visible

      if (prepareOnly) {
        // 준비만: alpha: 0으로 설정
        currentSprite.visible = true
        currentSprite.alpha = 0
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 전환 효과 적용
      if (forceTransition === 'none') {
        // 애니메이션 없이 즉시 표시
        currentSprite.visible = true
        currentSprite.alpha = 1
      } else {
        // 전환 효과 적용
        const originalSceneIndex = currentSceneIndexRef.current
        currentSceneIndexRef.current = sceneIndex

        // 구간이 있어도 전체 자막 표시 (partIndex: null로 설정)
        const partIndex = null

        // updateCurrentScene 호출 (이미지만 처리)
        updateCurrentScene(
          previousIndex !== undefined ? previousIndex : originalSceneIndex,
          forceTransition,
          () => {
            // 텍스트는 처리하지 않으므로 스프라이트만 확인
            const finalSprite = spritesRef.current.get(sceneIndex)
            if (finalSprite) {
              finalSprite.visible = true
              finalSprite.alpha = 1
            }
            if (onComplete) {
              onComplete()
            }
          },
          false, // isPlaying
          partIndex
        )
        return
      }

      // 깜빡임 확인
      const spriteAlphaChanged = prevSpriteAlpha !== currentSprite.alpha
      const spriteVisibleChanged = prevSpriteVisible !== currentSprite.visible

      if (onComplete) {
        onComplete()
      }
    },
    [timeline, appRef, containerRef, spritesRef, updateCurrentScene, currentSceneIndexRef]
  )

  // 자막만 렌더링하는 함수
  const renderSubtitlePart = useCallback(
    (sceneIndex: number, partIndex: number | null, options?: RenderSubtitlePartOptions) => {
      if (!timeline || !appRef.current) {
        return
      }

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        return
      }

      const { onComplete, prepareOnly = false } = options || {}

      // 원본 텍스트에서 구간 추출
      const originalText = scene.text?.content || ''

      // 구간 분할 확인
      const scriptParts = splitSubtitleByDelimiter(originalText)
      const hasSegments = scriptParts.length > 1

      // partIndex가 null이면 구간이 있으면 첫 번째 구간만 표시, 없으면 전체 자막 표시
      let partText: string | null = null
      if (partIndex === null) {
        if (hasSegments) {
          partText = scriptParts[0]?.trim() || originalText
        } else {
          partText = originalText
        }
      } else {
        if (partIndex >= 0 && partIndex < scriptParts.length) {
          partText = scriptParts[partIndex]?.trim() || null
        } else {
          if (scriptParts.length > 0) {
            partText = scriptParts[0]?.trim() || null
          } else {
            partText = originalText
          }
        }
      }

      if (!partText) {
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 텍스트 객체 찾기
      let targetTextObj: PIXI.Text | null = null
      const sceneId = scene.sceneId
      if (sceneId !== undefined) {
        const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
        if (firstSceneIndexInGroup >= 0) {
          targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
        }
      }

      if (!targetTextObj) {
        targetTextObj = textsRef.current.get(sceneIndex) || null
      }

      // 텍스트 객체를 찾지 못한 경우 추가 검색
      if (!targetTextObj) {
        if (sceneId !== undefined) {
          timeline.scenes.forEach((s, idx) => {
            if (s.sceneId === sceneId && !targetTextObj) {
              const text = textsRef.current.get(idx)
              if (text) {
                targetTextObj = text
              }
            }
          })
        }

        if (!targetTextObj) {
          for (let i = 0; i < timeline.scenes.length; i++) {
            const text = textsRef.current.get(i)
            if (text) {
              targetTextObj = text
              break
            }
          }
        }

        if (!targetTextObj && containerRef.current) {
          containerRef.current.children.forEach((child) => {
            if (child instanceof PIXI.Text && !targetTextObj) {
              targetTextObj = child
            }
          })
        }
      }

      if (!targetTextObj) {
        console.error(
          `[renderSubtitlePart] 텍스트 객체를 찾을 수 없습니다. 씬 ${sceneIndex}, partIndex: ${partIndex}`
        )
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 텍스트 객체가 컨테이너에 추가되어 있는지 확인
      if (containerRef.current) {
        if (targetTextObj.parent !== containerRef.current) {
          if (targetTextObj.parent) {
            targetTextObj.parent.removeChild(targetTextObj)
          }
          containerRef.current.addChild(targetTextObj)
        }
        containerRef.current.setChildIndex(targetTextObj, containerRef.current.children.length - 1)
      }

      // 텍스트 업데이트
      targetTextObj.text = partText

      if (prepareOnly) {
        targetTextObj.visible = true
        targetTextObj.alpha = 0
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 표시
      targetTextObj.visible = true
      targetTextObj.alpha = 1

      // 텍스트 객체가 컨테이너에 있는지 다시 확인
      if (containerRef.current && targetTextObj.parent !== containerRef.current) {
        if (targetTextObj.parent) {
          targetTextObj.parent.removeChild(targetTextObj)
        }
        containerRef.current.addChild(targetTextObj)
        containerRef.current.setChildIndex(targetTextObj, containerRef.current.children.length - 1)
      }

      // 자막이 제대로 렌더링되었는지 최종 확인
      if (!(targetTextObj.visible && targetTextObj.alpha > 0 && targetTextObj.text === partText)) {
        targetTextObj.text = partText
        targetTextObj.visible = true
        targetTextObj.alpha = 1
      }

      if (onComplete) {
        onComplete()
      }
    },
    [timeline, appRef, containerRef, textsRef]
  )

  // renderSubtitlePart를 ref에 저장
  useEffect(() => {
    renderSubtitlePartRef.current = renderSubtitlePart
  }, [renderSubtitlePart])

  // 이미지와 자막을 동시에 alpha: 0으로 준비하는 함수
  const prepareImageAndSubtitle = useCallback(
    (sceneIndex: number, partIndex: number = 0, options?: PrepareImageAndSubtitleOptions) => {
      if (!timeline || !appRef.current) return

      const scene = timeline.scenes[sceneIndex]
      if (!scene) return

      const { onComplete } = options || {}

      // 이미지 준비
      const currentSprite = spritesRef.current.get(sceneIndex)
      if (currentSprite && containerRef.current) {
        if (currentSprite.parent !== containerRef.current) {
          if (currentSprite.parent) {
            currentSprite.parent.removeChild(currentSprite)
          }
          containerRef.current.addChild(currentSprite)
        }
        currentSprite.visible = true
        currentSprite.alpha = 0
      }

      // 자막 준비
      const originalText = scene.text?.content || ''
      const scriptParts = splitSubtitleByDelimiter(originalText)
      const partText = scriptParts[partIndex]?.trim() || null

      if (partText) {
        let targetTextObj: PIXI.Text | null = textsRef.current.get(sceneIndex) || null

        // 같은 그룹 내 첫 번째 씬의 텍스트 사용
        if (!targetTextObj || (!targetTextObj.visible && targetTextObj.alpha === 0)) {
          const sceneId = scene.sceneId
          if (sceneId !== undefined) {
            const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
            if (firstSceneIndexInGroup >= 0) {
              targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
            }
          }
        }

        if (targetTextObj) {
          targetTextObj.text = partText
          targetTextObj.visible = true
          targetTextObj.alpha = 0
        }
      }

      if (onComplete) {
        onComplete()
      }
    },
    [timeline, appRef, containerRef, spritesRef, textsRef]
  )

  return {
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
    renderSubtitlePartRef,
  }
}

