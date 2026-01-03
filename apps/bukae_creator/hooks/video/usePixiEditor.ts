/**
 * Pixi Editor 통합 훅
 * 분리된 훅들을 조합하여 편집 기능을 제공합니다.
 */

import { useCallback, useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { useTransformManager } from './editing/useTransformManager'
import { useResizeHandler } from './editing/useResizeHandler'
import { getPixiCoordinates, isOutsideCanvas, resetToCenter } from './editing/utils'
import type { UsePixiEditorParams } from './types/editing'

/**
 * Pixi Editor 통합 훅
 * 분리된 훅들을 조합하여 편집 기능을 제공합니다.
 */
export const usePixiEditor = ({
  appRef,
  containerRef,
  spritesRef,
  textsRef,
  editHandlesRef,
  textEditHandlesRef,
  isDraggingRef,
  draggingElementRef,
  dragStartPosRef,
  isResizingRef,
  resizeHandleRef,
  resizeStartPosRef,
  isFirstResizeMoveRef,
  originalTransformRef,
  originalSpriteTransformRef,
  originalTextTransformRef,
  isResizingTextRef,
  isSavingTransformRef,
  clickedOnPixiElementRef,
  editMode,
  setEditMode,
  setSelectedElementIndex,
  setSelectedElementType,
  timeline,
  setTimeline,
  useFabricEditing,
  isPlayingRef,
}: UsePixiEditorParams) => {
  // 순환 참조를 피하기 위한 ref
  const drawEditHandlesRef = useRef<
    ((
      sprite: PIXI.Sprite,
      sceneIndex: number,
      handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void,
      saveImageTransform: (sceneIndex: number, sprite: PIXI.Sprite) => void
    ) => void) | null
  >(null)
  const drawTextEditHandlesRef = useRef<
    ((
      text: PIXI.Text,
      sceneIndex: number,
      handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void,
      saveTextTransform: (sceneIndex: number, text: PIXI.Text) => void
    ) => void) | null
  >(null)
  const handleResizeRef = useRef<((e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => void) | null>(
    null
  )
  const handleTextResizeRef = useRef<((e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => void) | null>(
    null
  )
  const saveImageTransformRef = useRef<((sceneIndex: number, sprite: PIXI.Sprite | null) => void) | null>(null)
  const saveTextTransformRef = useRef<((sceneIndex: number, text: PIXI.Text | null) => void) | null>(null)

  // useTransformManager: Transform 저장 및 적용
  const {
    saveImageTransform,
    saveAllImageTransforms,
    applyImageTransform,
    saveTextTransform,
    applyTextTransform,
  } = useTransformManager({
    timeline,
    setTimeline,
    isSavingTransformRef,
    isResizingRef,
    isResizingTextRef,
  })

  // useResizeHandler: 리사이즈 핸들러
  const { handleResize, handleTextResize } = useResizeHandler({
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
  })

  // ref 업데이트
  useEffect(() => {
    handleResizeRef.current = handleResize
  }, [handleResize])

  useEffect(() => {
    handleTextResizeRef.current = handleTextResize
  }, [handleTextResize])

  useEffect(() => {
    saveImageTransformRef.current = saveImageTransform
  }, [saveImageTransform])

  useEffect(() => {
    saveTextTransformRef.current = saveTextTransform
  }, [saveTextTransform])

  // 편집 핸들 그리기 (이미지)
  const drawEditHandles = useCallback(
    (
      sprite: PIXI.Sprite,
      sceneIndex: number,
      handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void,
      saveImageTransform: (sceneIndex: number, sprite: PIXI.Sprite) => void
    ) => {
      if (useFabricEditing) return
      if (isPlayingRef?.current) return
      if (!containerRef.current || !sprite) return

      const existingHandles = editHandlesRef.current.get(sceneIndex)
      if (existingHandles && existingHandles.parent) {
        existingHandles.parent.removeChild(existingHandles)
      }

      const handlesContainer = new PIXI.Container()
      handlesContainer.interactive = true

      const wasVisible = sprite.visible
      const wasAlpha = sprite.alpha
      if (!sprite.visible || sprite.alpha === 0) {
        sprite.visible = true
        sprite.alpha = 1
      }

      const bounds = sprite.getBounds()

      if (bounds.width === 0 || bounds.height === 0 || !isFinite(bounds.x) || !isFinite(bounds.y)) {
        sprite.visible = wasVisible
        sprite.alpha = wasAlpha
        return
      }

      const handleSize = 20
      const handleColor = 0x8b5cf6
      const handleBorderColor = 0xffffff

      const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' }> = [
        { x: bounds.x, y: bounds.y, type: 'nw' },
        { x: bounds.x + bounds.width / 2, y: bounds.y, type: 'n' },
        { x: bounds.x + bounds.width, y: bounds.y, type: 'ne' },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, type: 'e' },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height, type: 'se' },
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, type: 's' },
        { x: bounds.x, y: bounds.y + bounds.height, type: 'sw' },
        { x: bounds.x, y: bounds.y + bounds.height / 2, type: 'w' },
      ]

      handles.forEach((handle) => {
        const handleGraphics = new PIXI.Graphics()
        handleGraphics.clear()
        handleGraphics.rect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
        handleGraphics.fill({ color: handleColor, alpha: 1 })
        handleGraphics.setStrokeStyle({ color: handleBorderColor, width: 2, alpha: 1 })
        handleGraphics.stroke()
        handleGraphics.x = handle.x
        handleGraphics.y = handle.y
        handleGraphics.visible = true
        handleGraphics.alpha = 1
        handleGraphics.interactive = true
        handleGraphics.cursor = 'pointer'
        handleGraphics.label = handle.type

        handleGraphics.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
          e.stopPropagation()

          if (clickedOnPixiElementRef) {
            clickedOnPixiElementRef.current = true
          }

          isResizingRef.current = true
          resizeHandleRef.current = handle.type
          isFirstResizeMoveRef.current = true
          const sprite = spritesRef.current.get(sceneIndex)
          if (sprite && appRef.current) {
            const bounds = sprite.getBounds()
            const currentWidth = bounds.width
            const currentHeight = bounds.height
            const currentScaleX = sprite.scale.x
            const currentScaleY = sprite.scale.y
            const currentX = bounds.x
            const currentY = bounds.y
            const savedTransform = timeline?.scenes[sceneIndex]?.imageTransform
            const baseWidth = savedTransform?.baseWidth || currentWidth / (currentScaleX || 1)
            const baseHeight = savedTransform?.baseHeight || currentHeight / (currentScaleY || 1)

            originalTransformRef.current = {
              x: currentX,
              y: currentY,
              width: currentWidth,
              height: currentHeight,
              scaleX: currentScaleX,
              scaleY: currentScaleY,
              rotation: sprite.rotation,
              baseWidth,
              baseHeight,
            }
            resizeStartPosRef.current = {
              x: e.global.x,
              y: e.global.y,
            }
          }
          setSelectedElementIndex(sceneIndex)
          setSelectedElementType('image')
        })

        const handleGlobalMove = (e: MouseEvent) => {
          if (
            isResizingRef.current &&
            resizeHandleRef.current === handle.type &&
            appRef.current &&
            resizeStartPosRef.current
          ) {
            const globalPos = getPixiCoordinates(e, appRef.current)

            if (isFirstResizeMoveRef.current) {
              const dx = Math.abs(globalPos.x - resizeStartPosRef.current.x)
              const dy = Math.abs(globalPos.y - resizeStartPosRef.current.y)
              if (dx < 3 && dy < 3) {
                return
              }
              isFirstResizeMoveRef.current = false
            }

            const pixiEvent = {
              global: globalPos,
            } as PIXI.FederatedPointerEvent
            handleResize(pixiEvent, sceneIndex)
          }
        }

        const handleGlobalUp = () => {
          if (isResizingRef.current && resizeHandleRef.current === handle.type) {
            isResizingRef.current = false
            const currentHandleType = resizeHandleRef.current
            resizeHandleRef.current = null
            resizeStartPosRef.current = null
            isFirstResizeMoveRef.current = true
            document.removeEventListener('mousemove', handleGlobalMove)
            document.removeEventListener('mouseup', handleGlobalUp)

            const currentSprite = spritesRef.current.get(sceneIndex)
            if (currentSprite && currentHandleType) {
              if (isOutsideCanvas(currentSprite)) {
                resetToCenter(currentSprite, sceneIndex, timeline, setTimeline, false)
              } else {
                const bounds = currentSprite.getBounds()
                const finalTransform = {
                  x: currentSprite.x,
                  y: currentSprite.y,
                  width: bounds.width,
                  height: bounds.height,
                  scaleX: currentSprite.scale.x,
                  scaleY: currentSprite.scale.y,
                  rotation: currentSprite.rotation,
                }

                originalSpriteTransformRef.current.set(sceneIndex, finalTransform)
                saveImageTransform(sceneIndex, currentSprite)

                setTimeout(() => {
                  const sprite = spritesRef.current.get(sceneIndex)
                  if (
                    sprite &&
                    editMode === 'image' &&
                    drawEditHandlesRef.current &&
                    handleResizeRef.current &&
                    saveImageTransformRef.current
                  ) {
                    drawEditHandlesRef.current(sprite, sceneIndex, handleResizeRef.current, saveImageTransformRef.current)
                  }
                }, 200)
              }
            }
          }
        }

        handleGraphics.on('pointerdown', () => {
          document.addEventListener('mousemove', handleGlobalMove)
          document.addEventListener('mouseup', handleGlobalUp)
        })

        handlesContainer.addChild(handleGraphics)
      })

      if (!containerRef.current) {
        return
      }

      const existingImageHandles2 = editHandlesRef.current.get(sceneIndex)
      if (existingImageHandles2 && existingImageHandles2.parent) {
        existingImageHandles2.parent.removeChild(existingImageHandles2)
      }

      containerRef.current.addChild(handlesContainer)
      editHandlesRef.current.set(sceneIndex, handlesContainer)

      handlesContainer.visible = true
      handlesContainer.alpha = 1

      const moveToTop = () => {
        if (handlesContainer.parent && containerRef.current) {
          const maxIndex = containerRef.current.children.length - 1
          containerRef.current.setChildIndex(handlesContainer, maxIndex)
        }
      }
      moveToTop()

      if (appRef.current && appRef.current.ticker) {
        appRef.current.render()
      }

      if (appRef.current && appRef.current.ticker) {
        const keepOnTop = () => {
          if (handlesContainer.parent && containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(handlesContainer)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(handlesContainer, maxIndex)
            }
          }
        }
        appRef.current.ticker.add(keepOnTop)
      }
    },
    [
      useFabricEditing,
      isPlayingRef,
      containerRef,
      editHandlesRef,
      spritesRef,
      appRef,
      isResizingRef,
      resizeHandleRef,
      isFirstResizeMoveRef,
      originalTransformRef,
      originalSpriteTransformRef,
      resizeStartPosRef,
      clickedOnPixiElementRef,
      editMode,
      setSelectedElementIndex,
      setSelectedElementType,
      timeline,
      setTimeline,
    ]
  )

  // 편집 핸들 그리기 (텍스트) - 기본 구조만 구현
  const drawTextEditHandles = useCallback(
    (
      text: PIXI.Text,
      sceneIndex: number,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _saveTextTransform: (sceneIndex: number, text: PIXI.Text) => void
    ) => {
      if (useFabricEditing) return
      if (isPlayingRef?.current) return
      if (!containerRef.current || !text) return

      const existingHandles = textEditHandlesRef.current.get(sceneIndex)
      if (existingHandles && existingHandles.parent) {
        existingHandles.parent.removeChild(existingHandles)
      }

      const handlesContainer = new PIXI.Container()
      handlesContainer.interactive = true

      const wasVisible = text.visible
      const wasAlpha = text.alpha
      if (!text.visible || text.alpha === 0) {
        text.visible = true
        text.alpha = 1
      }

      const bounds = text.getBounds()

      if (bounds.width === 0 || bounds.height === 0 || !isFinite(bounds.x) || !isFinite(bounds.y)) {
        text.visible = wasVisible
        text.alpha = wasAlpha
        return
      }

      const handleSize = 16
      const handleColor = 0x8b5cf6
      const handleBorderColor = 0xffffff

      const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' }> = [
        { x: bounds.x, y: bounds.y, type: 'nw' },
        { x: bounds.x + bounds.width / 2, y: bounds.y, type: 'n' },
        { x: bounds.x + bounds.width, y: bounds.y, type: 'ne' },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, type: 'e' },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height, type: 'se' },
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, type: 's' },
        { x: bounds.x, y: bounds.y + bounds.height, type: 'sw' },
        { x: bounds.x, y: bounds.y + bounds.height / 2, type: 'w' },
      ]

      handles.forEach((handle) => {
        const handleGraphics = new PIXI.Graphics()
        handleGraphics.clear()
        handleGraphics.rect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
        handleGraphics.fill({ color: handleColor, alpha: 1 })
        handleGraphics.setStrokeStyle({ color: handleBorderColor, width: 2, alpha: 1 })
        handleGraphics.stroke()
        handleGraphics.x = handle.x
        handleGraphics.y = handle.y
        handleGraphics.visible = true
        handleGraphics.alpha = 1
        handleGraphics.interactive = true
        handleGraphics.cursor = 'pointer'
        handleGraphics.label = handle.type

        handleGraphics.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
          e.stopPropagation()

          if (clickedOnPixiElementRef) {
            clickedOnPixiElementRef.current = true
          }

          isResizingTextRef.current = true
          resizeHandleRef.current = handle.type
          isFirstResizeMoveRef.current = true
          const text = textsRef.current.get(sceneIndex)
          if (text && appRef.current) {
            const bounds = text.getBounds()
            const centerX = text.x
            const centerY = text.y
            const currentWordWrapWidth = text.style?.wordWrapWidth || bounds.width
            const baseWidth = currentWordWrapWidth
            const baseHeight = bounds.height

            const halfWidth = bounds.width / 2
            const halfHeight = bounds.height / 2
            const boundsLeft = centerX - halfWidth
            const boundsTop = centerY - halfHeight
            const boundsRight = centerX + halfWidth
            const boundsBottom = centerY + halfHeight

            let startHandleX = 0
            let startHandleY = 0
            switch (handle.type) {
              case 'nw':
                startHandleX = boundsLeft
                startHandleY = boundsTop
                break
              case 'n':
                startHandleX = centerX
                startHandleY = boundsTop
                break
              case 'ne':
                startHandleX = boundsRight
                startHandleY = boundsTop
                break
              case 'e':
                startHandleX = boundsRight
                startHandleY = centerY
                break
              case 'se':
                startHandleX = boundsRight
                startHandleY = boundsBottom
                break
              case 's':
                startHandleX = centerX
                startHandleY = boundsBottom
                break
              case 'sw':
                startHandleX = boundsLeft
                startHandleY = boundsBottom
                break
              case 'w':
                startHandleX = boundsLeft
                startHandleY = centerY
                break
            }

            originalTransformRef.current = {
              x: centerX,
              y: centerY,
              width: bounds.width,
              height: bounds.height,
              scaleX: 1,
              scaleY: 1,
              rotation: text.rotation,
              baseWidth,
              baseHeight,
              left: centerX - halfWidth,
              right: centerX + halfWidth,
              top: centerY - halfHeight,
              bottom: centerY + halfHeight,
            }

            resizeStartPosRef.current = {
              x: e.global.x,
              y: e.global.y,
              handleX: startHandleX,
              handleY: startHandleY,
            }
          }
          setSelectedElementIndex(sceneIndex)
          setSelectedElementType('text')
        })

        const handleGlobalMove = (e: MouseEvent) => {
          if (
            isResizingTextRef.current &&
            resizeHandleRef.current === handle.type &&
            appRef.current &&
            resizeStartPosRef.current
          ) {
            const globalPos = getPixiCoordinates(e, appRef.current)

            if (isFirstResizeMoveRef.current) {
              const dx = Math.abs(globalPos.x - resizeStartPosRef.current.x)
              const dy = Math.abs(globalPos.y - resizeStartPosRef.current.y)
              if (dx < 3 && dy < 3) {
                return
              }
              isFirstResizeMoveRef.current = false
            }

            const pixiEvent = {
              global: globalPos,
            } as PIXI.FederatedPointerEvent
            handleTextResize(pixiEvent, sceneIndex)
          }
        }

        const handleGlobalUp = () => {
          if (isResizingTextRef.current && resizeHandleRef.current === handle.type) {
            isResizingTextRef.current = false
            const currentHandleType = resizeHandleRef.current
            resizeHandleRef.current = null
            resizeStartPosRef.current = null
            isFirstResizeMoveRef.current = true
            document.removeEventListener('mousemove', handleGlobalMove)
            document.removeEventListener('mouseup', handleGlobalUp)

            const currentText = textsRef.current.get(sceneIndex)
            if (currentText && currentHandleType) {
              if (isOutsideCanvas(currentText)) {
                resetToCenter(currentText, sceneIndex, timeline, setTimeline, true)
              } else {
                const bounds = currentText.getBounds()
                const currentWordWrapWidth = currentText.style?.wordWrapWidth || bounds.width
                const finalTransform = {
                  x: currentText.x,
                  y: currentText.y,
                  width: bounds.width,
                  height: bounds.height,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: currentText.rotation,
                  baseWidth: currentWordWrapWidth,
                  baseHeight: bounds.height,
                }

                originalTextTransformRef.current.set(sceneIndex, finalTransform)
                // saveTextTransform은 ref를 통해 접근
                if (saveTextTransformRef.current) {
                  saveTextTransformRef.current(sceneIndex, currentText)
                }

                setTimeout(() => {
                  const text = textsRef.current.get(sceneIndex)
                  if (
                    text &&
                    editMode === 'text' &&
                    drawTextEditHandlesRef.current &&
                    handleTextResizeRef.current &&
                    saveTextTransformRef.current
                  ) {
                    drawTextEditHandlesRef.current(text, sceneIndex, handleTextResizeRef.current, saveTextTransformRef.current)
                  }
                }, 200)
              }
            }
          }
        }

        handleGraphics.on('pointerdown', () => {
          document.addEventListener('mousemove', handleGlobalMove)
          document.addEventListener('mouseup', handleGlobalUp)
        })

        handlesContainer.addChild(handleGraphics)
      })

      if (!containerRef.current) {
        return
      }

      const existingTextHandles2 = textEditHandlesRef.current.get(sceneIndex)
      if (existingTextHandles2 && existingTextHandles2.parent) {
        existingTextHandles2.parent.removeChild(existingTextHandles2)
      }

      containerRef.current.addChild(handlesContainer)
      textEditHandlesRef.current.set(sceneIndex, handlesContainer)

      handlesContainer.visible = true
      handlesContainer.alpha = 1

      const moveToTop = () => {
        if (handlesContainer.parent && containerRef.current) {
          const maxIndex = containerRef.current.children.length - 1
          containerRef.current.setChildIndex(handlesContainer, maxIndex)
        }
      }
      moveToTop()

      if (appRef.current && appRef.current.ticker) {
        appRef.current.render()
      }

      if (appRef.current && appRef.current.ticker) {
        const keepOnTop = () => {
          if (handlesContainer.parent && containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(handlesContainer)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(handlesContainer, maxIndex)
            }
          }
        }
        appRef.current.ticker.add(keepOnTop)
      }
    },
    [
      useFabricEditing,
      isPlayingRef,
      containerRef,
      textEditHandlesRef,
      textsRef,
      appRef,
      isResizingTextRef,
      resizeHandleRef,
      isFirstResizeMoveRef,
      originalTransformRef,
      originalTextTransformRef,
      resizeStartPosRef,
      clickedOnPixiElementRef,
      editMode,
      setSelectedElementIndex,
      setSelectedElementType,
      timeline,
      setTimeline,
      handleTextResize,
    ]
  )

  // ref 업데이트
  useEffect(() => {
    drawEditHandlesRef.current = drawEditHandles
  }, [drawEditHandles])

  useEffect(() => {
    drawTextEditHandlesRef.current = drawTextEditHandles
  }, [drawTextEditHandles])

  // 스프라이트 드래그 설정
  const setupSpriteDrag = useCallback(
    (sprite: PIXI.Sprite, sceneIndex: number) => {
      if (!sprite) {
        return
      }

      sprite.off('pointerdown')
      sprite.off('pointermove')
      sprite.off('pointerup')
      sprite.off('pointerupoutside')

      if (!sprite.visible || sprite.alpha === 0) {
        sprite.interactive = false
        return
      }

      sprite.interactive = true
      sprite.cursor = !useFabricEditing ? 'pointer' : 'default'

      if (!useFabricEditing) {
        sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
          e.stopPropagation()

          if (clickedOnPixiElementRef) {
            clickedOnPixiElementRef.current = true
          }

          const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
          if (existingTextHandles && existingTextHandles.parent) {
            existingTextHandles.parent.removeChild(existingTextHandles)
            textEditHandlesRef.current.delete(sceneIndex)
          }

          setSelectedElementIndex(sceneIndex)
          setSelectedElementType('image')
          setEditMode('image')
          drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)

          isDraggingRef.current = true
          draggingElementRef.current = 'image'
          const globalPos = e.global
          dragStartPosRef.current = {
            x: globalPos.x - sprite.x,
            y: globalPos.y - sprite.y,
          }
          if (!originalSpriteTransformRef.current.has(sceneIndex)) {
            const scene = timeline?.scenes[sceneIndex]
            if (scene?.imageTransform) {
              originalSpriteTransformRef.current.set(sceneIndex, scene.imageTransform)
            } else {
              originalSpriteTransformRef.current.set(sceneIndex, {
                x: sprite.x,
                y: sprite.y,
                width: sprite.width,
                height: sprite.height,
                scaleX: sprite.scale.x,
                scaleY: sprite.scale.y,
                rotation: sprite.rotation,
              })
            }
          }

          let hasMoved = false
          const handleGlobalMove = (e: MouseEvent) => {
            if (isDraggingRef.current && draggingElementRef.current === 'image' && !isResizingRef.current && appRef.current) {
              hasMoved = true
              const currentSprite = spritesRef.current.get(sceneIndex)
              if (!currentSprite) {
                isDraggingRef.current = false
                draggingElementRef.current = null
                document.removeEventListener('mousemove', handleGlobalMove)
                document.removeEventListener('mouseup', handleGlobalUp)
                return
              }
              const globalPos = getPixiCoordinates(e, appRef.current)
              currentSprite.x = globalPos.x - dragStartPosRef.current.x
              currentSprite.y = globalPos.y - dragStartPosRef.current.y

              const existingImageHandlesForDrag = editHandlesRef.current.get(sceneIndex)
              if (existingImageHandlesForDrag) {
                const bounds = currentSprite.getBounds()
                existingImageHandlesForDrag.children.forEach((child, index) => {
                  if (child instanceof PIXI.Graphics && child.name) {
                    const handleType = child.name as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
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
                    const pos = handlePositions[handleType]
                    if (pos) {
                      child.x = pos.x
                      child.y = pos.y
                    }
                  } else if (child instanceof PIXI.Graphics && index === existingImageHandlesForDrag.children.length - 1) {
                    child.clear()
                    child.setStrokeStyle({ color: 0x8b5cf6, width: 2, alpha: 1 })
                    child.rect(bounds.x, bounds.y, bounds.width, bounds.height)
                  }
                })
              } else {
                drawEditHandles(currentSprite, sceneIndex, handleResize, saveImageTransform)
              }
            }
          }

          const handleGlobalUp = () => {
            if (isDraggingRef.current && draggingElementRef.current === 'image') {
              isDraggingRef.current = false
              draggingElementRef.current = null
              const currentSprite = spritesRef.current.get(sceneIndex)
              if (currentSprite) {
                if (isOutsideCanvas(currentSprite)) {
                  resetToCenter(currentSprite, sceneIndex, timeline, setTimeline, false)
                  setTimeout(() => {
                    const sprite = spritesRef.current.get(sceneIndex)
                    if (sprite) {
                      drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)
                    }
                  }, 100)
                } else {
                  if (hasMoved) {
                    saveImageTransform(sceneIndex, currentSprite)
                  }
                  drawEditHandles(currentSprite, sceneIndex, handleResize, saveImageTransform)
                }
              }
              document.removeEventListener('mousemove', handleGlobalMove)
              document.removeEventListener('mouseup', handleGlobalUp)
            }
          }

          document.addEventListener('mousemove', handleGlobalMove)
          document.addEventListener('mouseup', handleGlobalUp)
        })

        sprite.on('pointerup', () => {})
        sprite.on('pointerupoutside', () => {})
      }
    },
    [
      useFabricEditing,
      drawEditHandles,
      saveImageTransform,
      handleResize,
      isDraggingRef,
      dragStartPosRef,
      originalSpriteTransformRef,
      setSelectedElementIndex,
      setSelectedElementType,
      isResizingRef,
      appRef,
      spritesRef,
      setEditMode,
      draggingElementRef,
      editHandlesRef,
      textEditHandlesRef,
      clickedOnPixiElementRef,
      timeline,
      setTimeline,
    ]
  )

  // 텍스트 드래그 설정
  const setupTextDrag = useCallback(
    (text: PIXI.Text, sceneIndex: number) => {
      if (!text) {
        return
      }

      text.off('pointerdown')
      text.off('pointermove')
      text.off('pointerup')
      text.off('pointerupoutside')

      if (!text.visible || text.alpha === 0) {
        text.interactive = false
        return
      }

      text.interactive = true
      text.cursor = !useFabricEditing ? 'pointer' : 'default'

      if (!useFabricEditing) {
        text.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
          if (clickedOnPixiElementRef) {
            clickedOnPixiElementRef.current = true
          }

          const existingHandles = editHandlesRef.current.get(sceneIndex)
          if (existingHandles && existingHandles.parent) {
            existingHandles.parent.removeChild(existingHandles)
            editHandlesRef.current.delete(sceneIndex)
          }

          setSelectedElementIndex(sceneIndex)
          setSelectedElementType('text')
          setEditMode('text')
          drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)

          isDraggingRef.current = true
          draggingElementRef.current = 'text'
          const globalPos = e.global
          dragStartPosRef.current = {
            x: globalPos.x - text.x,
            y: globalPos.y - text.y,
          }
          if (!originalTextTransformRef.current.has(sceneIndex)) {
            const scene = timeline?.scenes[sceneIndex]
            if (scene?.text?.transform) {
              const transform = scene.text.transform
              originalTextTransformRef.current.set(sceneIndex, {
                ...transform,
                scaleX: transform.scaleX ?? 1,
                scaleY: transform.scaleY ?? 1,
              })
            } else {
              originalTextTransformRef.current.set(sceneIndex, {
                x: text.x,
                y: text.y,
                width: text.width * text.scale.x,
                height: text.height * text.scale.y,
                scaleX: text.scale.x,
                scaleY: text.scale.y,
                rotation: text.rotation,
              })
            }
          }

          let hasMoved = false
          const handleGlobalMove = (e: MouseEvent) => {
            if (isDraggingRef.current && draggingElementRef.current === 'text' && !isResizingTextRef.current && appRef.current) {
              hasMoved = true
              const currentText = textsRef.current.get(sceneIndex)
              if (!currentText) {
                isDraggingRef.current = false
                draggingElementRef.current = null
                document.removeEventListener('mousemove', handleGlobalMove)
                document.removeEventListener('mouseup', handleGlobalUp)
                return
              }
              const globalPos = getPixiCoordinates(e, appRef.current)
              currentText.x = globalPos.x - dragStartPosRef.current.x
              currentText.y = globalPos.y - dragStartPosRef.current.y

              const existingTextHandlesForDrag = textEditHandlesRef.current.get(sceneIndex)
              if (existingTextHandlesForDrag) {
                const bounds = currentText.getBounds()
                existingTextHandlesForDrag.children.forEach((child, index) => {
                  if (child instanceof PIXI.Graphics && child.name) {
                    const handleType = child.name as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
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
                    const pos = handlePositions[handleType]
                    if (pos) {
                      child.x = pos.x
                      child.y = pos.y
                    }
                  } else if (child instanceof PIXI.Graphics && index === existingTextHandlesForDrag.children.length - 1) {
                    child.clear()
                    child.setStrokeStyle({ color: 0x8b5cf6, width: 2, alpha: 1 })
                    child.rect(bounds.x, bounds.y, bounds.width, bounds.height)
                  }
                })
              } else {
                drawTextEditHandles(currentText, sceneIndex, handleTextResize, saveTextTransform)
              }
            }
          }

          const handleGlobalUp = () => {
            if (isDraggingRef.current && draggingElementRef.current === 'text') {
              isDraggingRef.current = false
              draggingElementRef.current = null
              const currentText = textsRef.current.get(sceneIndex)
              if (currentText) {
                if (isOutsideCanvas(currentText)) {
                  resetToCenter(currentText, sceneIndex, timeline, setTimeline, true)
                  setTimeout(() => {
                    const text = textsRef.current.get(sceneIndex)
                    if (text) {
                      drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)
                    }
                  }, 100)
                } else {
                  if (hasMoved) {
                    saveTextTransform(sceneIndex, currentText)
                  }
                  drawTextEditHandles(currentText, sceneIndex, handleTextResize, saveTextTransform)
                }
              }
              document.removeEventListener('mousemove', handleGlobalMove)
              document.removeEventListener('mouseup', handleGlobalUp)
            }
          }

          document.addEventListener('mousemove', handleGlobalMove)
          document.addEventListener('mouseup', handleGlobalUp)
        })

        text.on('pointerup', () => {})
        text.on('pointerupoutside', () => {})
      }
    },
    [
      useFabricEditing,
      drawTextEditHandles,
      saveTextTransform,
      handleTextResize,
      isDraggingRef,
      dragStartPosRef,
      originalTextTransformRef,
      setSelectedElementIndex,
      setSelectedElementType,
      isResizingTextRef,
      appRef,
      textsRef,
      setEditMode,
      draggingElementRef,
      textEditHandlesRef,
      editHandlesRef,
      clickedOnPixiElementRef,
      timeline,
      setTimeline,
    ]
  )

  return {
    drawEditHandles,
    saveImageTransform,
    saveAllImageTransforms,
    handleResize,
    setupSpriteDrag,
    applyImageTransform,
    saveTextTransform,
    applyTextTransform,
    handleTextResize,
    drawTextEditHandles,
    setupTextDrag,
  }
}
