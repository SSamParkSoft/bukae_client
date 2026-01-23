/**
 * 씬 로드 훅
 * 모든 씬을 로드하고 PixiJS 컨테이너에 추가합니다.
 */

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import type { StageDimensions } from '../../types/common'

interface UseSceneLoaderParams {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  isSavingTransformRef: React.MutableRefObject<boolean>
  timeline: TimelineData | null
  stageDimensions: StageDimensions
  loadPixiTextureWithCache: (url: string) => Promise<PIXI.Texture>
  updateCurrentScene: (
    explicitPreviousIndex?: number | null,
    forceTransition?: string,
    onAnimationComplete?: (sceneIndex: number) => void,
    isPlaying?: boolean,
    partIndex?: number | null,
    sceneIndex?: number,
    overrideTransitionDuration?: number
  ) => void
  onLoadComplete?: (sceneIndex: number) => void
}

/**
 * 모든 씬을 로드하는 훅
 */
export function useSceneLoader({
  appRef,
  containerRef,
  spritesRef,
  textsRef,
  currentSceneIndexRef,
  isSavingTransformRef,
  timeline,
  stageDimensions,
  loadPixiTextureWithCache,
  updateCurrentScene,
  onLoadComplete,
}: UseSceneLoaderParams) {
  const loadAllScenes = useCallback(async () => {
    if (!appRef.current || !containerRef.current || !timeline) {
      return
    }

    const container = containerRef.current
    const { width, height } = stageDimensions

    container.removeChildren()
    spritesRef.current.clear()
    
    // textsRef를 clear하기 전에 기존 텍스트 객체의 __debugId와 텍스트 내용을 저장
    const savedTextData = new Map<number, { debugId?: string; text: string }>()
    textsRef.current.forEach((text, idx) => {
      if (text) {
        const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
        savedTextData.set(idx, {
          debugId: debugId || undefined,
          text: text.text || '',
        })
      }
    })
    textsRef.current.clear()

    const loadScene = async (sceneIndex: number) => {
      const scene = timeline.scenes[sceneIndex]
      if (!scene || !scene.image) {
        return
      }

      try {
        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지와 스프라이트를 공유
        const firstSceneIndexInGroup =
          scene.sceneId !== undefined
            ? timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
            : -1
        const isFirstSceneInGroup = firstSceneIndexInGroup === sceneIndex

        // 첫 번째 씬이 아니고 같은 그룹 내에 스프라이트가 이미 있으면 공유
        if (!isFirstSceneInGroup && firstSceneIndexInGroup >= 0) {
          const firstSceneSprite = spritesRef.current.get(firstSceneIndexInGroup)
          if (firstSceneSprite) {
            // 같은 그룹 내 씬들은 첫 번째 씬의 스프라이트를 참조
            spritesRef.current.set(sceneIndex, firstSceneSprite)
            return
          }
        }

        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지를 사용
        const firstSceneInGroup =
          firstSceneIndexInGroup >= 0 ? timeline.scenes[firstSceneIndexInGroup] : null
        const imageToUse = firstSceneInGroup?.image || scene.image
        const baseScene = firstSceneInGroup || scene

        // 이미지 URL 유효성 검사
        if (!imageToUse || imageToUse.trim() === '') {
          console.warn(`[useSceneLoader] 씬 ${sceneIndex}의 이미지 URL이 없습니다.`)
          return
        }

        // 첫 번째 씬이거나 같은 그룹 내 스프라이트가 없으면 새로 생성
        let texture: PIXI.Texture | null = null
        try {
          texture = await loadPixiTextureWithCache(imageToUse)
        } catch (error) {
          console.error(`[useSceneLoader] 씬 ${sceneIndex}의 텍스처 로드 중 에러 발생:`, error)
        }
        
        // texture 유효성 검사 및 fallback 처리
        if (!texture) {
          console.warn(`[useSceneLoader] 씬 ${sceneIndex}의 텍스처 로드 실패, placeholder 사용: ${imageToUse.substring(0, 50)}...`)
          // placeholder texture 생성 (1x1 검은색)
          try {
            const canvas = document.createElement('canvas')
            canvas.width = 1
            canvas.height = 1
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.fillStyle = '#000000'
              ctx.fillRect(0, 0, 1, 1)
            }
            texture = PIXI.Texture.from(canvas)
          } catch (placeholderError) {
            console.error(`[useSceneLoader] Placeholder 생성 실패:`, placeholderError)
            // 최후의 수단: 빈 텍스처 사용
            texture = PIXI.Texture.EMPTY
          }
        }

        // texture의 width와 height가 유효한지 확인
        if (!texture || typeof texture.width !== 'number' || typeof texture.height !== 'number' || 
            texture.width <= 0 || texture.height <= 0) {
          console.error(`[useSceneLoader] 씬 ${sceneIndex}의 텍스처 크기가 유효하지 않습니다: ${texture?.width}x${texture?.height}`)
          // 빈 텍스처로 대체
          texture = PIXI.Texture.EMPTY
        }

        const sprite = new PIXI.Sprite(texture)

        // 회전 피벗을 이미지 중앙으로 설정
        sprite.anchor.set(0.5, 0.5)
        sprite.visible = false
        sprite.alpha = 0

        // Transform 데이터 적용 (첫 번째 씬의 transform 사용)
        if (baseScene.imageTransform) {
          // imageTransform.x와 imageTransform.y는 중심점 좌표 (anchor 0.5 기준)
          sprite.x = baseScene.imageTransform.x
          sprite.y = baseScene.imageTransform.y
          sprite.width = baseScene.imageTransform.width
          sprite.height = baseScene.imageTransform.height
          sprite.rotation = baseScene.imageTransform.rotation
        } else {
          // Transform이 없으면 기초 상태 사용: 상단 15%부터 시작, 가로 100%, 높이 70%
          const imageY = height * 0.15
          sprite.x = width * 0.5
          sprite.y = imageY + (height * 0.7) * 0.5
          sprite.width = width
          sprite.height = height * 0.7
          sprite.rotation = 0
        }

        container.addChild(sprite)
        spritesRef.current.set(sceneIndex, sprite)

        if (scene.text?.content) {
          const fontFamily = resolveSubtitleFontFamily(scene.text.font)
          const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
          
          // 텍스트 너비 계산 (Transform이 있으면 그 너비 사용, 없으면 기본값)
          let textWidth = width
          if (scene.text.transform?.width) {
            textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
          }

          // ||| 구분자 제거: 첫 번째 구간만 표시하거나 구분자를 공백으로 대체
          const textContent = scene.text.content
            .split(/\s*\|\|\|\s*/)
            .map((part) => part.trim())
            .filter((part) => part.length > 0)
          const displayText = textContent.length > 0 ? textContent[0] : scene.text.content

          // stroke를 포함한 스타일 객체 생성 (PixiJS v8)
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

          const text = new PIXI.Text({
            text: displayText,
            style: textStyle,
          })

          text.anchor.set(0.5, 0.5)
          text.visible = false
          text.alpha = 0

          // 텍스트 Transform 적용
          if (scene.text.transform) {
            const scaleX = scene.text.transform.scaleX ?? 1
            const scaleY = scene.text.transform.scaleY ?? 1
            text.x = scene.text.transform.x
            text.y = scene.text.transform.y
            text.scale.set(scaleX, scaleY)
            text.rotation = scene.text.transform.rotation

            // Transform이 있으면 wordWrapWidth도 업데이트
            if (text.style && scene.text.transform.width) {
              const baseWidth = scene.text.transform.width / scaleX
              text.style.wordWrapWidth = baseWidth
              text.text = text.text // 스타일 변경 적용
            }
          } else {
            // Transform이 없으면 자막 위치 설정 (top / center / bottom)
            const position = scene.text.position || 'bottom'
            const textY =
              position === 'top'
                ? height * 0.15
                : position === 'bottom'
                  ? height * 0.85
                  : height * 0.5
            text.x = width / 2
            text.y = textY
            text.scale.set(1, 1)
            text.rotation = 0
          }

          container.addChild(text)
          
          // 기존 텍스트 객체의 __debugId와 텍스트 내용을 복원
          const savedData = savedTextData.get(sceneIndex)
          if (savedData) {
            if (savedData.debugId && savedData.debugId.startsWith('text_')) {
              ;(text as PIXI.Text & { __debugId?: string }).__debugId = savedData.debugId
              // 수동 업데이트된 텍스트인 경우 텍스트 내용도 복원
              if (savedData.text && savedData.text !== '와 대박!') {
                text.text = savedData.text
              }
            }
          }
          textsRef.current.set(sceneIndex, text)

          // 밑줄 렌더링 (텍스트 자식으로 추가)
          const removeUnderline = () => {
            const underlineChildren = text.children.filter(
              (child) => child instanceof PIXI.Graphics && (child as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline
            )
            underlineChildren.forEach((child) => text.removeChild(child))
          }
          removeUnderline()
          if (scene.text.style?.underline) {
            requestAnimationFrame(() => {
              const underlineHeight = Math.max(2, (scene.text.fontSize || 80) * 0.05)
              const textColor = scene.text.color || '#ffffff'
              const colorValue = textColor.startsWith('#')
                ? parseInt(textColor.slice(1), 16)
                : 0xffffff

              const bounds = text.getLocalBounds()
              const underlineWidth = bounds.width || textWidth

              const underline = new PIXI.Graphics()
              ;(underline as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline = true

              const halfWidth = underlineWidth / 2
              const yPos = bounds.height / 2 + underlineHeight * 0.25 // 텍스트 하단 근처

              underline.lineStyle(underlineHeight, colorValue, 1)
              underline.moveTo(-halfWidth, yPos)
              underline.lineTo(halfWidth, yPos)
              underline.stroke()

              text.addChild(underline)
            })
          }
        }
      } catch (error) {
        console.error(`Failed to load scene ${sceneIndex}:`, error)
      }
    }

    await Promise.all(timeline.scenes.map((_, index) => loadScene(index)))

    // 렌더링 강제 실행
    requestAnimationFrame(() => {
      const sceneIndex = currentSceneIndexRef.current
      if (isSavingTransformRef.current) {
        const currentSprite = spritesRef.current.get(sceneIndex)
        const currentText = textsRef.current.get(sceneIndex)
        if (currentSprite) {
          currentSprite.visible = true
          currentSprite.alpha = 1
        }
        if (currentText) {
          currentText.visible = true
          currentText.alpha = 1
        }
        // 렌더링은 PixiJS ticker가 처리
      } else {
        // 구간이 있으면 첫 번째 구간만 표시, 없으면 전체 자막 표시
        const scene = timeline.scenes[sceneIndex]
        let partIndex: number | null = null
        if (scene?.text?.content) {
          const scriptParts = splitSubtitleByDelimiter(scene.text.content)
          if (scriptParts.length > 1) {
            // 구간이 있으면 첫 번째 구간(0)만 표시
            partIndex = 0
          } else {
            // 구간이 없으면 전체 자막 표시
            partIndex = null
          }
        }
        // skipAnimation 파라미터 제거: forceTransition === 'none'으로 처리
        updateCurrentScene(
          undefined,
          'none',
          undefined,
          false,
          partIndex !== null ? partIndex : undefined,
          sceneIndex
        )
      }
      // 렌더링은 PixiJS ticker가 처리

      if (onLoadComplete) {
        onLoadComplete(sceneIndex)
      }
    })
  }, [
    timeline,
    stageDimensions,
    updateCurrentScene,
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    isSavingTransformRef,
    loadPixiTextureWithCache,
    onLoadComplete,
  ])

  return {
    loadAllScenes,
  }
}

