/**
 * Transform 관리 훅
 * 이미지 및 텍스트 Transform 데이터를 저장하고 적용합니다.
 */

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import type { Transform } from '../types/common'

interface UseTransformManagerParams {
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
  isSavingTransformRef: React.MutableRefObject<boolean>
  isResizingRef: React.MutableRefObject<boolean>
  isResizingTextRef: React.MutableRefObject<boolean>
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

      const isResizing = isResizingRef.current

      let width: number
      let height: number
      let scaleX: number
      let scaleY: number

      let bounds: PIXI.Bounds
      try {
        bounds = sprite.getBounds()
      } catch {
        // getBounds 실패 시 종료
        return
      }

      width = bounds.width
      height = bounds.height
      scaleX = sprite.scale.x
      scaleY = sprite.scale.y

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

      const isResizing = isResizingTextRef.current

      let width: number
      let height: number
      let scaleX: number
      let scaleY: number
      let baseWidth: number
      let baseHeight: number

      if (text.destroyed) {
        return
      }

      let bounds: PIXI.Bounds
      try {
        bounds = text.getBounds()
      } catch {
        // getBounds 실패 시 종료
        return
      }

      const currentWordWrapWidth = text.style?.wordWrapWidth || bounds.width
      width = bounds.width
      height = bounds.height
      scaleX = 1
      scaleY = 1
      baseWidth = currentWordWrapWidth
      baseHeight = bounds.height

      const transform = {
        x: text.x,
        y: text.y,
        width,
        height,
        scaleX,
        scaleY,
        rotation: text.rotation,
        baseWidth,
        baseHeight,
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

