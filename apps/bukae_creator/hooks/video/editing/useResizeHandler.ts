/**
 * 리사이즈 핸들러 훅
 * 이미지 및 텍스트 리사이즈 로직을 처리합니다.
 */

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import type { ResizeHandle, Transform } from '../types/common'
import { getPixiCoordinates } from './utils'

interface UseResizeHandlerParams {
  appRef: React.RefObject<PIXI.Application | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  editHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  textEditHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  isResizingRef: React.MutableRefObject<boolean>
  isResizingTextRef: React.MutableRefObject<boolean>
  resizeHandleRef: React.MutableRefObject<ResizeHandle>
  originalTransformRef: React.MutableRefObject<Transform | null>
  resizeStartPosRef: React.MutableRefObject<{ x: number; y: number; handleX?: number; handleY?: number } | null>
}

/**
 * 리사이즈 핸들러 훅
 */
export function useResizeHandler({
  appRef,
  spritesRef,
  textsRef,
  editHandlesRef,
  textEditHandlesRef,
  isResizingRef,
  isResizingTextRef,
  resizeHandleRef,
  originalTransformRef,
  resizeStartPosRef,
}: UseResizeHandlerParams) {
  // 이미지 리사이즈 핸들러
  const handleResize = useCallback(
    (e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => {
      if (!isResizingRef.current || !resizeHandleRef.current || !originalTransformRef.current) return

      const sprite = spritesRef.current.get(sceneIndex)
      if (!sprite || !appRef.current) return

      let globalPos: { x: number; y: number }
      if (e instanceof MouseEvent) {
        globalPos = getPixiCoordinates(e, appRef.current)
      } else {
        const pixiEvent = e as PIXI.FederatedPointerEvent
        globalPos = pixiEvent.global
      }

      const handleType = resizeHandleRef.current
      const original = originalTransformRef.current

      let newWidth = original.width
      let newHeight = original.height
      let newX = original.x
      let newY = original.y

      const rightEdge = original.x + original.width
      const bottomEdge = original.y + original.height

      switch (handleType) {
        case 'nw':
          newWidth = rightEdge - globalPos.x
          newHeight = bottomEdge - globalPos.y
          newX = globalPos.x
          newY = globalPos.y
          break
        case 'n':
          newHeight = bottomEdge - globalPos.y
          newY = globalPos.y
          break
        case 'ne':
          newWidth = globalPos.x - original.x
          newHeight = bottomEdge - globalPos.y
          newY = globalPos.y
          break
        case 'e':
          newWidth = globalPos.x - original.x
          break
        case 'se':
          newWidth = globalPos.x - original.x
          newHeight = globalPos.y - original.y
          break
        case 's':
          newHeight = globalPos.y - original.y
          break
        case 'sw':
          newWidth = rightEdge - globalPos.x
          newHeight = globalPos.y - original.y
          newX = globalPos.x
          break
        case 'w':
          newWidth = rightEdge - globalPos.x
          newX = globalPos.x
          break
      }

      // 최소 크기 제한
      const minSize = 50
      if (newWidth < minSize) {
        newWidth = minSize
        if (handleType === 'nw' || handleType === 'w' || handleType === 'sw') {
          newX = original.x + original.width - minSize
        }
      }
      if (newHeight < minSize) {
        newHeight = minSize
        if (handleType === 'nw' || handleType === 'n' || handleType === 'ne') {
          newY = original.y + original.height - minSize
        }
      }

      // 스프라이트 업데이트
      const baseWidth = original.baseWidth || original.width / (original.scaleX || 1)
      const baseHeight = original.baseHeight || original.height / (original.scaleY || 1)
      const scaleX = newWidth / baseWidth
      const scaleY = newHeight / baseHeight

      sprite.scale.set(scaleX, scaleY)
      sprite.x = newX
      sprite.y = newY

      // 핸들 위치 및 경계선 업데이트
      const existingImageHandlesForResizeUpdate = editHandlesRef.current.get(sceneIndex)
      if (existingImageHandlesForResizeUpdate && sprite) {
        const bounds = sprite.getBounds()
        existingImageHandlesForResizeUpdate.children.forEach((child) => {
          if (child instanceof PIXI.Graphics) {
            if (child.label) {
              const handleType = child.label as ResizeHandle
              const handlePositions: Record<string, { x: number; y: number }> = {
                'nw': { x: bounds.x, y: bounds.y },
                'n': { x: bounds.x + bounds.width / 2, y: bounds.y },
                'ne': { x: bounds.x + bounds.width, y: bounds.y },
                'e': { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
                'se': { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
                's': { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
                'sw': { x: bounds.x, y: bounds.y + bounds.height },
                'w': { x: bounds.x, y: bounds.y + bounds.height / 2 },
              }
              const pos = handlePositions[handleType || '']
              if (pos) {
                child.x = pos.x
                child.y = pos.y
              }
            }
          }
        })
      }
    },
    [isResizingRef, resizeHandleRef, originalTransformRef, spritesRef, appRef, editHandlesRef]
  )

  // 텍스트 리사이즈 핸들러
  const handleTextResize = useCallback(
    (e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => {
      if (
        !isResizingTextRef.current ||
        !resizeHandleRef.current ||
        !originalTransformRef.current ||
        !resizeStartPosRef.current
      )
        return

      const text = textsRef.current.get(sceneIndex)
      if (!text || !appRef.current) return

      let globalPos: { x: number; y: number }
      if (e instanceof MouseEvent) {
        globalPos = getPixiCoordinates(e, appRef.current)
      } else {
        const pixiEvent = e as PIXI.FederatedPointerEvent
        globalPos = pixiEvent.global
      }

      const handleType = resizeHandleRef.current
      const original = originalTransformRef.current
      const startPos = resizeStartPosRef.current

      const deltaX = globalPos.x - startPos.x
      const deltaY = globalPos.y - startPos.y

      const left = original.left ?? original.x - original.width / 2
      const right = original.right ?? original.x + original.width / 2
      const top = original.top ?? original.y - original.height / 2
      const bottom = original.bottom ?? original.y + original.height / 2

      const currentHandleX = startPos.handleX! + deltaX
      const currentHandleY = startPos.handleY! + deltaY

      let newLeft = left
      let newRight = right
      let newTop = top
      let newBottom = bottom
      let newCenterX = original.x
      let newCenterY = original.y

      switch (handleType) {
        case 'nw':
          newLeft = currentHandleX
          newTop = currentHandleY
          newRight = right
          newBottom = bottom
          break
        case 'n':
          newTop = currentHandleY
          newBottom = bottom
          newLeft = left
          newRight = right
          break
        case 'ne':
          newRight = currentHandleX
          newTop = currentHandleY
          newLeft = left
          newBottom = bottom
          break
        case 'e':
          newRight = currentHandleX
          newLeft = left
          newTop = top
          newBottom = bottom
          break
        case 'se':
          newRight = currentHandleX
          newBottom = currentHandleY
          newLeft = left
          newTop = top
          break
        case 's':
          newBottom = currentHandleY
          newTop = top
          newLeft = left
          newRight = right
          break
        case 'sw':
          newLeft = currentHandleX
          newBottom = currentHandleY
          newRight = right
          newTop = top
          break
        case 'w':
          newLeft = currentHandleX
          newRight = right
          newTop = top
          newBottom = bottom
          break
      }

      let newWidth = newRight - newLeft
      let newHeight = newBottom - newTop
      newCenterX = (newLeft + newRight) / 2
      newCenterY = (newTop + newBottom) / 2

      const minSize = 20
      if (newWidth < minSize) {
        switch (handleType) {
          case 'nw':
          case 'w':
          case 'sw':
            newLeft = newRight - minSize
            break
          case 'ne':
          case 'e':
          case 'se':
            newRight = newLeft + minSize
            break
        }
        newWidth = minSize
      }
      if (newHeight < minSize) {
        switch (handleType) {
          case 'nw':
          case 'n':
          case 'ne':
            newTop = newBottom - minSize
            break
          case 'sw':
          case 's':
          case 'se':
            newBottom = newTop + minSize
            break
        }
        newHeight = minSize
      }

      newCenterX = (newLeft + newRight) / 2
      newCenterY = (newTop + newBottom) / 2

      const newWordWrapWidth = newWidth

      if (text.style) {
        const currentWordWrapWidth = text.style.wordWrapWidth || 0
        if (Math.abs(currentWordWrapWidth - newWordWrapWidth) > 1) {
          text.style.wordWrapWidth = newWordWrapWidth
          const originalText = text.text
          text.text = originalText
        }
      }

      text.scale.set(1, 1)
      text.x = newCenterX
      text.y = newCenterY

      // 핸들 위치 및 경계선 업데이트
      const existingHandles = textEditHandlesRef.current.get(sceneIndex)
      if (existingHandles && text) {
        const halfWidth = newWidth / 2
        const halfHeight = newHeight / 2
        const boundsX = newCenterX - halfWidth
        const boundsY = newCenterY - halfHeight

        existingHandles.children.forEach((child) => {
          if (child instanceof PIXI.Graphics) {
            if (child.label) {
              const handleType = child.label as ResizeHandle
              const handlePositions: Record<string, { x: number; y: number }> = {
                'nw': { x: boundsX, y: boundsY },
                'n': { x: boundsX + newWidth / 2, y: boundsY },
                'ne': { x: boundsX + newWidth, y: boundsY },
                'e': { x: boundsX + newWidth, y: boundsY + newHeight / 2 },
                'se': { x: boundsX + newWidth, y: boundsY + newHeight },
                's': { x: boundsX + newWidth / 2, y: boundsY + newHeight },
                'sw': { x: boundsX, y: boundsY + newHeight },
                'w': { x: boundsX, y: boundsY + newHeight / 2 },
              }
              const pos = handlePositions[handleType || '']
              if (pos) {
                child.x = pos.x
                child.y = pos.y
              }
            }
          }
        })
      }
    },
    [
      isResizingTextRef,
      resizeHandleRef,
      originalTransformRef,
      resizeStartPosRef,
      textsRef,
      appRef,
      textEditHandlesRef,
    ]
  )

  return {
    handleResize,
    handleTextResize,
  }
}

