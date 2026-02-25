/**
 * 씬 매니저 통합 훅
 * 
 * 씬 로딩, 전환, Fabric 동기화, 렌더링 함수들을 통합하여 제공합니다.
 * - useSceneLoader: 씬 리소스 로딩
 * - useSceneTransition: 씬 전환 효과
 * - useFabricSync: Fabric.js와 씬 상태 동기화
 * - 렌더링 함수들: renderSceneContent, renderSceneImage, renderSubtitlePart, prepareImageAndSubtitle
 * 
 * 주의: renderAt 함수는 useTransportRenderer에서 제공되므로 이 훅에서는 제공하지 않습니다.
 */

import { useCallback, useRef, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { useFabricSync } from './management/useFabricSync'
import { useSceneLoader } from './management/useSceneLoader'
import { useSceneTransition } from './management/useSceneTransition'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { getSubtitlePosition } from '../renderer/utils/getSubtitlePosition'
import { normalizeAnchorToTopLeft, calculateTextPositionInBox } from '../renderer/subtitle/useSubtitleRenderer'
import { getPreviewLetterSpacing, getPreviewStrokeWidth } from '../renderer/subtitle/previewStroke'
import type { UseSceneManagerParams } from '../types/scene'
import type { TimelineScene } from '@/lib/types/domain/timeline'

/**
 * 씬 매니저 통합 훅
 * 
 * 씬 로딩, 전환, Fabric 동기화, 렌더링 함수들을 통합하여 제공합니다.
 */
export const useSceneManager = (useSceneManagerParams: UseSceneManagerParams) => {
  const {
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    previousSceneIndexRef,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    activeAnimationsRef, // 현재 사용되지 않지만 타입 호환성을 위해 유지
    fabricCanvasRef,
    fabricScaleRatioRef,
    isSavingTransformRef,
    isManualSceneSelectRef,
    timeline,
    stageDimensions,
    useFabricEditing,
    loadPixiTextureWithCache,
    applyEnterEffect,
    onLoadComplete,
    setTimeline,
    setCurrentSceneIndex,
  } = useSceneManagerParams
  // renderSubtitlePart를 ref로 저장 (useSceneTransition에서 사용하기 위해)
  const renderSubtitlePartRef = useRef<
    ((
      sceneIndex: number,
      partIndex: number | null,
      options?: { skipAnimation?: boolean; onComplete?: () => void; prepareOnly?: boolean }
    ) => void) | null
  >(null)

  // useSceneTransition: updateCurrentScene 제공 (임시로 빈 renderSubtitlePartRef 전달)
  const { updateCurrentScene } = useSceneTransition({
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    previousSceneIndexRef,
    isManualSceneSelectRef: isManualSceneSelectRef || { current: false },
    timeline,
    stageDimensions,
    applyEnterEffect,
    renderSubtitlePartRef,
    fabricCanvasRef: (fabricCanvasRef || { current: null }) as React.RefObject<fabric.Canvas | null>,
    fabricScaleRatioRef: (fabricScaleRatioRef || { current: 1 }) as React.MutableRefObject<number>,
  })

  // renderSubtitlePart 함수 구현 (useSceneTransition에서 사용)
  const renderSubtitlePart = useCallback(
    (sceneIndex: number, partIndex: number | null, options?: { skipAnimation?: boolean; onComplete?: () => void; prepareOnly?: boolean }) => {
      if (!timeline || !appRef.current) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const { onComplete, prepareOnly = false } = options || {}
      const originalText = scene.text?.content || ''
      const scriptParts = splitSubtitleByDelimiter(originalText)
      const hasSegments = scriptParts.length > 1

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

      // 같은 그룹 내 모든 텍스트를 먼저 숨김 (겹침 방지)
      // 같은 그룹 내에서 텍스트 객체를 공유하는 경우를 고려
      const sceneId = scene.sceneId
      
      // 디버깅: 같은 그룹 내 모든 텍스트 객체 상태 확인
      if (sceneId !== undefined) {
        // 같은 그룹 내 모든 씬 인덱스 찾기
        const sameGroupSceneIndices = timeline.scenes
          .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
          .filter((idx) => idx >= 0)
        
        // 같은 그룹 내 모든 텍스트 객체 수집 (중복 제거 - 같은 인스턴스)
        const textObjectsToHide = new Set<PIXI.Text>()
        sameGroupSceneIndices.forEach((groupSceneIndex) => {
          const groupTextObj = textsRef.current.get(groupSceneIndex)
          if (groupTextObj && !groupTextObj.destroyed) {
            textObjectsToHide.add(groupTextObj)
          }
        })
        
        // 실제로 사용되는 모든 텍스트 객체 인스턴스 숨김
        textObjectsToHide.forEach((textObj) => {
          textObj.visible = false
        })
      } else {
        // sceneId가 없으면 모든 텍스트 숨김
        const textObjectsToHide = new Set<PIXI.Text>()
        textsRef.current.forEach((textObj) => {
          if (!textObj.destroyed) {
            textObjectsToHide.add(textObj)
          }
        })
        textObjectsToHide.forEach((textObj) => {
          textObj.visible = false
        })
      }
      
      // 텍스트 객체 찾기
      // 분할된 씬(splitIndex가 있는 경우)의 경우 각 씬 인덱스별로 별도 텍스트 객체를 사용
      // 분할되지 않은 씬의 경우 같은 그룹 내에서 텍스트 객체를 공유할 수 있음
      let targetTextObj: PIXI.Text | null = null
      
      // 분할된 씬의 경우 현재 씬 인덱스의 텍스트 객체를 우선 사용
      if (scene.splitIndex !== undefined) {
        targetTextObj = textsRef.current.get(sceneIndex) || null
        
        // 분할된 씬인데 텍스트 객체가 없으면 같은 그룹 내 다른 씬의 텍스트 객체를 찾아서 사용
        // 단, 분할된 씬은 각각 별도의 텍스트 객체를 가져야 하므로, 아직 생성되지 않았을 경우 임시로 사용
        if (!targetTextObj && sceneId !== undefined) {
          // 같은 그룹 내 모든 씬 인덱스 찾기
          const sameGroupSceneIndices = timeline.scenes
            .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
            .filter((idx) => idx >= 0 && idx !== sceneIndex)
          
          // 같은 그룹 내 씬들 중 텍스트 객체가 있는 첫 번째 씬 찾기
          for (const groupSceneIndex of sameGroupSceneIndices) {
            const groupTextObj = textsRef.current.get(groupSceneIndex)
            if (groupTextObj && !groupTextObj.destroyed) {
              // 분할된 씬은 별도의 텍스트 객체가 필요하지만, 아직 생성되지 않았을 경우
              // 같은 그룹 내 다른 씬의 텍스트 객체를 임시로 사용 (렌더링 보장)
              targetTextObj = groupTextObj
              break
            }
          }
        }
      } else {
        // 분할되지 않은 씬의 경우 같은 그룹 내 첫 번째 씬 인덱스의 텍스트 객체 사용
        if (sceneId !== undefined) {
          const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
          if (firstSceneIndexInGroup >= 0) {
            targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
          }
        }

        if (!targetTextObj) {
          targetTextObj = textsRef.current.get(sceneIndex) || null
        }
      }

      if (!targetTextObj) {
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 텍스트 업데이트 (null이 되지 않도록 보장)
      targetTextObj.text = partText || ''

      // 자막 스타일 업데이트
      if (scene.text) {
        const fontFamily = resolveSubtitleFontFamily(scene.text.font)
        const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
        const stageWidth = appRef.current?.screen?.width || 1080
        let textWidth = stageWidth
        if (scene.text.transform?.width) {
          textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
        }

        const strokeColor = scene.text.stroke?.color || '#000000'
        const strokeWidth = getPreviewStrokeWidth(scene.text.stroke?.width, {
          fontSize: scene.text.fontSize,
        })
        const letterSpacing = getPreviewLetterSpacing(strokeWidth, {
          fontSize: scene.text.fontSize,
        })
        
        const styleConfig: Partial<PIXI.TextStyle> = {
          fontFamily,
          fontSize: scene.text.fontSize || 80,
          fill: scene.text.color || '#ffffff',
          align: scene.text.style?.align || 'center',
          fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
          fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
          letterSpacing,
          wordWrap: true,
          wordWrapWidth: textWidth,
          breakWords: true,
        }
        
        // stroke는 strokeWidth가 0보다 클 때만 설정
        if (strokeWidth > 0) {
          styleConfig.stroke = { color: strokeColor, width: strokeWidth }
        }

        const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)
        targetTextObj.style = textStyle

        // 텍스트 Transform 적용
        // targetTextObj가 null이 아닌지 다시 확인 (비동기적으로 null이 될 수 있음)
        if (!targetTextObj || targetTextObj.destroyed) {
          if (onComplete) {
            onComplete()
          }
          return
        }
        
        if (scene.text.transform) {
          const transform = scene.text.transform
          const scaleX = transform.scaleX ?? 1
          const scaleY = transform.scaleY ?? 1
          const anchorX = transform.anchor?.x ?? 0.5
          const anchorY = transform.anchor?.y ?? 0.5
          const hAlign = transform.hAlign ?? 'center'
          targetTextObj.anchor.set(0, 0)
          const bounds = targetTextObj.getLocalBounds()
          const measuredW = bounds.width || 0
          const measuredH = bounds.height || 0
          const hasBoxSize = (transform.width != null && transform.width > 0) && (transform.height != null && transform.height > 0)
          let boxX: number
          let boxY: number
          let boxW: number
          let boxH: number
          if (hasBoxSize) {
            const r = normalizeAnchorToTopLeft(transform.x, transform.y, transform.width, transform.height, scaleX, scaleY, anchorX, anchorY)
            boxX = r.boxX
            boxY = r.boxY
            boxW = r.boxW
            boxH = r.boxH
          } else {
            boxW = measuredW * scaleX
            boxH = measuredH * scaleY
            boxX = transform.x - boxW * anchorX
            boxY = transform.y - boxH * anchorY
          }
          const { textX, textY } = calculateTextPositionInBox(boxX, boxY, boxW, boxH, measuredW * scaleX, measuredH * scaleY, hAlign)
          targetTextObj.x = textX
          targetTextObj.y = textY
          targetTextObj.scale.set(scaleX, scaleY)
          targetTextObj.rotation = transform.rotation ?? 0
        } else {
          // transform이 없을 때 공통 함수 사용
          const subtitlePosition = getSubtitlePosition(scene, stageDimensions)
          targetTextObj.anchor.set(0.5, 0.5)
          targetTextObj.x = subtitlePosition.x
          targetTextObj.y = subtitlePosition.y
          targetTextObj.scale.set(subtitlePosition.scaleX, subtitlePosition.scaleY)
          targetTextObj.rotation = subtitlePosition.rotation
        }
      }

      if (prepareOnly) {
        targetTextObj.visible = true
        
        // 텍스트 표시 후 다시 한 번 같은 그룹 내 다른 텍스트 숨김 (겹침 방지)
        if (sceneId !== undefined) {
          const sameGroupSceneIndices = timeline.scenes
            .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
            .filter((idx) => idx >= 0 && idx !== sceneIndex)
          
          sameGroupSceneIndices.forEach((groupSceneIndex) => {
            const groupTextObj = textsRef.current.get(groupSceneIndex)
            if (groupTextObj && !groupTextObj.destroyed && groupTextObj !== targetTextObj) {
              groupTextObj.visible = false
            }
          })
        }
        targetTextObj.alpha = 0
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 표시
      targetTextObj.visible = true
      targetTextObj.alpha = 1
      
      if (containerRef.current) {
        if (targetTextObj.parent !== containerRef.current) {
          if (targetTextObj.parent) {
            targetTextObj.parent.removeChild(targetTextObj)
          }
          containerRef.current.addChild(targetTextObj)
        }
        const currentIndex = containerRef.current.getChildIndex(targetTextObj)
        const maxIndex = containerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          containerRef.current.setChildIndex(targetTextObj, maxIndex)
        }
      }

      if (onComplete) {
        onComplete()
      }
    },
    [timeline, appRef, containerRef, textsRef, stageDimensions]
  )

  // renderSubtitlePartRef 동기화
  useEffect(() => {
    renderSubtitlePartRef.current = renderSubtitlePart
  }, [renderSubtitlePart])

  // useSceneLoader: loadAllScenes 제공
  const { loadAllScenes } = useSceneLoader({
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    isSavingTransformRef: isSavingTransformRef || { current: false },
    timeline,
    stageDimensions,
    loadPixiTextureWithCache,
    updateCurrentScene,
    onLoadComplete,
  })

  // useFabricSync: syncFabricWithScene 제공
  const { syncFabricWithScene } = useFabricSync({
    useFabricEditing,
    fabricCanvasRef: (fabricCanvasRef || { current: null }) as React.RefObject<fabric.Canvas | null>,
    fabricScaleRatioRef: (fabricScaleRatioRef || { current: 1 }) as React.MutableRefObject<number>,
    currentSceneIndexRef,
    timeline,
    stageDimensions,
  })

  // 밑줄 렌더링 헬퍼 함수
  const renderUnderline = useCallback((textObj: PIXI.Text, scene: TimelineScene) => {
    // underline 꺼짐이면 제거만 수행
    const removeExisting = () => {
      const existing = textObj.children.find(
        (child) => child instanceof PIXI.Graphics && (child as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline
      )
      if (existing) {
        textObj.removeChild(existing)
      }
    }

    if (!scene.text?.style?.underline) {
      removeExisting()
      return
    }

    removeExisting()

    // 텍스트 크기 기준으로 밑줄 생성 (텍스트 로컬 좌표계에 추가)
    const underlineHeight = Math.max(2, (scene.text.fontSize || 80) * 0.05)
    const underline = new PIXI.Graphics()
    ;(underline as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline = true

    const textColor = scene.text.color || '#ffffff'
    const colorValue = textColor.startsWith('#')
      ? parseInt(textColor.slice(1), 16)
      : 0xffffff

    underline.lineStyle(underlineHeight, colorValue, 1)
    // 앵커(0.5,0.5) 기준: 중앙에서 좌우로 선을 긋고, 텍스트 높이 절반 아래에 배치
    underline.moveTo(-textObj.width / 2, textObj.height / 2 + underlineHeight / 2)
    underline.lineTo(textObj.width / 2, textObj.height / 2 + underlineHeight / 2)

    // 텍스트의 자식으로 붙여 함께 이동/스케일/회전되게 함
    textObj.addChild(underline)
  }, [])

  // 통합 렌더링 함수: 모든 canvas 렌더링 경로를 통합 (재생 중/비재생 중 모두 사용)
  const renderSceneContent = useCallback(
    (
      sceneIndex: number,
      partIndex?: number | null, 
      options?: { 
        skipAnimation?: boolean
        forceTransition?: string
        previousIndex?: number | null
        onComplete?: () => void
        updateTimeline?: boolean
        prepareOnly?: boolean
        isPlaying?: boolean
        transitionDuration?: number
      }
    ) => {
      
      if (!timeline || !appRef.current) {
        return
      }

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        return
      }

      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        skipAnimation = false,
        forceTransition,
        previousIndex,
        onComplete,
        updateTimeline = false,
        prepareOnly = false,
        isPlaying = false,
        transitionDuration: overrideTransitionDuration,
      } = options || {}

      const shouldSkipAnimation = forceTransition === 'none'

      // 렌더링 시작 전에 이전 씬 정리 (재생 중/비재생 중 모두 적용, 자막 누적 방지)
      const lastRenderedIndex = previousSceneIndexRef.current
      if (lastRenderedIndex !== null && lastRenderedIndex !== sceneIndex) {
        // 이전 씬의 스프라이트와 텍스트 숨기기
        const previousSprite = spritesRef?.current.get(lastRenderedIndex)
        const previousText = textsRef.current.get(lastRenderedIndex)
        
        // 같은 그룹 내 씬이 아닌 경우에만 스프라이트와 텍스트 숨기기
        const previousScene = timeline.scenes[lastRenderedIndex]
        const currentScene = timeline.scenes[sceneIndex]
        if (previousSprite && previousScene?.sceneId !== currentScene?.sceneId) {
          previousSprite.visible = false
          previousSprite.alpha = 0
        }
        if (previousText && previousScene?.sceneId !== currentScene?.sceneId) {
          previousText.visible = false
          previousText.alpha = 0
        }
      }
      
      // 다른 모든 씬도 숨기기 (현재 씬과 같은 그룹 제외)
      // UX 개선: 같은 그룹 내 씬은 숨기지 않아서 분할된 씬 전환 시 안정적 렌더링 보장
      const currentScene = timeline.scenes[sceneIndex]
      const currentSceneId = currentScene?.sceneId
      
      spritesRef?.current.forEach((sprite, idx) => {
        if (sprite && idx !== sceneIndex) {
          // 같은 그룹 내 씬이 아닌 경우에만 스프라이트 숨기기
          const otherScene = timeline.scenes[idx]
          const isOtherInSameGroup = 
            otherScene && currentScene && currentSceneId !== undefined && 
            otherScene.sceneId === currentSceneId
          if (!isOtherInSameGroup) {
            sprite.visible = false
            sprite.alpha = 0
          }
        }
      })
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== sceneIndex) {
          // 같은 그룹 내 씬이 아닌 경우에만 텍스트 숨기기
          const otherScene = timeline.scenes[idx]
          if (otherScene?.sceneId !== currentSceneId) {
            text.visible = false
            text.alpha = 0
          }
        }
      })
        
        // UX 개선: 전환 효과가 'none'인 경우, 현재 씬의 스프라이트와 텍스트를 미리 표시
        // (updateCurrentScene 호출 전에 표시하여 즉시 보이도록 함)
        if (shouldSkipAnimation || forceTransition === 'none' || currentScene.transition === 'none') {
          const currentSprite = spritesRef?.current.get(sceneIndex)
          // 같은 그룹 내 씬인 경우 첫 번째 씬의 스프라이트 사용
          let spriteToShow = currentSprite
          if (currentScene.sceneId !== undefined) {
            const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
            if (firstSceneIndexInGroup >= 0 && firstSceneIndexInGroup !== sceneIndex) {
              const firstSprite = spritesRef?.current.get(firstSceneIndexInGroup)
              if (firstSprite) {
                spriteToShow = firstSprite
              }
            }
          }
          
          if (spriteToShow && containerRef.current) {
            // 컨테이너에 추가
            if (spriteToShow.parent !== containerRef.current) {
              if (spriteToShow.parent) {
                spriteToShow.parent.removeChild(spriteToShow)
              }
              containerRef.current.addChild(spriteToShow)
            }
            // 즉시 표시
            spriteToShow.visible = true
            spriteToShow.alpha = 1
          }
        }

      // 구간 인덱스가 있으면 해당 구간의 텍스트 추출
      let partText: string | null = null
      const originalText = scene.text?.content || ''
      const scriptParts = splitSubtitleByDelimiter(originalText)
      const hasSegments = scriptParts.length > 1

      if (partIndex !== undefined && partIndex !== null) {
        if (scriptParts.length > 0) {
          partText = scriptParts[partIndex]?.trim() || scriptParts[0] || originalText
        } else {
          partText = originalText
        }
      } else {
        if (hasSegments) {
          partText = scriptParts[0]?.trim() || originalText
        } else {
          partText = originalText
        }
      }

      // timeline 업데이트 (필요한 경우만, 재생 중에는 안함)
      if (updateTimeline && partText && setTimeline) {
        const updatedTimeline = {
          ...timeline,
          scenes: timeline.scenes.map((s, i) =>
            i === sceneIndex
              ? {
                  ...s,
                  text: {
                    ...s.text,
                    content: partText,
                  },
                }
              : s
          ),
        }
        setTimeline(updatedTimeline)
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

      // 스프라이트 찾기
      const currentSprite = spritesRef.current.get(sceneIndex)

      // 같은 그룹 내 첫 번째 씬의 스프라이트 사용 (필요한 경우)
      let spriteToUse = currentSprite
      if (scene.sceneId !== undefined) {
        const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
        if (firstSceneIndexInGroup >= 0 && firstSceneIndexInGroup !== sceneIndex) {
          const firstSprite = spritesRef.current.get(firstSceneIndexInGroup)
          if (firstSprite) {
            spriteToUse = firstSprite
          }
        }
      }

      // prepareOnly 모드: alpha: 0으로 준비만 (재생 중 사용)
      if (prepareOnly) {
        if (spriteToUse && containerRef.current) {
          if (spriteToUse.parent !== containerRef.current) {
            if (spriteToUse.parent) {
              spriteToUse.parent.removeChild(spriteToUse)
            }
            containerRef.current.addChild(spriteToUse)
          }
          spriteToUse.visible = true
          spriteToUse.alpha = 0
        }

        if (targetTextObj && partText) {
          targetTextObj.text = partText || ''
          targetTextObj.visible = true
        
        // 텍스트 표시 후 다시 한 번 같은 그룹 내 다른 텍스트 숨김 (겹침 방지)
        if (sceneId !== undefined) {
          const sameGroupSceneIndices = timeline.scenes
            .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
            .filter((idx) => idx >= 0 && idx !== sceneIndex)
          
          sameGroupSceneIndices.forEach((groupSceneIndex) => {
            const groupTextObj = textsRef.current.get(groupSceneIndex)
            if (groupTextObj && !groupTextObj.destroyed && groupTextObj !== targetTextObj) {
              groupTextObj.visible = false
            }
          })
        }
          targetTextObj.alpha = 0
          // 밑줄 렌더링
          renderUnderline(targetTextObj, scene)
        }

        if (onComplete) {
          onComplete()
        }
        return
      }

      // 텍스트 객체 업데이트 (prepareOnly가 아닐 때)
      if (targetTextObj && partText) {
        // targetTextObj가 여전히 유효한지 확인 (비동기적으로 null이 될 수 있음)
        if (!targetTextObj || targetTextObj.destroyed) {
          if (onComplete) {
            onComplete()
          }
          return
        }
        
        targetTextObj.text = partText || ''
        
        // Transform 위치 적용 (ANIMATION.md 6.2/6.3: 박스 anchor → top-left 정규화 후 박스 내 정렬)
        if (scene.text?.transform && targetTextObj && !targetTextObj.destroyed) {
          const transform = scene.text.transform
          const scaleX = transform.scaleX ?? 1
          const scaleY = transform.scaleY ?? 1
          const anchorX = transform.anchor?.x ?? 0.5
          const anchorY = transform.anchor?.y ?? 0.5
          const hAlign = transform.hAlign ?? 'center'
          const hasBoxSize = (transform.width != null && transform.width > 0) && (transform.height != null && transform.height > 0)
          const bounds = targetTextObj.getLocalBounds()
          const measuredW = bounds.width || 0
          const measuredH = bounds.height || 0
          let boxX: number
          let boxY: number
          let boxW: number
          let boxH: number
          if (hasBoxSize) {
            const r = normalizeAnchorToTopLeft(
              transform.x,
              transform.y,
              transform.width,
              transform.height,
              scaleX,
              scaleY,
              anchorX,
              anchorY
            )
            boxX = r.boxX
            boxY = r.boxY
            boxW = r.boxW
            boxH = r.boxH
          } else {
            boxW = measuredW * scaleX
            boxH = measuredH * scaleY
            boxX = transform.x - boxW * anchorX
            boxY = transform.y - boxH * anchorY
          }
          const { textX, textY } = calculateTextPositionInBox(
            boxX,
            boxY,
            boxW,
            boxH,
            measuredW * scaleX,
            measuredH * scaleY,
            hAlign
          )
          targetTextObj.anchor.set(0, 0)
          targetTextObj.x = textX
          targetTextObj.y = textY
          targetTextObj.scale.set(scaleX, scaleY)
          targetTextObj.rotation = transform.rotation ?? 0
        } else if (scene.text && targetTextObj && !targetTextObj.destroyed) {
          // Transform이 없을 때: anchor (0.5, 0.5)로 고정하고 텍스트 중앙이 subtitlePosition.x에 오도록 설정
          const subtitlePosition = getSubtitlePosition(scene, stageDimensions)
          
          // anchor를 (0.5, 0.5)로 고정: 텍스트의 중앙이 기준점이 됨
          targetTextObj.anchor.set(0.5, 0.5)
          
          // 텍스트의 중앙이 subtitlePosition.x, y에 오도록 설정
          // anchor가 (0.5, 0.5)이므로 targetTextObj.x는 텍스트의 중앙 위치
          targetTextObj.x = subtitlePosition.x
          targetTextObj.y = subtitlePosition.y
          targetTextObj.scale.set(subtitlePosition.scaleX ?? 1, subtitlePosition.scaleY ?? 1)
          targetTextObj.rotation = subtitlePosition.rotation ?? 0
        }
        
        // 밑줄 렌더링 (targetTextObj가 여전히 유효한지 확인)
        if (targetTextObj && !targetTextObj.destroyed) {
          renderUnderline(targetTextObj, scene)
        }
      }

      // 같은 씬 내 구간 전환인지 확인
      const isSameSceneTransition =
        currentSceneIndexRef.current === sceneIndex &&
        previousIndex === undefined &&
        partIndex !== undefined &&
        partIndex !== null &&
        partIndex > 0

      // 같은 씬 내 구간 전환인 경우: 자막만 업데이트 (전환 효과 없음)
      if (isSameSceneTransition) {
        if (targetTextObj && partText) {
          targetTextObj.text = partText || ''
          targetTextObj.visible = true
        
        // 텍스트 표시 후 다시 한 번 같은 그룹 내 다른 텍스트 숨김 (겹침 방지)
        if (sceneId !== undefined) {
          const sameGroupSceneIndices = timeline.scenes
            .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
            .filter((idx) => idx >= 0 && idx !== sceneIndex)
          
          sameGroupSceneIndices.forEach((groupSceneIndex) => {
            const groupTextObj = textsRef.current.get(groupSceneIndex)
            if (groupTextObj && !groupTextObj.destroyed && groupTextObj !== targetTextObj) {
              groupTextObj.visible = false
            }
          })
        }
          targetTextObj.alpha = 1
          // 밑줄 렌더링
          renderUnderline(targetTextObj, scene)
        }
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 다른 씬으로 이동하는 경우: 씬 전환
      if (setCurrentSceneIndex && !isPlaying) {
        currentSceneIndexRef.current = sceneIndex
        // renderSceneContent는 씬 전환 시 호출되므로, 타임라인 클릭/드래그가 아닌 경우에만 seek 수행
        // 타임라인 클릭/드래그는 이미 setCurrentTime으로 시간이 설정되었으므로 skipSeek: true
        setCurrentSceneIndex(sceneIndex)
      } else if (setCurrentSceneIndex) {
        currentSceneIndexRef.current = sceneIndex
      }

      // updateCurrentScene 호출하여 씬 전환
      const effectivePreviousIndex =
        previousIndex !== undefined
          ? previousIndex
          : previousSceneIndexRef.current !== sceneIndex
            ? previousSceneIndexRef.current
            : null

      updateCurrentScene(
        effectivePreviousIndex,
        forceTransition,
        () => {
          // updateCurrentScene 완료 후 밑줄 렌더링
          if (targetTextObj && scene.text) {
            renderUnderline(targetTextObj, scene)
          }
          if (onComplete) {
            onComplete()
          }
        },
        isPlaying,
        partIndex,
        sceneIndex,
        overrideTransitionDuration
      )
    },
    [
      timeline,
      appRef,
      containerRef,
      textsRef,
      spritesRef,
      currentSceneIndexRef,
      previousSceneIndexRef,
      updateCurrentScene,
      setTimeline,
      setCurrentSceneIndex,
      renderUnderline,
      stageDimensions,
    ]
  )

  // renderSceneImage 함수 구현 (최소한의 구현)
  const renderSceneImage = useCallback(
    (sceneIndex: number, options?: { skipAnimation?: boolean; forceTransition?: string; previousIndex?: number | null; onComplete?: () => void; prepareOnly?: boolean }) => {
      if (!timeline || !appRef.current || !containerRef.current) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const { forceTransition, previousIndex, onComplete, prepareOnly = false } = options || {}
      
      // 분할된 씬(splitIndex)의 경우 같은 그룹 내 첫 번째 씬의 스프라이트를 사용
      // useSceneLoader에서 분할된 씬은 첫 번째 씬의 스프라이트를 참조하도록 설정됨
      let currentSprite = spritesRef.current.get(sceneIndex)
      
      // 스프라이트가 없고 분할된 씬인 경우, 같은 그룹 내 모든 씬의 스프라이트 찾기
      if (!currentSprite && scene.sceneId !== undefined) {
        // 같은 그룹 내 모든 씬 인덱스 찾기
        const sameGroupSceneIndices = timeline.scenes
          .map((s, idx) => (s.sceneId === scene.sceneId ? idx : -1))
          .filter((idx) => idx >= 0)
        
        // 같은 그룹 내 씬들 중 스프라이트가 있는 첫 번째 씬 찾기
        for (const groupSceneIndex of sameGroupSceneIndices) {
          const groupSprite = spritesRef.current.get(groupSceneIndex)
          if (groupSprite) {
            currentSprite = groupSprite
            // 분할된 씬의 인덱스에도 스프라이트 참조 설정 (다음 번 호출 시 빠른 접근)
            if (groupSceneIndex !== sceneIndex) {
              spritesRef.current.set(sceneIndex, groupSprite)
            }
            break
          }
        }
      }
      
      if (!currentSprite) {
        if (onComplete) {
          onComplete()
        }
        return
      }

      // 이전 씬의 스프라이트 찾기 (분할된 씬 처리 포함)
      let previousSprite: PIXI.Sprite | null = null
      if (previousIndex !== null && previousIndex !== undefined && previousIndex < timeline.scenes.length) {
        previousSprite = spritesRef.current.get(previousIndex) || null
        
        // 분할된 씬인 경우 같은 그룹 내 모든 씬의 스프라이트 찾기
        if (!previousSprite) {
          const previousScene = timeline.scenes[previousIndex]
          if (previousScene?.sceneId !== undefined) {
            // 같은 그룹 내 모든 씬 인덱스 찾기
            const sameGroupSceneIndices = timeline.scenes
              .map((s, idx) => (s.sceneId === previousScene.sceneId ? idx : -1))
              .filter((idx) => idx >= 0)
            
            // 같은 그룹 내 씬들 중 스프라이트가 있는 첫 번째 씬 찾기
            for (const groupSceneIndex of sameGroupSceneIndices) {
              const groupSprite = spritesRef.current.get(groupSceneIndex)
              if (groupSprite) {
                previousSprite = groupSprite
                break
              }
            }
          }
        }
      }

      // 이전 씬의 스프라이트 숨기기 (같은 그룹이 아닌 경우에만)
      if (previousSprite && previousIndex != null && previousIndex !== sceneIndex) {
        const previousScene = timeline.scenes[previousIndex]
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
      
      // 다른 씬의 텍스트 숨기기 (자막 누적 방지)
      const currentScene = timeline.scenes[sceneIndex]
      const currentSceneId = currentScene?.sceneId
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== sceneIndex) {
          // 같은 그룹 내 씬이 아닌 경우에만 텍스트 숨기기
          const otherScene = timeline.scenes[idx]
          if (otherScene?.sceneId !== currentSceneId) {
            text.visible = false
            text.alpha = 0
          }
        }
      })

      if (currentSprite.parent !== containerRef.current) {
        if (currentSprite.parent) {
          currentSprite.parent.removeChild(currentSprite)
        }
        containerRef.current.addChild(currentSprite)
      }

      if (prepareOnly) {
        currentSprite.visible = true
        currentSprite.alpha = 0
        if (onComplete) {
          onComplete()
        }
        return
      }

      if (forceTransition === 'none') {
        currentSprite.visible = true
        currentSprite.alpha = 1
      } else {
        updateCurrentScene(
          previousIndex !== undefined ? previousIndex : currentSceneIndexRef.current,
          forceTransition,
          () => {
            // 전환 완료 후 최종 스프라이트 찾기 (분할된 씬 처리 포함)
            let finalSprite = spritesRef.current.get(sceneIndex)
            
            // 분할된 씬인 경우 같은 그룹 내 모든 씬의 스프라이트 찾기
            if (!finalSprite && scene.sceneId !== undefined) {
              // 같은 그룹 내 모든 씬 인덱스 찾기
              const sameGroupSceneIndices = timeline.scenes
                .map((s, idx) => (s.sceneId === scene.sceneId ? idx : -1))
                .filter((idx) => idx >= 0)
              
              // 같은 그룹 내 씬들 중 스프라이트가 있는 첫 번째 씬 찾기
              for (const groupSceneIndex of sameGroupSceneIndices) {
                const groupSprite = spritesRef.current.get(groupSceneIndex)
                if (groupSprite) {
                  finalSprite = groupSprite
                  // 분할된 씬의 인덱스에도 스프라이트 참조 설정
                  if (groupSceneIndex !== sceneIndex) {
                    spritesRef.current.set(sceneIndex, groupSprite)
                  }
                  break
                }
              }
            }
            
            if (finalSprite) {
              finalSprite.visible = true
              finalSprite.alpha = 1
            }
            if (onComplete) {
              onComplete()
            }
          },
          false,
          null
        )
        return
      }

      if (onComplete) {
        onComplete()
      }
    },
    [timeline, appRef, containerRef, spritesRef, textsRef, updateCurrentScene, currentSceneIndexRef]
  )

  // prepareImageAndSubtitle 함수 구현
  const prepareImageAndSubtitle = useCallback(
    (sceneIndex: number, partIndex: number = 0, options?: { onComplete?: () => void }) => {
      if (!timeline || !appRef.current) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

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
          targetTextObj.text = partText || ''
          targetTextObj.visible = true
          
        // 텍스트 표시 후 다시 한 번 같은 그룹 내 다른 텍스트 숨김 (겹침 방지)
        // 같은 텍스트 객체 인스턴스가 여러 씬 인덱스에 매핑되어 있을 수 있으므로 Set으로 중복 제거
        const currentSceneId = scene.sceneId
        if (currentSceneId !== undefined) {
          const sameGroupSceneIndices = timeline.scenes
            .map((s, idx) => (s.sceneId === currentSceneId ? idx : -1))
            .filter((idx) => idx >= 0 && idx !== sceneIndex)
          
          const textObjectsToHide = new Set<PIXI.Text>()
          sameGroupSceneIndices.forEach((groupSceneIndex) => {
            const groupTextObj = textsRef.current.get(groupSceneIndex)
            if (groupTextObj && !groupTextObj.destroyed && groupTextObj !== targetTextObj) {
              textObjectsToHide.add(groupTextObj)
            }
          })
          
          textObjectsToHide.forEach((textObj) => {
            textObj.visible = false
          })
        }
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
    updateCurrentScene,
    syncFabricWithScene,
    loadAllScenes,
    renderSceneContent,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
    // renderAt은 useTransportRenderer에서 제공되므로 제거
  }
}
