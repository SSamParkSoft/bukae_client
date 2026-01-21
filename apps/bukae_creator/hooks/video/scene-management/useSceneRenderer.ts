/**
 * 씬 렌더링 훅
 * 씬 이미지와 자막을 렌더링하는 함수들을 제공합니다.
 */

import { useCallback, useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
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
        // 이미 맨 위가 아니면만 setChildIndex 호출 (깜빡임 방지)
        const currentIndex = containerRef.current.getChildIndex(targetTextObj)
        const maxIndex = containerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          containerRef.current.setChildIndex(targetTextObj, maxIndex)
        }
      }

      // 텍스트 업데이트
      targetTextObj.text = partText

      // 자막 스타일 업데이트 (구간별로 다른 설정 적용)
      if (scene.text) {
        const textObj = targetTextObj
        if (!textObj) {
          if (onComplete) {
            onComplete()
          }
          return
        }
        const fontFamily = resolveSubtitleFontFamily(scene.text.font)
        const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
        
        // 텍스트 너비 계산
        const stageWidth = appRef.current.screen.width
        let textWidth = stageWidth
        if (scene.text.transform?.width) {
          textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
        }

        // 텍스트 스타일 업데이트
        const styleConfig: Record<string, unknown> = {
          fontFamily,
          fontSize: scene.text.fontSize || 80,
          fill: scene.text.color || '#ffffff',
          align: scene.text.style?.align || 'center',
          fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
          fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
          wordWrap: true,
          wordWrapWidth: textWidth,
          breakWords: true,
          stroke: { color: '#000000', width: 10 },
        }
        
        const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)
        textObj.style = textStyle

        // 밑줄 렌더링 (텍스트 자식으로 추가)
        const removeUnderline = () => {
          const underlineChildren = textObj.children.filter(
            (child) => child instanceof PIXI.Graphics && (child as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline
          )
          underlineChildren.forEach((child) => textObj.removeChild(child))
        }
        removeUnderline()
        if (scene.text.style?.underline) {
          requestAnimationFrame(() => {
            const underlineHeight = Math.max(2, (scene.text.fontSize || 80) * 0.05)
            const textColor = scene.text.color || '#ffffff'
            const colorValue = textColor.startsWith('#')
              ? parseInt(textColor.slice(1), 16)
              : 0xffffff

            const bounds = textObj.getLocalBounds()
            const underlineWidth = bounds.width || textWidth

            const underline = new PIXI.Graphics()
            ;(underline as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline = true

            const halfWidth = underlineWidth / 2
            const yPos = bounds.height / 2 + underlineHeight * 0.25 // 텍스트 하단 근처

            underline.lineStyle(underlineHeight, colorValue, 1)
            underline.moveTo(-halfWidth, yPos)
            underline.lineTo(halfWidth, yPos)
            underline.stroke()

            textObj.addChild(underline)
          })
        }

        // 텍스트 Transform 적용
        if (scene.text.transform) {
          const scaleX = scene.text.transform.scaleX ?? 1
          const scaleY = scene.text.transform.scaleY ?? 1
          textObj.x = scene.text.transform.x
          textObj.y = scene.text.transform.y
          textObj.scale.set(scaleX, scaleY)
          textObj.rotation = scene.text.transform.rotation ?? 0
        } else {
          // Transform이 없으면 기본 위치 설정
          const position = scene.text.position || 'bottom'
          const stageHeight = appRef.current.screen.height
          if (position === 'top') {
            textObj.y = stageHeight * 0.15
          } else if (position === 'bottom') {
            textObj.y = stageHeight * 0.85
          } else {
            textObj.y = stageHeight * 0.5
          }
          textObj.x = stageWidth * 0.5
          textObj.scale.set(1, 1)
          textObj.rotation = 0
        }
      }

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
        // 이미 맨 위가 아니면만 setChildIndex 호출 (깜빡임 방지)
        const currentIndex = containerRef.current.getChildIndex(targetTextObj)
        const maxIndex = containerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          containerRef.current.setChildIndex(targetTextObj, maxIndex)
        }
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

