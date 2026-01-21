/**
 * 씬 매니저 통합 훅
 * 분리된 훅들을 조합하여 씬 관리 기능을 제공합니다.
 */

import { useCallback, useRef, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { useFabricSync } from './scene-management/useFabricSync'
import { useSceneLoader } from './scene-management/useSceneLoader'
import { useSceneRenderer } from './scene-management/useSceneRenderer'
import { useSceneTransition } from './scene-management/useSceneTransition'
import type { UseSceneManagerParams } from './types/scene'

/**
 * 씬 매니저 통합 훅
 * 분리된 훅들을 조합하여 씬 관리 기능을 제공합니다.
 */
export const useSceneManager = ({
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
}: UseSceneManagerParams) => {
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
  })

  // useSceneRenderer: renderSceneImage, renderSubtitlePart, prepareImageAndSubtitle 제공
  const {
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
    renderSubtitlePartRef: renderSubtitlePartRefFromRenderer,
  } = useSceneRenderer({
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    timeline,
    updateCurrentScene,
  })

  // renderSubtitlePartRef 동기화 (useEffect에서 처리)
  useEffect(() => {
    renderSubtitlePartRef.current = renderSubtitlePartRefFromRenderer.current
  }, [renderSubtitlePartRefFromRenderer])

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
  const renderUnderline = useCallback((textObj: PIXI.Text, scene: typeof timeline.scenes[0]) => {
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

      // 재생 중일 때는 렌더링 시작 전에 이전 씬 정리 (중복 렌더링 방지)
      if (isPlaying) {
        const lastRenderedIndex = previousSceneIndexRef.current
        if (lastRenderedIndex !== null && lastRenderedIndex !== sceneIndex) {
          // 이전 씬의 스프라이트와 텍스트 숨기기
          const previousSprite = spritesRef?.current.get(lastRenderedIndex)
          const previousText = textsRef.current.get(lastRenderedIndex)
          
          if (previousSprite) {
            previousSprite.visible = false
            previousSprite.alpha = 0
          }
          // 같은 그룹 내 씬이 아닌 경우에만 텍스트 숨기기
          const previousScene = timeline.scenes[lastRenderedIndex]
          const currentScene = timeline.scenes[sceneIndex]
          if (previousText && previousScene?.sceneId !== currentScene?.sceneId) {
            previousText.visible = false
            previousText.alpha = 0
          }
        }
        
        // 다른 모든 씬도 숨기기 (현재 씬과 같은 그룹 제외)
        const currentScene = timeline.scenes[sceneIndex]
        const currentSceneId = currentScene?.sceneId
        
        spritesRef?.current.forEach((sprite, idx) => {
          if (sprite && idx !== sceneIndex) {
            sprite.visible = false
            sprite.alpha = 0
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
        
        // 전환 효과가 'none'인 경우, 현재 씬의 스프라이트를 미리 표시
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
      }

      console.log(
        `[renderSceneContent] 렌더링 경로 확인 | sceneIndex: ${sceneIndex}, partIndex: ${partIndex}, isPlaying: ${isPlaying}, prepareOnly: ${prepareOnly}, shouldSkipAnimation: ${shouldSkipAnimation}, forceTransition: ${forceTransition}, previousIndex: ${previousIndex}`
      )

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
          targetTextObj.text = partText
          targetTextObj.visible = true
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
        targetTextObj.text = partText
        // 밑줄 렌더링
        renderUnderline(targetTextObj, scene)
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
          targetTextObj.text = partText
          targetTextObj.visible = true
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
    ]
  )

  return {
    updateCurrentScene,
    syncFabricWithScene,
    loadAllScenes,
    renderSceneContent,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
  }
}
