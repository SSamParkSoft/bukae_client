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

      // 디버깅 함수: 중복 렌더링 확인
      const debugRenderState = (label: string) => {
        // visible: true인 스프라이트/텍스트 개수 확인
    const visibleSprites = Array.from(spritesRef?.current.entries() || [])
      .filter(([, sprite]) => sprite?.visible && sprite?.alpha > 0)
      .map(([idx]) => idx)
    
    const visibleTexts = Array.from(textsRef.current.entries())
      .filter(([, text]) => text?.visible && text?.alpha > 0)
      .map(([idx]) => idx)
        
        const currentSprite = spritesRef?.current.get(sceneIndex)
        const currentText = textsRef.current.get(sceneIndex)
        
        console.log(
          `[렌더링] ${label} | Scene ${sceneIndex} | ` +
          `스프라이트: ${currentSprite?.visible && currentSprite?.alpha > 0 ? '표시' : '숨김'} | ` +
          `텍스트: ${currentText?.visible && currentText?.alpha > 0 ? '표시' : '숨김'} | ` +
          `표시 중인 스프라이트: [${visibleSprites.join(', ')}] | ` +
          `표시 중인 텍스트: [${visibleTexts.join(', ')}]`
        )
        
        // 중복 렌더링 경고
        if (visibleSprites.length > 1) {
          console.warn(`⚠️ 중복 스프라이트 감지! ${visibleSprites.length}개가 동시에 표시됨: [${visibleSprites.join(', ')}]`)
        }
        if (visibleTexts.length > 1) {
          console.warn(`⚠️ 중복 텍스트 감지! ${visibleTexts.length}개가 동시에 표시됨: [${visibleTexts.join(', ')}]`)
        }
      }
      
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
      }
      
      console.log(
        `[renderSceneContent] 렌더링 경로 확인 | sceneIndex: ${sceneIndex}, partIndex: ${partIndex}, isPlaying: ${isPlaying}, prepareOnly: ${prepareOnly}, shouldSkipAnimation: ${shouldSkipAnimation}, forceTransition: ${forceTransition}, previousIndex: ${previousIndex}`
      )
      
      // 디버깅: 렌더링 시작 (이전 씬 정리 후)
      debugRenderState('렌더링 시작')

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
        }

        if (onComplete) {
          onComplete()
        }
        return
      }

      // 텍스트 객체 업데이트 (prepareOnly가 아닐 때)
      if (targetTextObj && partText) {
        targetTextObj.text = partText
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
          // 디버깅: 렌더링 완료
          debugRenderState('렌더링 완료')
          
          if (onComplete) {
            onComplete()
          }
        },
        isPlaying,
        partIndex,
        sceneIndex,
        overrideTransitionDuration
      )
      
      // 디버깅: 렌더링 호출 직후
      setTimeout(() => {
        debugRenderState('렌더링 호출 직후')
      }, 100)
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
