/**
 * Transform 관리 훅
 * 이미지 및 텍스트 Transform 데이터를 저장하고 적용합니다.
 */

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import type { Transform as _Transform } from '../types/common'

interface UseTransformManagerParams {
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
  isSavingTransformRef: React.MutableRefObject<boolean>
  isResizingRef: React.MutableRefObject<boolean>
  isResizingTextRef: React.MutableRefObject<boolean>
}

type HorizontalAlign = 'left' | 'center' | 'right'

function normalizeHorizontalAlign(value?: string): HorizontalAlign {
  if (value === 'left' || value === 'right' || value === 'center') {
    return value
  }
  return 'center'
}

/**
 * Transform 관리 훅
 */
export function useTransformManager({
  timeline,
  setTimeline,
  isSavingTransformRef,
  isResizingRef,
  isResizingTextRef,
}: UseTransformManagerParams) {
  // 이미지 Transform 데이터 저장 (단일 씬)
  const saveImageTransform = useCallback(
    (sceneIndex: number, sprite: PIXI.Sprite | null) => {
      if (!timeline || !sprite) {
        return
      }

      if (!sprite.parent) {
        return
      }

      if (sprite.destroyed) {
        return
      }

      if (isResizingRef.current) return

      let bounds: PIXI.Bounds
      try {
        bounds = sprite.getBounds()
      } catch {
        // getBounds 실패 시 종료
        return
      }

      const width = bounds.width
      const height = bounds.height
      const scaleX = sprite.scale.x
      const scaleY = sprite.scale.y

      const transform = {
        x: sprite.x,
        y: sprite.y,
        width,
        height,
        scaleX,
        scaleY,
        rotation: sprite.rotation,
      }

      isSavingTransformRef.current = true

      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => {
          if (i === sceneIndex) {
            return {
              ...scene,
              imageTransform: transform,
            }
          }
          return scene
        }),
      }
      setTimeline(nextTimeline)

      setTimeout(() => {
        isSavingTransformRef.current = false
      }, 100)
    },
    [timeline, setTimeline, isSavingTransformRef, isResizingRef]
  )

  // 모든 Transform 데이터 일괄 저장
  const saveAllImageTransforms = useCallback(
    (
      transforms: Map<
        number,
        { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }
      >
    ) => {
      if (!timeline || transforms.size === 0) return

      isSavingTransformRef.current = true

      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => {
          if (transforms.has(i)) {
            const transform = transforms.get(i)!
            return {
              ...scene,
              imageTransform: transform,
            }
          }
          return scene
        }),
      }
      setTimeline(nextTimeline)

      setTimeout(() => {
        isSavingTransformRef.current = false
      }, 100)
    },
    [timeline, setTimeline, isSavingTransformRef]
  )

  // 이미지 Transform 데이터 적용
  const applyImageTransform = useCallback(
    (sprite: PIXI.Sprite | null, transform?: TimelineScene['imageTransform']) => {
      if (!transform || !sprite) return

      if (!sprite.parent) {
        return
      }

      sprite.x = transform.x
      sprite.y = transform.y
      sprite.width = transform.width
      sprite.height = transform.height
      sprite.rotation = transform.rotation
    },
    []
  )

  // 텍스트 Transform 데이터 저장
  const saveTextTransform = useCallback(
    (sceneIndex: number, text: PIXI.Text | null) => {
      if (!timeline || !text) {
        return
      }

      if (!text.parent) {
        return
      }

      if (isResizingTextRef.current) return

      if (text.destroyed) {
        return
      }

      // 리사이즈 후 텍스트가 리렌더링되도록 강제
      // wordWrapWidth 변경 후 텍스트를 다시 설정하여 리렌더링 트리거
      const currentWordWrapWidth = text.style?.wordWrapWidth
      if (currentWordWrapWidth && currentWordWrapWidth > 0) {
        // 스타일이 변경되었을 수 있으므로 텍스트를 다시 설정하여 리렌더링
        const originalText = text.text
        text.text = originalText || ''
      }

      // PIXI.js가 텍스트를 리렌더링할 시간을 주기 위해 requestAnimationFrame 사용
      // 하지만 동기적으로 처리해야 하므로, getBounds()를 여러 번 호출하여 안정화
      let bounds: PIXI.Bounds
      try {
        // 첫 번째 호출로 리렌더링 트리거
        bounds = text.getBounds()
        // 두 번째 호출로 안정화된 크기 가져오기
        bounds = text.getBounds()
      } catch {
        // getBounds 실패 시 종료
        return
      }

      const finalWordWrapWidth = text.style?.wordWrapWidth || bounds.width
      const width = bounds.width
      const height = bounds.height
      const scaleX = text.scale.x
      const scaleY = text.scale.y
      const sceneText = timeline.scenes[sceneIndex]?.text
      const existingTransform = sceneText?.transform
      const hAlign = normalizeHorizontalAlign(
        existingTransform?.hAlign ?? sceneText?.style?.align ?? 'center'
      )
      const boxWidth = finalWordWrapWidth > 0
        ? finalWordWrapWidth
        : (existingTransform?.width && existingTransform.width > 0 ? existingTransform.width : width)
      const boxHeight = existingTransform?.height && existingTransform.height > 0
        ? existingTransform.height
        : height
      const baseWidth = boxWidth
      const baseHeight = bounds.height

      // Pixi 텍스트 좌표(text.x, text.y)는 top-left 기준이므로
      // Timeline transform(앵커 중심점)으로 역변환해서 저장한다.
      const textX = text.x
      const textY = text.y
      const centerX =
        hAlign === 'left'
          ? textX + boxWidth / 2
          : hAlign === 'right'
            ? textX - boxWidth / 2 + width
            : textX + width / 2
      const centerY = textY + height / 2
      const anchor = existingTransform?.anchor ?? { x: 0.5, y: 0.5 }
      const vAlign = existingTransform?.vAlign ?? 'middle'
      
      const transform = {
        x: centerX,
        y: centerY,
        width: boxWidth,
        height: boxHeight,
        scaleX,
        scaleY,
        rotation: text.rotation,
        baseWidth,
        baseHeight,
        anchor: {
          x: anchor.x ?? 0.5,
          y: anchor.y ?? 0.5,
        },
        hAlign,
        vAlign,
      }

      isSavingTransformRef.current = true

      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => {
          if (i === sceneIndex) {
            return {
              ...scene,
              text: {
                ...scene.text,
                transform,
              },
            }
          }
          return scene
        }),
      }
      setTimeline(nextTimeline)

      setTimeout(() => {
        isSavingTransformRef.current = false
      }, 100)
    },
    [timeline, setTimeline, isSavingTransformRef, isResizingTextRef]
  )

  // 텍스트 Transform 데이터 적용
  const applyTextTransform = useCallback(
    (text: PIXI.Text | null, transform?: TimelineScene['text']['transform']) => {
      if (!transform || !text) return

      if (!text.parent) {
        return
      }

      text.x = transform.x
      text.y = transform.y
      text.scale.set(1, 1)
      text.rotation = transform.rotation

      if (text.style) {
        const wordWrapWidth = transform.baseWidth ?? transform.width ?? 0
        if (wordWrapWidth > 0) {
          text.style.wordWrapWidth = wordWrapWidth
          // text.text가 null이 되지 않도록 보장
          text.text = text.text || ''
        }
      }
    },
    []
  )

  return {
    saveImageTransform,
    saveAllImageTransforms,
    applyImageTransform,
    saveTextTransform,
    applyTextTransform,
  }
}
