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
  resizeStartPosRef: React.MutableRefObject<{ x: number; y: number; handleX?: number; handleY?: number } | null>
  isFirstResizeMoveRef: React.MutableRefObject<boolean>
  originalTransformRef: React.MutableRefObject<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number; baseWidth?: number; baseHeight?: number; left?: number; right?: number; top?: number; bottom?: number } | null>
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
  // Canvas 크기 (9:16 비율, 1080x1920)
  const STAGE_WIDTH = 1080
  const STAGE_HEIGHT = 1920

  // 마우스 좌표를 PixiJS 좌표로 변환하는 헬퍼 함수
  // autoDensity와 resolution을 고려하여 정확한 좌표 변환
  const getPixiCoordinates = useCallback((e: MouseEvent, app: PIXI.Application): { x: number; y: number } => {
    const canvas = app.canvas
    const rect = canvas.getBoundingClientRect()
    
    // app.screen을 사용하여 autoDensity와 resolution을 고려한 정확한 스케일 계산
    const scaleX = app.screen.width / rect.width
    const scaleY = app.screen.height / rect.height
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  // 요소가 canvas 밖으로 나갔는지 체크
  const isOutsideCanvas = useCallback((element: PIXI.Sprite | PIXI.Text, isText: boolean = false): boolean => {
    const bounds = element.getBounds()
    
    // canvas 밖으로 나갔는지 체크
    if (bounds.x + bounds.width < 0 || bounds.x > STAGE_WIDTH ||
        bounds.y + bounds.height < 0 || bounds.y > STAGE_HEIGHT) {
      return true
    }
    return false
  }, [])

  // 중앙 위치로 복귀 (크기 조정하기 버튼의 템플릿 위치)
  const resetToCenter = useCallback((element: PIXI.Sprite | PIXI.Text, sceneIndex: number, isText: boolean = false) => {
    if (!timeline) return

    if (isText) {
      // 텍스트: 하단 중앙 위치
      const textY = STAGE_HEIGHT * 0.92 // 하단에서 8% 위
      const textWidth = STAGE_WIDTH * 0.75 // 화면 너비의 75%
      
      element.x = STAGE_WIDTH * 0.5 // 중앙
      element.y = textY
      
      // wordWrapWidth 업데이트
      if (element instanceof PIXI.Text && element.style) {
        element.style.wordWrapWidth = textWidth
        element.text = element.text // 스타일 변경 적용
      }
      
      // Transform 저장
      const bounds = element.getBounds()
      const transform = {
        x: element.x,
        y: element.y,
        width: bounds.width,
        height: bounds.height,
        scaleX: element.scale.x,
        scaleY: element.scale.y,
        rotation: element.rotation,
      }
      
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
    } else {
      // 이미지: 상단 15%부터 시작, 가로 100%, 높이 70%
      const imageY = STAGE_HEIGHT * 0.15 // 상단에서 15% 위치
      
      element.x = 0
      element.y = imageY
      element.width = STAGE_WIDTH
      element.height = STAGE_HEIGHT * 0.7
      
      // Transform 저장
      const transform = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        scaleX: element.scale.x,
        scaleY: element.scale.y,
        rotation: element.rotation,
      }
      
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
    }
  }, [timeline, setTimeline])

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
          // 리사이즈 시작 전에 한 번 더 렌더링하여 정확한 bounds 확보
          // 렌더링은 PixiJS ticker가 처리
          
          const bounds = sprite.getBounds()
          // 리사이즈 시작 시 현재 스프라이트의 정확한 크기와 위치를 저장 (현재 상태 기준)
          // 현재 bounds를 기준으로 저장 (리사이즈 시작 시점의 실제 크기와 위치)
          const currentWidth = bounds.width
          const currentHeight = bounds.height
          const currentScaleX = sprite.scale.x
          const currentScaleY = sprite.scale.y
          const currentX = bounds.x
          const currentY = bounds.y
          const savedTransform = timeline?.scenes[sceneIndex]?.imageTransform
          const baseWidth = savedTransform?.baseWidth || (currentWidth / (currentScaleX || 1))
          const baseHeight = savedTransform?.baseHeight || (currentHeight / (currentScaleY || 1))
          
          originalTransformRef.current = {
            x: currentX, // 현재 위치 X
            y: currentY, // 현재 위치 Y
            width: currentWidth, // 현재 bounds 너비
            height: currentHeight, // 현재 bounds 높이
            scaleX: currentScaleX, // 현재 스케일 X
            scaleY: currentScaleY, // 현재 스케일 Y
            rotation: sprite.rotation, // 현재 회전
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
          
          // 리사이즈 완료 시 Transform 저장
          const currentSprite = spritesRef.current.get(sceneIndex)
          if (currentSprite && currentHandleType) {
            // 리사이즈 완료 전에 한 번 더 렌더링하여 정확한 bounds 확보
            if (appRef.current) {
              // 렌더링은 PixiJS ticker가 처리
            }
            
            // canvas 밖으로 나갔는지 체크
            if (isOutsideCanvas(currentSprite, false)) {
              // 중앙 위치로 복귀
              resetToCenter(currentSprite, sceneIndex, false)
              // 복귀 후 핸들 다시 그리기
              // 핸들은 loadAllScenes 후 자동으로 다시 그려짐
            } else {
              // 리사이즈 완료 시 정확한 크기 저장
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
              
              // originalSpriteTransformRef 업데이트 (다음 리사이즈 시 정확한 크기 기준으로 사용)
              originalSpriteTransformRef.current.set(sceneIndex, finalTransform)
              
              // Transform 저장
              saveImageTransform(sceneIndex, currentSprite)
              // 핸들은 saveImageTransform 후 자동으로 다시 그려짐
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

    // 경계선 그리기
    const borderGraphics = new PIXI.Graphics()
    borderGraphics.lineStyle(2, handleColor, 1)
    borderGraphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
    handlesContainer.addChild(borderGraphics)

    containerRef.current.addChild(handlesContainer)
    editHandlesRef.current.set(sceneIndex, handlesContainer)
  }, [useFabricEditing, containerRef, editHandlesRef, spritesRef, appRef, isResizingRef, resizeHandleRef, isFirstResizeMoveRef, originalTransformRef, resizeStartPosRef, setSelectedElementIndex, setSelectedElementType, isOutsideCanvas, resetToCenter, timeline, setTimeline])

  // Transform 데이터 저장 (단일 씬)
  const saveImageTransform = useCallback((sceneIndex: number, sprite: PIXI.Sprite | null) => {
    if (!timeline || !sprite) {
      return
    }

    // 스프라이트가 파괴되었는지 확인
    if (!sprite.parent) {
      return
    }

    // 기존 Transform의 크기 정보 유지 (드래그 시 크기 변경 방지)
    const existingTransform = timeline.scenes[sceneIndex]?.imageTransform
    const originalTransform = originalSpriteTransformRef.current.get(sceneIndex)
    
    // 리사이즈 중이면 현재 크기 사용, 아니면 현재 스프라이트 크기 사용
    const isResizing = isResizingRef.current
    
    let width: number
    let height: number
    let scaleX: number
    let scaleY: number
    
    if (isResizing) {
      // 리사이즈 중: 현재 크기 사용 (정확한 크기 저장)
      const bounds = sprite.getBounds()
      width = bounds.width
      height = bounds.height
      scaleX = sprite.scale.x
      scaleY = sprite.scale.y
    } else {
      // 드래그 중이거나 일반 저장: 현재 스프라이트 크기 사용 (변경된 크기 유지)
      const bounds = sprite.getBounds()
      width = bounds.width
      height = bounds.height
      scaleX = sprite.scale.x
      scaleY = sprite.scale.y
    }

    const transform = {
      x: sprite.x,
      y: sprite.y,
      width,
      height,
      scaleX,
      scaleY,
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

    // 렌더링은 PixiJS ticker가 처리
  }, [isResizingRef, resizeHandleRef, originalTransformRef, spritesRef, appRef, editHandlesRef, isOutsideCanvas, resetToCenter, timeline, setTimeline, saveImageTransform, drawEditHandles])

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
            const globalPos = getPixiCoordinates(e, appRef.current)
            currentSprite.x = globalPos.x - dragStartPosRef.current.x
            currentSprite.y = globalPos.y - dragStartPosRef.current.y
            // 드래그 중에는 현재 크기 유지 (변경된 크기 그대로 사용)
            if (appRef.current) {
              // 렌더링은 PixiJS ticker가 처리
            }
            // 드래그 중에는 핸들 위치만 업데이트 (크기 변경 방지)
            const existingHandles = editHandlesRef.current.get(sceneIndex)
            if (existingHandles) {
              const bounds = currentSprite.getBounds()
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
                  // 경계선 업데이트
                  child.clear()
                  child.lineStyle(2, 0x8b5cf6, 1)
                  child.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
                }
              })
            } else {
              // 핸들이 없으면 새로 그리기
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
              // canvas 밖으로 나갔는지 체크
              if (isOutsideCanvas(currentSprite, false)) {
                // 중앙 위치로 복귀
                resetToCenter(currentSprite, sceneIndex, false)
                // 복귀 후 핸들 다시 그리기
                setTimeout(() => {
                  const sprite = spritesRef.current.get(sceneIndex)
                  if (sprite) {
                    drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)
                  }
                }, 100)
              } else {
                if (hasMoved) {
                  // 드래그가 발생한 경우에만 Transform 저장
                  saveImageTransform(sceneIndex, currentSprite)
                }
                // 클릭만 했거나 드래그를 했든 상관없이 핸들 유지
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

      sprite.on('pointerup', () => {
        // pointerup은 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })

      sprite.on('pointerupoutside', () => {
        // pointerupoutside도 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })
    }
  }, [editMode, useFabricEditing, drawEditHandles, saveImageTransform, handleResize, timeline, isDraggingRef, dragStartPosRef, originalSpriteTransformRef, setSelectedElementIndex, setSelectedElementType, isResizingRef, appRef, spritesRef, setEditMode, draggingElementRef, isOutsideCanvas, resetToCenter, setTimeline])

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

    // 기존 Transform의 크기 정보 유지 (드래그 시 크기 변경 방지)
    const existingTransform = timeline.scenes[sceneIndex]?.text?.transform
    const originalTransform = originalTextTransformRef.current.get(sceneIndex)
    
    // 리사이즈 중이면 현재 크기 사용, 아니면 현재 텍스트 크기 사용
    const isResizing = isResizingTextRef.current
    
    let width: number
    let height: number
    let scaleX: number
    let scaleY: number
    let baseWidth: number
    let baseHeight: number

    if (isResizing) {
      // 리사이즈 중: 현재 크기 사용 (정확한 크기 저장)
      const bounds = text.getBounds()
      const currentWordWrapWidth = text.style?.wordWrapWidth || bounds.width / (text.scale.x || 1)
      width = bounds.width
      height = bounds.height
      scaleX = text.scale.x
      scaleY = text.scale.y
      baseWidth = currentWordWrapWidth
      baseHeight = bounds.height / (text.scale.y || 1)
    } else {
      // 드래그 중이거나 일반 저장: 현재 텍스트 크기 사용 (변경된 크기 유지)
      const bounds = text.getBounds()
      const currentWordWrapWidth = text.style?.wordWrapWidth || bounds.width / (text.scale.x || 1)
      width = bounds.width
      height = bounds.height
      scaleX = text.scale.x
      scaleY = text.scale.y
      baseWidth = currentWordWrapWidth
      baseHeight = bounds.height / (text.scale.y || 1)
    }
    
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
  }, [timeline, setTimeline, isSavingTransformRef, isDraggingRef, draggingElementRef, originalTextTransformRef, isResizingTextRef])
  
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
    
    // 텍스트 스타일 업데이트: transform 너비에 맞게 wordWrapWidth 조정
    if (text.style && transform.width) {
      const baseWidth = transform.width / scaleX
      text.style.wordWrapWidth = baseWidth
      // 스타일 변경 후 텍스트를 다시 렌더링
      text.text = text.text
    }
  }, [])

  // 텍스트 리사이즈 핸들러
  const handleTextResize = useCallback((e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => {
    if (!isResizingTextRef.current || !resizeHandleRef.current || !originalTransformRef.current || !resizeStartPosRef.current) return

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

    // 마우스 이동량 계산 (리사이즈 시작 시점 기준)
    const deltaX = globalPos.x - startPos.x
    const deltaY = globalPos.y - startPos.y

    // 리사이즈 시작 시점의 각 모서리 위치 (반대편 모서리 고정을 위해)
    const left = original.left ?? (original.x - original.width / 2)
    const right = original.right ?? (original.x + original.width / 2)
    const top = original.top ?? (original.y - original.height / 2)
    const bottom = original.bottom ?? (original.y + original.height / 2)
    
    // 현재 핸들 위치 계산 (시작 위치 + 마우스 이동량)
    const currentHandleX = startPos.handleX! + deltaX
    const currentHandleY = startPos.handleY! + deltaY
    
    // 각 핸들 타입에 따라 반대편 모서리를 고정하고 새로운 크기와 중앙 위치 계산
    let newLeft = left
    let newRight = right
    let newTop = top
    let newBottom = bottom
    let newCenterX = original.x
    let newCenterY = original.y

    switch (handleType) {
      case 'nw':
        // 왼쪽 위: 오른쪽 아래 모서리 고정
        newLeft = currentHandleX
        newTop = currentHandleY
        newRight = right  // 고정
        newBottom = bottom  // 고정
        break
      case 'n':
        // 위: 아래 모서리 고정
        newTop = currentHandleY
        newBottom = bottom  // 고정
        newLeft = left  // 고정
        newRight = right  // 고정
        break
      case 'ne':
        // 오른쪽 위: 왼쪽 아래 모서리 고정
        newRight = currentHandleX
        newTop = currentHandleY
        newLeft = left  // 고정
        newBottom = bottom  // 고정
        break
      case 'e':
        // 오른쪽: 왼쪽 모서리 고정
        newRight = currentHandleX
        newLeft = left  // 고정
        newTop = top  // 고정
        newBottom = bottom  // 고정
        break
      case 'se':
        // 오른쪽 아래: 왼쪽 위 모서리 고정
        newRight = currentHandleX
        newBottom = currentHandleY
        newLeft = left  // 고정
        newTop = top  // 고정
        break
      case 's':
        // 아래: 위 모서리 고정
        newBottom = currentHandleY
        newTop = top  // 고정
        newLeft = left  // 고정
        newRight = right  // 고정
        break
      case 'sw':
        // 왼쪽 아래: 오른쪽 위 모서리 고정
        newLeft = currentHandleX
        newBottom = currentHandleY
        newRight = right  // 고정
        newTop = top  // 고정
        break
      case 'w':
        // 왼쪽: 오른쪽 모서리 고정
        newLeft = currentHandleX
        newRight = right  // 고정
        newTop = top  // 고정
        newBottom = bottom  // 고정
        break
    }
    
    // 새로운 크기와 중앙 위치 계산
    let newWidth = newRight - newLeft
    let newHeight = newBottom - newTop
    newCenterX = (newLeft + newRight) / 2
    newCenterY = (newTop + newBottom) / 2

    const minSize = 20
    if (newWidth < minSize) {
      // 최소 크기로 제한 시 반대편 모서리 고정 유지
      switch (handleType) {
        case 'nw':
        case 'w':
        case 'sw':
          // 왼쪽 핸들: 오른쪽 모서리 고정, 왼쪽 모서리 조정
          newLeft = newRight - minSize
          break
        case 'ne':
        case 'e':
        case 'se':
          // 오른쪽 핸들: 왼쪽 모서리 고정, 오른쪽 모서리 조정
          newRight = newLeft + minSize
          break
      }
      newWidth = minSize
    }
    if (newHeight < minSize) {
      // 최소 크기로 제한 시 반대편 모서리 고정 유지
      switch (handleType) {
        case 'nw':
        case 'n':
        case 'ne':
          // 위쪽 핸들: 아래 모서리 고정, 위쪽 모서리 조정
          newTop = newBottom - minSize
          break
        case 'sw':
        case 's':
        case 'se':
          // 아래쪽 핸들: 위 모서리 고정, 아래쪽 모서리 조정
          newBottom = newTop + minSize
          break
      }
      newHeight = minSize
    }
    
    // 최소 크기 제한 후 중앙 위치 재계산
    newCenterX = (newLeft + newRight) / 2
    newCenterY = (newTop + newBottom) / 2

    const baseWidth = original.baseWidth || original.width / (original.scaleX || 1)
    const baseHeight = original.baseHeight || original.height / (original.scaleY || 1)
    const scaleX = newWidth / baseWidth
    const scaleY = newHeight / baseHeight
    
    // 텍스트 스타일 업데이트: 새로운 너비에 맞게 wordWrapWidth 조정
    if (text.style) {
      const newWordWrapWidth = baseWidth * scaleX
      // 이전 값과 충분히 다를 때만 업데이트하여 불필요한 렌더링 방지
      const currentWordWrapWidth = text.style.wordWrapWidth || 0
      if (Math.abs(currentWordWrapWidth - newWordWrapWidth) > 1) {
        text.style.wordWrapWidth = newWordWrapWidth
        // wordWrapWidth 변경 시 텍스트 업데이트 필요 (하지만 최소한으로만)
        // updateText(true)를 사용하면 더 효율적이지만, 호환성을 위해 text 재할당
        const originalText = text.text
        text.text = originalText
      }
    }
    
    text.scale.set(scaleX, scaleY)
    text.x = newCenterX
    text.y = newCenterY

    // 핸들 위치 업데이트 (bounds 계산 최적화)
    const existingHandles = textEditHandlesRef.current.get(sceneIndex)
    if (existingHandles && text) {
      // 텍스트는 anchor가 (0.5, 0.5)이므로 bounds를 직접 계산 (getBounds 호출 최소화)
      const halfWidth = newWidth / 2
      const halfHeight = newHeight / 2
      const boundsX = newCenterX - halfWidth
      const boundsY = newCenterY - halfHeight
      
      existingHandles.children.forEach((child) => {
        if (child instanceof PIXI.Graphics && child.name) {
          const handleType = child.name as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
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
          const pos = handlePositions[handleType]
          if (pos) {
            child.x = pos.x
            child.y = pos.y
          }
        }
      })
    }

    // 렌더링 (직접 호출 - requestAnimationFrame은 오히려 지연을 유발할 수 있음)
    // 렌더링은 PixiJS ticker가 처리
  }, [isResizingTextRef, resizeHandleRef, originalTransformRef, resizeStartPosRef, textsRef, appRef, textEditHandlesRef, isOutsideCanvas, resetToCenter, timeline, setTimeline])

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
          // 리사이즈 시작 전에 텍스트를 한 번 렌더링하여 정확한 bounds 확보
          // 렌더링은 PixiJS ticker가 처리
          
          // 현재 텍스트의 실제 bounds를 정확히 가져오기 (렌더링 후)
          const bounds = text.getBounds()
          
          // 텍스트는 anchor가 (0.5, 0.5)이므로 중앙 좌표 사용
          const centerX = text.x
          const centerY = text.y
          
          // wordWrapWidth를 기준으로 baseWidth 계산 (텍스트의 실제 줄바꿈 너비)
          // 현재 텍스트의 실제 wordWrapWidth를 가져와서 저장
          const currentWordWrapWidth = text.style?.wordWrapWidth || bounds.width / (text.scale.x || 1)
          const baseWidth = currentWordWrapWidth
          // baseHeight는 현재 텍스트의 실제 높이를 scale로 나눈 값
          const baseHeight = bounds.height / (text.scale.y || 1)
          
          // 리사이즈 시작 시점의 bounds 계산 (현재 크기 기준)
          const halfWidth = bounds.width / 2
          const halfHeight = bounds.height / 2
          const boundsLeft = centerX - halfWidth
          const boundsTop = centerY - halfHeight
          const boundsRight = centerX + halfWidth
          const boundsBottom = centerY + halfHeight
          
          // 리사이즈 시작 시점의 핸들 위치 계산 (bounds 기준)
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
          
          // 리사이즈 시작 시 현재 텍스트의 정확한 크기와 위치를 저장 (현재 상태 기준)
          // 현재 bounds를 기준으로 저장 (리사이즈 시작 시점의 실제 크기와 위치)
          const currentWidth = bounds.width
          const currentHeight = bounds.height
          const currentScaleX = text.scale.x
          const currentScaleY = text.scale.y
          const currentBaseWidth = baseWidth
          const currentBaseHeight = baseHeight
          const currentCenterX = centerX
          const currentCenterY = centerY
          const currentHalfWidth = currentWidth / 2
          const currentHalfHeight = currentHeight / 2
          
          // originalTransformRef에는 리사이즈 계산에 사용할 현재 크기와 모서리 위치 저장
          originalTransformRef.current = {
            x: currentCenterX, // 텍스트의 중앙 X 좌표 (현재 위치)
            y: currentCenterY, // 텍스트의 중앙 Y 좌표 (현재 위치)
            width: currentWidth, // 현재 bounds 너비
            height: currentHeight, // 현재 bounds 높이
            scaleX: currentScaleX, // 현재 스케일 X
            scaleY: currentScaleY, // 현재 스케일 Y
            rotation: text.rotation, // 현재 회전
            baseWidth: currentBaseWidth, // 현재 wordWrapWidth (줄바꿈 기준 너비)
            baseHeight: currentBaseHeight, // 현재 baseHeight
            // 각 모서리 위치 저장 (반대편 모서리 고정을 위해) - 현재 위치 기준
            left: currentCenterX - currentHalfWidth,
            right: currentCenterX + currentHalfWidth,
            top: currentCenterY - currentHalfHeight,
            bottom: currentCenterY + currentHalfHeight,
          }
          
          // 리사이즈 시작 위치 저장 (마우스 위치와 핸들 위치 모두 저장)
          resizeStartPosRef.current = {
            x: e.global.x, // 마우스 X 위치
            y: e.global.y, // 마우스 Y 위치
            handleX: startHandleX, // 핸들 X 위치 (bounds 기준)
            handleY: startHandleY, // 핸들 Y 위치 (bounds 기준)
          }
        }
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('text')
      })

      const handleGlobalMove = (e: MouseEvent) => {
        if (isResizingTextRef.current && resizeHandleRef.current === handle.type && appRef.current && resizeStartPosRef.current) {
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
          
          // 리사이즈 완료 시 Transform 저장
          const currentText = textsRef.current.get(sceneIndex)
          if (currentText && currentHandleType) {
            // 리사이즈 완료 전에 한 번 더 렌더링하여 정확한 bounds 확보
            if (appRef.current) {
              // 렌더링은 PixiJS ticker가 처리
            }
            
            // canvas 밖으로 나갔는지 체크
            if (isOutsideCanvas(currentText, true)) {
              // 중앙 위치로 복귀
              resetToCenter(currentText, sceneIndex, true)
              // 핸들은 loadAllScenes 후 자동으로 다시 그려짐
            } else {
              // 리사이즈 완료 시 정확한 크기 저장
              const bounds = currentText.getBounds()
              const currentWordWrapWidth = currentText.style?.wordWrapWidth || bounds.width / (currentText.scale.x || 1)
              const finalTransform = {
                x: currentText.x,
                y: currentText.y,
                width: bounds.width,
                height: bounds.height,
                scaleX: currentText.scale.x,
                scaleY: currentText.scale.y,
                rotation: currentText.rotation,
                baseWidth: currentWordWrapWidth,
                baseHeight: bounds.height / (currentText.scale.y || 1),
              }
              
              // originalTextTransformRef 업데이트 (다음 리사이즈 시 정확한 크기 기준으로 사용)
              originalTextTransformRef.current.set(sceneIndex, finalTransform)
              
              // Transform 저장
              saveTextTransform(sceneIndex, currentText)
              // 핸들은 saveTextTransform 후 자동으로 다시 그려짐
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

    // 경계선 그리기
    const borderGraphics = new PIXI.Graphics()
    borderGraphics.lineStyle(2, handleColor, 1)
    borderGraphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
    handlesContainer.addChild(borderGraphics)

    containerRef.current.addChild(handlesContainer)
    textEditHandlesRef.current.set(sceneIndex, handlesContainer)
  }, [useFabricEditing, containerRef, textEditHandlesRef, textsRef, appRef, isResizingTextRef, resizeHandleRef, isFirstResizeMoveRef, originalTransformRef, resizeStartPosRef, setSelectedElementIndex, setSelectedElementType, timeline, isOutsideCanvas, resetToCenter])

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
            const globalPos = getPixiCoordinates(e, appRef.current)
            // 텍스트는 앵커가 중앙(0.5, 0.5)이므로 중앙 좌표를 직접 설정
            currentText.x = globalPos.x - dragStartPosRef.current.x
            currentText.y = globalPos.y - dragStartPosRef.current.y
            // 드래그 중에는 현재 크기 유지 (변경된 크기 그대로 사용)
            if (appRef.current) {
              // 렌더링은 PixiJS ticker가 처리
            }
            // 드래그 중에는 핸들 위치만 업데이트 (크기 변경 방지)
            const existingHandles = textEditHandlesRef.current.get(sceneIndex)
            if (existingHandles) {
              const bounds = currentText.getBounds()
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
                  // 경계선 업데이트
                  child.clear()
                  child.lineStyle(2, 0x8b5cf6, 1)
                  child.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
                }
              })
            } else {
              // 핸들이 없으면 새로 그리기
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
            // canvas 밖으로 나갔는지 체크
            if (isOutsideCanvas(currentText, true)) {
              // 중앙 위치로 복귀
              resetToCenter(currentText, sceneIndex, true)
              // 복귀 후 핸들 다시 그리기
              setTimeout(() => {
                const text = textsRef.current.get(sceneIndex)
                if (text) {
                  drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)
                }
              }, 100)
            } else {
              if (hasMoved) {
                // 드래그가 발생한 경우에만 Transform 저장
                saveTextTransform(sceneIndex, currentText)
              }
              // 클릭만 했거나 드래그를 했든 상관없이 핸들 유지
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

      text.on('pointerup', () => {
        // pointerup은 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })

      text.on('pointerupoutside', () => {
        // pointerupoutside도 handleGlobalUp에서 처리되므로 여기서는 아무것도 하지 않음
        // 핸들은 handleGlobalUp에서 유지됨
      })
    }
  }, [editMode, useFabricEditing, drawTextEditHandles, saveTextTransform, handleTextResize, timeline, isDraggingRef, dragStartPosRef, originalTextTransformRef, setSelectedElementIndex, setSelectedElementType, isResizingTextRef, appRef, textsRef, setEditMode, draggingElementRef, isOutsideCanvas, resetToCenter, setTimeline])

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

