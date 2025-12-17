import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'

interface UsePixiEditorParams {
  // Refs
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  editHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  textEditHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  isDraggingRef: React.MutableRefObject<boolean>
  draggingElementRef: React.MutableRefObject<'image' | 'text' | null> // 현재 드래그 중인 요소 타입
  dragStartPosRef: React.MutableRefObject<{ x: number; y: number; boundsWidth?: number; boundsHeight?: number }>
  isResizingRef: React.MutableRefObject<boolean>
  resizeHandleRef: React.MutableRefObject<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>
  resizeStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>
  isFirstResizeMoveRef: React.MutableRefObject<boolean>
  originalTransformRef: React.MutableRefObject<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number; baseWidth?: number; baseHeight?: number } | null>
  originalSpriteTransformRef: React.MutableRefObject<Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>>
  originalTextTransformRef: React.MutableRefObject<Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>>
  isResizingTextRef: React.MutableRefObject<boolean>
  currentSceneIndexRef: React.MutableRefObject<number>
  isSavingTransformRef: React.MutableRefObject<boolean>
  
  // State
  editMode: 'none' | 'image' | 'text'
  setEditMode: (mode: 'none' | 'image' | 'text') => void
  selectedElementIndex: number | null
  setSelectedElementIndex: (index: number | null) => void
  selectedElementType: 'image' | 'text' | null
  setSelectedElementType: (type: 'image' | 'text' | null) => void
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
  useFabricEditing: boolean
}

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
  currentSceneIndexRef,
  isSavingTransformRef,
  editMode,
  setEditMode,
  selectedElementIndex,
  setSelectedElementIndex,
  selectedElementType,
  setSelectedElementType,
  timeline,
  setTimeline,
  useFabricEditing,
}: UsePixiEditorParams) => {
  // 편집 핸들 그리기
  const drawEditHandles = useCallback((sprite: PIXI.Sprite, sceneIndex: number, handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void, saveImageTransform: (sceneIndex: number, sprite: PIXI.Sprite) => void) => {
    if (useFabricEditing) return
    if (!containerRef.current || !sprite) return

    // 기존 핸들 제거
    const existingHandles = editHandlesRef.current.get(sceneIndex)
    if (existingHandles && existingHandles.parent) {
      existingHandles.parent.removeChild(existingHandles)
    }

    const handlesContainer = new PIXI.Container()
    handlesContainer.interactive = true

    // 스프라이트의 경계 박스 계산
    const bounds = sprite.getBounds()
    const handleSize = 20
    const handleColor = 0x8b5cf6
    const handleBorderColor = 0xffffff

    // 8방향 핸들 위치
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
      handleGraphics.beginFill(handleColor, 1)
      handleGraphics.lineStyle(2, handleBorderColor, 1)
      handleGraphics.drawRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
      handleGraphics.endFill()
      handleGraphics.x = handle.x
      handleGraphics.y = handle.y
      handleGraphics.interactive = true
      handleGraphics.cursor = 'pointer'
      handleGraphics.name = handle.type

      // 드래그 시작
      handleGraphics.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        isResizingRef.current = true
        resizeHandleRef.current = handle.type
        isFirstResizeMoveRef.current = true
        const sprite = spritesRef.current.get(sceneIndex)
        if (sprite && appRef.current) {
          const bounds = sprite.getBounds()
          const baseWidth = bounds.width / (sprite.scale.x || 1)
          const baseHeight = bounds.height / (sprite.scale.y || 1)
          originalTransformRef.current = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            scaleX: sprite.scale.x,
            scaleY: sprite.scale.y,
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

      // 리사이즈 중 (전역 이벤트로 처리)
      const handleGlobalMove = (e: MouseEvent) => {
        if (isResizingRef.current && resizeHandleRef.current === handle.type && appRef.current && resizeStartPosRef.current) {
          const canvas = appRef.current.canvas
          const rect = canvas.getBoundingClientRect()
          const scaleX = canvas.width / rect.width
          const scaleY = canvas.height / rect.height
          const globalPos = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
          }
          
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
          
          // 리사이즈 완료 시 Transform 저장
          const currentSprite = spritesRef.current.get(sceneIndex)
          if (currentSprite && currentHandleType) {
            saveImageTransform(sceneIndex, currentSprite)
          }
        }
      }

      handleGraphics.on('pointerdown', () => {
        document.addEventListener('mousemove', handleGlobalMove)
        document.addEventListener('mouseup', handleGlobalUp)
      })

      handlesContainer.addChild(handleGraphics)
    })

    // 경계선 그리기
    const borderGraphics = new PIXI.Graphics()
    borderGraphics.lineStyle(2, handleColor, 1)
    borderGraphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
    handlesContainer.addChild(borderGraphics)

    containerRef.current.addChild(handlesContainer)
    editHandlesRef.current.set(sceneIndex, handlesContainer)
  }, [useFabricEditing, containerRef, editHandlesRef, spritesRef, appRef, isResizingRef, resizeHandleRef, isFirstResizeMoveRef, originalTransformRef, resizeStartPosRef, setSelectedElementIndex, setSelectedElementType])

  // Transform 데이터 저장 (단일 씬)
  const saveImageTransform = useCallback((sceneIndex: number, sprite: PIXI.Sprite | null) => {
    if (!timeline || !sprite) {
      return
    }

    // 스프라이트가 파괴되었는지 확인
    if (!sprite.parent) {
      return
    }

    const transform = {
      x: sprite.x,
      y: sprite.y,
      width: sprite.width,
      height: sprite.height,
      scaleX: sprite.scale.x,
      scaleY: sprite.scale.y,
      rotation: sprite.rotation,
    }

    // Transform 저장 중 플래그 설정
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
    
    // Transform 저장 완료 후 플래그 해제 (loadAllScenes 재호출 방지)
    setTimeout(() => {
      isSavingTransformRef.current = false
    }, 100)
  }, [timeline, setTimeline, isSavingTransformRef])
  
  // 모든 Transform 데이터 일괄 저장
  const saveAllImageTransforms = useCallback((transforms: Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>) => {
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
  }, [timeline, setTimeline, isSavingTransformRef])

  // 리사이즈 핸들러
  const handleResize = useCallback((e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => {
    if (!isResizingRef.current || !resizeHandleRef.current || !originalTransformRef.current) return

    const sprite = spritesRef.current.get(sceneIndex)
    if (!sprite || !appRef.current) return

    // 마우스 좌표를 PixiJS 좌표로 변환
    let globalPos: { x: number; y: number }
    if (e instanceof MouseEvent) {
      const canvas = appRef.current.canvas
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      globalPos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
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

    // 핸들 위치 업데이트
    const existingHandles = editHandlesRef.current.get(sceneIndex)
    if (existingHandles && sprite) {
      const bounds = sprite.getBounds()
      existingHandles.children.forEach((child, index) => {
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
        } else if (child instanceof PIXI.Graphics && index === existingHandles.children.length - 1) {
          child.clear()
          child.lineStyle(2, 0x8b5cf6, 1)
          child.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
        }
      })
    }

    if (appRef.current) {
      appRef.current.render()
    }
  }, [isResizingRef, resizeHandleRef, originalTransformRef, spritesRef, appRef, editHandlesRef])

  // 스프라이트 드래그 핸들러
  const setupSpriteDrag = useCallback((sprite: PIXI.Sprite, sceneIndex: number) => {
    if (!sprite) {
      return
    }

    sprite.off('pointerdown')
    sprite.off('pointermove')
    sprite.off('pointerup')
    sprite.off('pointerupoutside')

    // visible하지 않은 스프라이트는 interactive하지 않게 설정
    if (!sprite.visible || sprite.alpha === 0) {
      sprite.interactive = false
      return
    }

    sprite.interactive = true
    sprite.cursor = !useFabricEditing ? 'pointer' : 'default'

    if (!useFabricEditing) {
      sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        
        // 클릭 시 즉시 선택 및 핸들 표시
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('image')
        setEditMode('image') // editMode 즉시 설정
        drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)
        
        // 드래그 시작
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

        // 전역 마우스 이벤트 리스너 추가 (스프라이트 밖에서도 드래그 가능)
        let hasMoved = false // 드래그가 실제로 발생했는지 추적
        const handleGlobalMove = (e: MouseEvent) => {
          if (isDraggingRef.current && draggingElementRef.current === 'image' && !isResizingRef.current && appRef.current) {
            hasMoved = true // 드래그 발생
            const currentSprite = spritesRef.current.get(sceneIndex)
            if (!currentSprite) {
              isDraggingRef.current = false
              draggingElementRef.current = null
              document.removeEventListener('mousemove', handleGlobalMove)
              document.removeEventListener('mouseup', handleGlobalUp)
              return
            }
            const canvas = appRef.current.canvas
            const rect = canvas.getBoundingClientRect()
            const scaleX = canvas.width / rect.width
            const scaleY = canvas.height / rect.height
            const globalPos = {
              x: (e.clientX - rect.left) * scaleX,
              y: (e.clientY - rect.top) * scaleY,
            }
            currentSprite.x = globalPos.x - dragStartPosRef.current.x
            currentSprite.y = globalPos.y - dragStartPosRef.current.y
            if (appRef.current) {
              appRef.current.render()
            }
            drawEditHandles(currentSprite, sceneIndex, handleResize, saveImageTransform)
          }
        }

        const handleGlobalUp = () => {
          if (isDraggingRef.current && draggingElementRef.current === 'image') {
            isDraggingRef.current = false
            draggingElementRef.current = null
            const currentSprite = spritesRef.current.get(sceneIndex)
            if (currentSprite) {
              if (hasMoved) {
                // 드래그가 발생한 경우에만 Transform 저장
                saveImageTransform(sceneIndex, currentSprite)
              }
              // 클릭만 했거나 드래그를 했든 상관없이 핸들 유지
              drawEditHandles(currentSprite, sceneIndex, handleResize, saveImageTransform)
            }
            document.removeEventListener('mousemove', handleGlobalMove)
            document.removeEventListener('mouseup', handleGlobalUp)
          }
        }

        document.addEventListener('mousemove', handleGlobalMove)
        document.addEventListener('mouseup', handleGlobalUp)
      })

      sprite.on('pointerup', () => {
        // pointerup은 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })

      sprite.on('pointerupoutside', () => {
        // pointerupoutside도 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })
    }
  }, [editMode, useFabricEditing, drawEditHandles, saveImageTransform, handleResize, timeline, isDraggingRef, dragStartPosRef, originalSpriteTransformRef, setSelectedElementIndex, setSelectedElementType, isResizingRef, appRef, spritesRef, setEditMode, draggingElementRef])

  // Transform 데이터 적용
  const applyImageTransform = useCallback((sprite: PIXI.Sprite | null, transform?: TimelineScene['imageTransform']) => {
    if (!transform || !sprite) return

    // 스프라이트가 파괴되었는지 확인
    if (!sprite.parent) {
      return
    }

    sprite.x = transform.x
    sprite.y = transform.y
    sprite.width = transform.width
    sprite.height = transform.height
    sprite.rotation = transform.rotation
  }, [])

  // 텍스트 Transform 데이터 저장
  const saveTextTransform = useCallback((sceneIndex: number, text: PIXI.Text | null) => {
    if (!timeline || !text) {
      return
    }

    // 텍스트가 파괴되었는지 확인
    if (!text.parent) {
      return
    }

    // 원본 크기 계산 (scale을 제거한 실제 텍스트 크기)
    const baseWidth = text.width / (text.scale.x || 1)
    const baseHeight = text.height / (text.scale.y || 1)
    
    const transform = {
      x: text.x,
      y: text.y,
      width: text.width * text.scale.x,
      height: text.height * text.scale.y,
      scaleX: text.scale.x,
      scaleY: text.scale.y,
      rotation: text.rotation,
      baseWidth, // 원본 크기 저장
      baseHeight, // 원본 크기 저장
    }

    // Transform 저장 중 플래그 설정
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
    
    // Transform 저장 완료 후 플래그 해제 (loadAllScenes 재호출 방지)
    setTimeout(() => {
      isSavingTransformRef.current = false
    }, 100)
  }, [timeline, setTimeline, isSavingTransformRef])

  // Transform 데이터 적용
  const applyTextTransform = useCallback((text: PIXI.Text | null, transform?: TimelineScene['text']['transform']) => {
    if (!transform || !text) return

    // 텍스트가 파괴되었는지 확인
    if (!text.parent) {
      return
    }

    const scaleX = transform.scaleX ?? 1
    const scaleY = transform.scaleY ?? 1
    text.x = transform.x
    text.y = transform.y
    text.scale.set(scaleX, scaleY)
    text.rotation = transform.rotation
  }, [])

  // 텍스트 리사이즈 핸들러
  const handleTextResize = useCallback((e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => {
    if (!isResizingTextRef.current || !resizeHandleRef.current || !originalTransformRef.current) return

    const text = textsRef.current.get(sceneIndex)
    if (!text || !appRef.current) return

    let globalPos: { x: number; y: number }
    if (e instanceof MouseEvent) {
      const canvas = appRef.current.canvas
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      globalPos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
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

    const minSize = 20
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

    const baseWidth = original.baseWidth || original.width / (original.scaleX || 1)
    const baseHeight = original.baseHeight || original.height / (original.scaleY || 1)
    const scaleX = newWidth / baseWidth
    const scaleY = newHeight / baseHeight
    const centerX = newX + newWidth / 2
    const centerY = newY + newHeight / 2
    
    text.scale.set(scaleX, scaleY)
    text.x = centerX
    text.y = centerY

    // 핸들 위치 업데이트
    const existingHandles = textEditHandlesRef.current.get(sceneIndex)
    if (existingHandles && text) {
      const bounds = text.getBounds()
      existingHandles.children.forEach((child) => {
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
        }
      })
    }

    if (appRef.current) {
      appRef.current.render()
    }
  }, [isResizingTextRef, resizeHandleRef, originalTransformRef, textsRef, appRef, textEditHandlesRef])

  // 텍스트 편집 핸들 그리기
  const drawTextEditHandles = useCallback((text: PIXI.Text, sceneIndex: number, handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void, saveTextTransform: (sceneIndex: number, text: PIXI.Text) => void) => {
    if (useFabricEditing) return
    if (!containerRef.current || !text) return

    const existingHandles = textEditHandlesRef.current.get(sceneIndex)
    if (existingHandles && existingHandles.parent) {
      existingHandles.parent.removeChild(existingHandles)
    }

    const handlesContainer = new PIXI.Container()
    handlesContainer.interactive = true

    const bounds = text.getBounds()
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
      handleGraphics.beginFill(handleColor, 1)
      handleGraphics.lineStyle(2, handleBorderColor, 1)
      handleGraphics.drawRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
      handleGraphics.endFill()
      handleGraphics.x = handle.x
      handleGraphics.y = handle.y
      handleGraphics.interactive = true
      handleGraphics.cursor = 'pointer'
      handleGraphics.name = handle.type

      handleGraphics.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        isResizingTextRef.current = true
        resizeHandleRef.current = handle.type
        isFirstResizeMoveRef.current = true
        const text = textsRef.current.get(sceneIndex)
        if (text && appRef.current) {
          const bounds = text.getBounds()
          // 저장된 Transform에서 baseWidth/baseHeight 가져오기 (있으면)
          const savedTransform = timeline?.scenes[sceneIndex]?.text?.transform
          const baseWidth = savedTransform?.baseWidth || bounds.width / (text.scale.x || 1)
          const baseHeight = savedTransform?.baseHeight || bounds.height / (text.scale.y || 1)
          
          originalTransformRef.current = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            scaleX: text.scale.x,
            scaleY: text.scale.y,
            rotation: text.rotation,
            baseWidth,
            baseHeight,
          }
          resizeStartPosRef.current = {
            x: e.global.x,
            y: e.global.y,
          }
        }
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('text')
      })

      const handleGlobalMove = (e: MouseEvent) => {
        if (isResizingTextRef.current && resizeHandleRef.current === handle.type && appRef.current && resizeStartPosRef.current) {
          const canvas = appRef.current.canvas
          const rect = canvas.getBoundingClientRect()
          const scaleX = canvas.width / rect.width
          const scaleY = canvas.height / rect.height
          const globalPos = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
          }
          
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
          
          // 리사이즈 완료 시 Transform 저장
          const currentText = textsRef.current.get(sceneIndex)
          if (currentText && currentHandleType) {
            saveTextTransform(sceneIndex, currentText)
          }
        }
      }

      handleGraphics.on('pointerdown', () => {
        document.addEventListener('mousemove', handleGlobalMove)
        document.addEventListener('mouseup', handleGlobalUp)
      })

      handlesContainer.addChild(handleGraphics)
    })

    // 경계선 그리기
    const borderGraphics = new PIXI.Graphics()
    borderGraphics.lineStyle(2, handleColor, 1)
    borderGraphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
    handlesContainer.addChild(borderGraphics)

    containerRef.current.addChild(handlesContainer)
    textEditHandlesRef.current.set(sceneIndex, handlesContainer)
  }, [useFabricEditing, containerRef, textEditHandlesRef, textsRef, appRef, isResizingTextRef, resizeHandleRef, isFirstResizeMoveRef, originalTransformRef, resizeStartPosRef, setSelectedElementIndex, setSelectedElementType, handleTextResize, saveTextTransform, timeline])

  // 텍스트 드래그 설정
  const setupTextDrag = useCallback((text: PIXI.Text, sceneIndex: number) => {
    if (!text) {
      return
    }

    text.off('pointerdown')
    text.off('pointermove')
    text.off('pointerup')
    text.off('pointerupoutside')

    // visible하지 않은 텍스트는 interactive하지 않게 설정
    if (!text.visible || text.alpha === 0) {
      text.interactive = false
      return
    }

    text.interactive = true
    text.cursor = !useFabricEditing ? 'pointer' : 'default'

    if (!useFabricEditing) {
      text.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        // e.stopPropagation()
        
        // 클릭 시 즉시 선택 및 핸들 표시
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('text')
        setEditMode('text') // editMode 즉시 설정
        drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)
        
        // 드래그 시작 (텍스트는 앵커가 중앙이므로 중앙 좌표 기준으로 계산)
        isDraggingRef.current = true
        draggingElementRef.current = 'text'
        const globalPos = e.global
        // 텍스트의 중앙 좌표를 기준으로 드래그 오프셋 계산
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

        // 전역 마우스 이벤트 리스너 추가 (텍스트 밖에서도 드래그 가능)
        let hasMoved = false // 드래그가 실제로 발생했는지 추적
        const handleGlobalMove = (e: MouseEvent) => {
          if (isDraggingRef.current && draggingElementRef.current === 'text' && !isResizingTextRef.current && appRef.current) {
            hasMoved = true // 드래그 발생
            const currentText = textsRef.current.get(sceneIndex)
            if (!currentText) {
              isDraggingRef.current = false
              draggingElementRef.current = null
              document.removeEventListener('mousemove', handleGlobalMove)
              document.removeEventListener('mouseup', handleGlobalUp)
              return
            }
            const canvas = appRef.current.canvas
            const rect = canvas.getBoundingClientRect()
            const scaleX = canvas.width / rect.width
            const scaleY = canvas.height / rect.height
            const globalPos = {
              x: (e.clientX - rect.left) * scaleX,
              y: (e.clientY - rect.top) * scaleY,
            }
            // 텍스트는 앵커가 중앙(0.5, 0.5)이므로 중앙 좌표를 직접 설정
            currentText.x = globalPos.x - dragStartPosRef.current.x
            currentText.y = globalPos.y - dragStartPosRef.current.y
            if (appRef.current) {
              appRef.current.render()
            }
            drawTextEditHandles(currentText, sceneIndex, handleTextResize, saveTextTransform)
          }
        }

        const handleGlobalUp = () => {
          if (isDraggingRef.current && draggingElementRef.current === 'text') {
            isDraggingRef.current = false
            draggingElementRef.current = null
            const currentText = textsRef.current.get(sceneIndex)
            if (currentText) {
              if (hasMoved) {
                // 드래그가 발생한 경우에만 Transform 저장
                saveTextTransform(sceneIndex, currentText)
              }
              // 클릭만 했거나 드래그를 했든 상관없이 핸들 유지
              drawTextEditHandles(currentText, sceneIndex, handleTextResize, saveTextTransform)
            }
            document.removeEventListener('mousemove', handleGlobalMove)
            document.removeEventListener('mouseup', handleGlobalUp)
          }
        }

        document.addEventListener('mousemove', handleGlobalMove)
        document.addEventListener('mouseup', handleGlobalUp)
      })

      text.on('pointerup', () => {
        // pointerup은 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })

      text.on('pointerupoutside', () => {
        // pointerupoutside도 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })
    }
  }, [editMode, useFabricEditing, drawTextEditHandles, saveTextTransform, handleTextResize, timeline, isDraggingRef, dragStartPosRef, originalTextTransformRef, setSelectedElementIndex, setSelectedElementType, isResizingTextRef, appRef, textsRef, setEditMode, draggingElementRef])

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

