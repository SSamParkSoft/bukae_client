'use client'

import { useEffect } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'

interface UseEditModeManagerParams {
  // Refs
  containerRef: React.RefObject<PIXI.Container>
  appRef: React.RefObject<PIXI.Application>
  pixiContainerRef: React.RefObject<HTMLDivElement>
  fabricCanvasRef: React.RefObject<fabric.Canvas>
  fabricScaleRatioRef: React.MutableRefObject<number>
  currentSceneIndexRef: React.MutableRefObject<number>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  editHandlesRef: React.MutableRefObject<Map<number, PIXI.Graphics>>
  textEditHandlesRef: React.MutableRefObject<Map<number, PIXI.Graphics>>
  clickedOnPixiElementRef: React.MutableRefObject<boolean>
  timelineRef: React.RefObject<TimelineData | null>
  loadAllScenesCompletedRef: React.MutableRefObject<boolean>
  
  // Edit handler function refs
  drawEditHandlesRef: React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>
  handleResizeRef: React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>
  saveImageTransformRef: React.MutableRefObject<() => void>
  setupSpriteDragRef: React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number) => void>
  drawTextEditHandlesRef: React.MutableRefObject<(text: PIXI.Text, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>
  handleTextResizeRef: React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>
  saveTextTransformRef: React.MutableRefObject<() => void>
  setupTextDragRef: React.MutableRefObject<(text: PIXI.Text, sceneIndex: number) => void>
  
  // State
  useFabricEditing: boolean
  pixiReady: boolean
  fabricReady: boolean
  editMode: 'none' | 'image' | 'text'
  setEditMode: (mode: 'none' | 'image' | 'text') => void
  selectedElementIndex: number | null
  setSelectedElementIndex: (index: number | null) => void
  selectedElementType: 'image' | 'text' | null
  setSelectedElementType: (type: 'image' | 'text' | null) => void
  isPlaying: boolean
  isPreviewingTransition: boolean
  currentSceneIndex: number
  timeline: TimelineData | null
  
  // Functions
  setupSpriteDrag: (sprite: PIXI.Sprite, sceneIndex: number) => void
  setupTextDrag: (text: PIXI.Text, sceneIndex: number) => void
}

interface FabricDataObject {
  dataType?: 'image' | 'text'
}

function applyFastLikeControlPolicy(target: fabric.Object) {
  if (typeof (target as { setControlsVisibility?: (options: Record<string, boolean>) => void }).setControlsVisibility === 'function') {
    ;(target as { setControlsVisibility: (options: Record<string, boolean>) => void }).setControlsVisibility({
      mtr: false,
      tl: true,
      tr: true,
      bl: true,
      br: true,
      ml: false,
      mt: false,
      mr: false,
      mb: false,
    })
  }
}

export function useEditModeManager({
  containerRef,
  appRef,
  pixiContainerRef,
  fabricCanvasRef,
  fabricScaleRatioRef,
  currentSceneIndexRef,
  spritesRef,
  textsRef,
  editHandlesRef,
  textEditHandlesRef,
  clickedOnPixiElementRef,
  timelineRef,
  loadAllScenesCompletedRef,
  drawEditHandlesRef,
  handleResizeRef,
  saveImageTransformRef,
  setupSpriteDragRef,
  drawTextEditHandlesRef,
  handleTextResizeRef,
  saveTextTransformRef,
  setupTextDragRef,
  useFabricEditing,
  pixiReady,
  fabricReady,
  editMode,
  setEditMode,
  selectedElementIndex,
  setSelectedElementIndex,
  selectedElementType,
  setSelectedElementType,
  isPlaying,
  isPreviewingTransition,
  currentSceneIndex,
  timeline,
  setupSpriteDrag,
  setupTextDrag,
}: UseEditModeManagerParams) {
  // PixiJS 컨테이너에 빈 공간 클릭 감지 추가 (canvas 요소에 직접 이벤트 추가)
  useEffect(() => {
    if (!containerRef.current || !appRef.current || useFabricEditing || !pixiReady) return

    const app = appRef.current
    const canvas = app.canvas

    // canvas 요소에 직접 클릭 이벤트 추가 (스프라이트/텍스트의 stopPropagation과 무관하게 작동)
    const handleCanvasClick = (e: MouseEvent) => {
      // 플래그 초기화
      clickedOnPixiElementRef.current = false
      
      // 약간의 지연을 두어 스프라이트/텍스트/핸들 클릭 이벤트가 먼저 처리되도록 함
      setTimeout(() => {
        // 스프라이트나 텍스트나 핸들을 클릭했다면 빈 공간 클릭으로 처리하지 않음
        if (clickedOnPixiElementRef.current) {
          return
        }

        // 편집 모드가 'none'이면 처리하지 않음
        if (editMode === 'none') {
          return
        }

        // 마우스 좌표를 PixiJS 좌표로 변환
        const rect = canvas.getBoundingClientRect()
        if (!app.screen || rect.width === 0 || rect.height === 0) return
        const scaleX = app.screen.width / rect.width
        const scaleY = app.screen.height / rect.height
        const pixiX = (e.clientX - rect.left) * scaleX
        const pixiY = (e.clientY - rect.top) * scaleY

        const clickedSprite = spritesRef.current.get(currentSceneIndexRef.current)
        const clickedText = textsRef.current.get(currentSceneIndexRef.current)
        
        // 핸들 클릭인지 확인
        const clickedOnHandle = editHandlesRef.current.get(currentSceneIndexRef.current)?.children.some(handle => {
          if (handle instanceof PIXI.Graphics) {
            const handleBounds = handle.getBounds()
            return pixiX >= handleBounds.x && pixiX <= handleBounds.x + handleBounds.width &&
                   pixiY >= handleBounds.y && pixiY <= handleBounds.y + handleBounds.height
          }
          return false
        }) || textEditHandlesRef.current.get(currentSceneIndexRef.current)?.children.some(handle => {
          if (handle instanceof PIXI.Graphics) {
            const handleBounds = handle.getBounds()
            return pixiX >= handleBounds.x && pixiX <= handleBounds.x + handleBounds.width &&
                   pixiY >= handleBounds.y && pixiY <= handleBounds.y + handleBounds.height
          }
          return false
        })

        // 스프라이트나 텍스트를 클릭하지 않고, 핸들도 클릭하지 않은 경우 (빈 공간)
        let clickedOnSprite = false
        if (clickedSprite && !clickedSprite.destroyed) {
          try {
            const spriteBounds = clickedSprite.getBounds()
            if (spriteBounds && clickedSprite.visible && clickedSprite.alpha > 0) {
              clickedOnSprite = pixiX >= spriteBounds.x && pixiX <= spriteBounds.x + spriteBounds.width &&
                pixiY >= spriteBounds.y && pixiY <= spriteBounds.y + spriteBounds.height
            }
          } catch {
            // getBounds 실패 시 무시
          }
        }
        
        let clickedOnText = false
        if (clickedText && !clickedText.destroyed) {
          try {
            const textBounds = clickedText.getBounds()
            if (textBounds && clickedText.visible && clickedText.alpha > 0) {
              clickedOnText = pixiX >= textBounds.x && pixiX <= textBounds.x + textBounds.width &&
                pixiY >= textBounds.y && pixiY <= textBounds.y + textBounds.height
            }
          } catch {
            // getBounds 실패 시 무시
          }
        }
        
        if (!clickedOnHandle && !clickedOnSprite && !clickedOnText) {
          // 빈 공간 클릭: 선택 해제 및 편집 모드 종료
          setSelectedElementIndex(null)
          setSelectedElementType(null)
          setEditMode('none')
        }
      }, 50)
    }

    // canvas 요소에 직접 이벤트 리스너 추가 (capture phase에서 처리)
    canvas.addEventListener('mousedown', handleCanvasClick, true)

    return () => {
      canvas.removeEventListener('mousedown', handleCanvasClick, true)
    }
  }, [containerRef, appRef, useFabricEditing, pixiReady, currentSceneIndexRef, spritesRef, textsRef, editHandlesRef, textEditHandlesRef, clickedOnPixiElementRef, editMode, setSelectedElementIndex, setSelectedElementType, setEditMode])

  // Pixi 캔버스는 항상 보이고, 편집 중에는 포인터만 Fabric에 위임
  useEffect(() => {
    if (!pixiContainerRef.current) return
    const pixiCanvas = pixiContainerRef.current.querySelector('canvas:not([data-fabric])') as HTMLCanvasElement
    if (!pixiCanvas) return

    pixiCanvas.style.opacity = '1'
    pixiCanvas.style.zIndex = '10'

    if (isPlaying || isPreviewingTransition) {
      pixiCanvas.style.pointerEvents = 'none'
      return
    }

    pixiCanvas.style.pointerEvents = useFabricEditing ? 'none' : 'auto'
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFabricEditing, fabricReady, pixiReady, isPlaying, isPreviewingTransition, editMode])

  // Fabric 캔버스는 투명 오버레이로만 사용 (핸들/선택 hit-test 전용)
  useEffect(() => {
    if (!fabricCanvasRef.current) return
    const fabricCanvas = fabricCanvasRef.current

    const hideFabricOverlay = () => {
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '0'
        fabricCanvas.wrapperEl.style.pointerEvents = 'none'
      }
      if (fabricCanvas.upperCanvasEl) {
        fabricCanvas.upperCanvasEl.style.opacity = '0'
        fabricCanvas.upperCanvasEl.style.pointerEvents = 'none'
      }
      if (fabricCanvas.lowerCanvasEl) {
        fabricCanvas.lowerCanvasEl.style.opacity = '0'
        fabricCanvas.lowerCanvasEl.style.pointerEvents = 'none'
      }
    }

    if (isPlaying || isPreviewingTransition || !useFabricEditing || !fabricReady) {
      hideFabricOverlay()
      return
    }

    if (fabricCanvas.wrapperEl) {
      fabricCanvas.wrapperEl.style.opacity = '1'
      fabricCanvas.wrapperEl.style.pointerEvents = 'auto'
      fabricCanvas.wrapperEl.style.zIndex = '40'
    }
    if (fabricCanvas.upperCanvasEl) {
      fabricCanvas.upperCanvasEl.style.opacity = '1'
      fabricCanvas.upperCanvasEl.style.pointerEvents = 'auto'
      fabricCanvas.upperCanvasEl.style.zIndex = '41'
    }
    if (fabricCanvas.lowerCanvasEl) {
      fabricCanvas.lowerCanvasEl.style.opacity = '1'
      fabricCanvas.lowerCanvasEl.style.pointerEvents = 'none'
      fabricCanvas.lowerCanvasEl.style.zIndex = '40'
    }
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPreviewingTransition, fabricReady, useFabricEditing])

  // Fabric 조작을 Pixi에 실시간 반영 (Pro와 동일한 sync 패턴)
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current
    if (!fabricCanvas || !useFabricEditing || isPlaying || isPreviewingTransition) {
      return
    }

    const applyTargetToPixi = (target: fabric.Object | null | undefined) => {
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }

      const typedTarget = target as fabric.Object & FabricDataObject
      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale
      const sceneIndex = currentSceneIndexRef.current

      if (typedTarget.dataType === 'image') {
        const sprite = spritesRef.current.get(sceneIndex)
        if (!sprite || sprite.destroyed) {
          return
        }

        const scaledWidth = typeof target.getScaledWidth === 'function'
          ? target.getScaledWidth()
          : (target.width || 0) * (target.scaleX || 1)
        const scaledHeight = typeof target.getScaledHeight === 'function'
          ? target.getScaledHeight()
          : (target.height || 0) * (target.scaleY || 1)

        sprite.x = (target.left ?? 0) * invScale
        sprite.y = (target.top ?? 0) * invScale
        sprite.width = scaledWidth * invScale
        sprite.height = scaledHeight * invScale
        sprite.rotation = ((target.angle || 0) * Math.PI) / 180
        return
      }

      if (typedTarget.dataType === 'text') {
        const pixiText = textsRef.current.get(sceneIndex)
        if (!pixiText || pixiText.destroyed) {
          return
        }

        const scaledWidth = typeof target.getScaledWidth === 'function'
          ? target.getScaledWidth()
          : (target.width || 0) * (target.scaleX || 1)

        const targetCenterX = (target.left ?? 0) * invScale
        const targetCenterY = (target.top ?? 0) * invScale
        const sceneTransform = timelineRef.current?.scenes?.[sceneIndex]?.text?.transform
        const centerOffsetX =
          typeof sceneTransform?.x === 'number'
            ? (pixiText.x - sceneTransform.x)
            : 0
        const centerOffsetY =
          typeof sceneTransform?.y === 'number'
            ? (pixiText.y - sceneTransform.y)
            : 0

        pixiText.x = targetCenterX + centerOffsetX
        pixiText.y = targetCenterY + centerOffsetY
        pixiText.rotation = ((target.angle || 0) * Math.PI) / 180
        if (pixiText.style && scaledWidth > 0) {
          pixiText.style.wordWrapWidth = scaledWidth * invScale
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMoving = (e: any) => {
      applyTargetToPixi(e?.target as fabric.Object | null | undefined)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleScaling = (e: any) => {
      applyTargetToPixi(e?.target as fabric.Object | null | undefined)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRotating = (e: any) => {
      applyTargetToPixi(e?.target as fabric.Object | null | undefined)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:moving', handleMoving as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:scaling', handleScaling as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:rotating', handleRotating as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:moving', handleMoving as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:scaling', handleScaling as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:rotating', handleRotating as any)
    }
  }, [
    fabricCanvasRef,
    fabricScaleRatioRef,
    useFabricEditing,
    isPlaying,
    isPreviewingTransition,
    currentSceneIndexRef,
    timelineRef,
    spritesRef,
    textsRef,
  ])

  // Fabric 활성 객체를 편집 모드 타입에 맞게 맞춘다 (Pro와 동일한 핸들 선택 UX)
  useEffect(() => {
    if (!fabricReady || !useFabricEditing || isPlaying || isPreviewingTransition) {
      return
    }
    if (editMode !== 'image' && editMode !== 'text') {
      return
    }

    const fabricCanvas = fabricCanvasRef.current
    if (!fabricCanvas) {
      return
    }

    const objects = fabricCanvas.getObjects() as Array<fabric.Object & { dataType?: 'image' | 'text' }>
    const target = objects.find((obj) => obj.dataType === editMode)
    if (!target) {
      return
    }

    target.set({
      hasControls: true,
      hasBorders: false,
      selectable: true,
      evented: true,
    })
    applyFastLikeControlPolicy(target)
    target.setCoords()
    fabricCanvas.setActiveObject(target)
    fabricCanvas.requestRenderAll()
  }, [fabricReady, useFabricEditing, isPlaying, isPreviewingTransition, editMode, fabricCanvasRef])

  // Fabric 선택 이벤트로 editMode/선택 상태를 동기화 (Pro 핸들러 정책)
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current
    if (!fabricCanvas || isPlaying || !pixiReady || !useFabricEditing) {
      return
    }

    const resolveTargetType = (
      target: fabric.Object | null | undefined
    ): 'image' | 'text' | null => {
      const typedTarget = target as fabric.Object & { dataType?: 'image' | 'text' }
      if (!typedTarget?.dataType) {
        return null
      }
      return typedTarget.dataType
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMouseDown = (e: any) => {
      const selectedType = resolveTargetType(e.target as fabric.Object | null)
      if (!selectedType) {
        const activeObject = fabricCanvas.getActiveObject() as fabric.Object & { dataType?: 'image' | 'text' } | null
        if (activeObject?.dataType) {
          return
        }
        setSelectedElementIndex(null)
        setSelectedElementType(null)
        setEditMode('none')
        fabricCanvas.discardActiveObject()
        fabricCanvas.requestRenderAll()
        return
      }

      setSelectedElementIndex(currentSceneIndexRef.current)
      setSelectedElementType(selectedType)
      setEditMode(selectedType)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionCreated = (e: any) => {
      const selected = (e.selected as fabric.Object[] | undefined)?.[0]
      const selectedType = resolveTargetType(selected)
      if (!selectedType) {
        return
      }
      setSelectedElementIndex(currentSceneIndexRef.current)
      setSelectedElementType(selectedType)
      setEditMode(selectedType)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionUpdated = (e: any) => {
      const selected = (e.selected as fabric.Object[] | undefined)?.[0]
      const selectedType = resolveTargetType(selected)
      if (!selectedType) {
        return
      }
      setSelectedElementIndex(currentSceneIndexRef.current)
      setSelectedElementType(selectedType)
      setEditMode(selectedType)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('mouse:down', handleMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('selection:created', handleSelectionCreated as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('selection:updated', handleSelectionUpdated as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('mouse:down', handleMouseDown as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('selection:created', handleSelectionCreated as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('selection:updated', handleSelectionUpdated as any)
    }
  }, [
    fabricCanvasRef,
    isPlaying,
    pixiReady,
    useFabricEditing,
    setEditMode,
    setSelectedElementIndex,
    setSelectedElementType,
    currentSceneIndexRef,
  ])

  useEffect(() => {
    if (editMode !== 'none') {
      return
    }
    const fabricCanvas = fabricCanvasRef.current
    if (!fabricCanvas) {
      return
    }
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
  }, [editMode, fabricCanvasRef])

  // Fabric 편집 진입 시 Pixi 핸들을 정리해 이중 핸들 노출을 방지
  useEffect(() => {
    if (!useFabricEditing) {
      return
    }

    editHandlesRef.current.forEach((handles) => {
      if (handles.parent) {
        handles.parent.removeChild(handles)
      }
    })
    editHandlesRef.current.clear()

    textEditHandlesRef.current.forEach((handles) => {
      if (handles.parent) {
        handles.parent.removeChild(handles)
      }
    })
    textEditHandlesRef.current.clear()
  }, [useFabricEditing, editHandlesRef, textEditHandlesRef])

  // 선택된 요소에 따라 편집 모드 자동 설정
  useEffect(() => {
    // 선택이 해제되면 편집 모드도 해제
    if (selectedElementIndex === null && selectedElementType === null) {
      if (editMode !== 'none') {
        setEditMode('none')
      }
      return
    }
    
    // 선택된 요소 타입에 따라 편집 모드 설정
    if (selectedElementType === 'image' && editMode !== 'image') {
      setEditMode('image')
    } else if (selectedElementType === 'text' && editMode !== 'text') {
      setEditMode('text')
    }
  }, [selectedElementIndex, selectedElementType, editMode, setEditMode])

  // ESC 키로 편집 모드 해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 키를 눌렀을 때 편집 모드 해제
      if (e.key === 'Escape' && editMode !== 'none') {
        setSelectedElementIndex(null)
        setSelectedElementType(null)
        setEditMode('none')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [editMode, setEditMode, setSelectedElementIndex, setSelectedElementType])

  // 현재 씬 변경 시 드래그 설정 재적용
  useEffect(() => {
    if (!containerRef.current || !timeline) {
      return
    }

    // 재생 중일 때는 드래그 설정을 하지 않음 (전환 효과가 보이도록)
    if (isPlaying) {
      return
    }

    // 재생 중이 아닐 때만 드래그 설정
    const setupDrag = () => {
      const currentSprite = spritesRef.current.get(currentSceneIndexRef.current)
      const currentText = textsRef.current.get(currentSceneIndexRef.current)
      
      if (currentSprite) {
        setupSpriteDrag(currentSprite, currentSceneIndexRef.current)
      }
      
      if (currentText) {
        setupTextDrag(currentText, currentSceneIndexRef.current)
      }

      if (appRef.current) {
        // 렌더링은 PixiJS ticker가 처리
      }
    }

    // 전환 효과 미리보기 중일 때는 약간의 지연
    if (isPreviewingTransition) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setupDrag()
        })
      })
    } else {
      // 일반적인 경우 즉시 실행
      setupDrag()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneIndex, timeline, setupSpriteDrag, setupTextDrag, isPlaying, isPreviewingTransition])

  // 편집 모드 변경 시 핸들 표시/숨김
  useEffect(() => {
    const currentTimeline = timelineRef.current
    if (!containerRef.current || !currentTimeline || !pixiReady) return

    // Fabric 편집 중에는 Pixi 핸들을 절대 그리지 않는다.
    if (useFabricEditing) {
      editHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      editHandlesRef.current.clear()
      textEditHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      textEditHandlesRef.current.clear()
      return
    }

    // 편집 모드가 종료되면 핸들 제거
    if (editMode === 'none') {
      editHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      editHandlesRef.current.clear()
      textEditHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      textEditHandlesRef.current.clear()
      // 편집 모드가 none이면 선택도 해제 (단, 이미 null이 아닐 때만 - 무한 루프 방지)
      // selectedElementIndex, selectedElementType은 ref로 접근하거나 직접 체크
      // (의존성 배열에서 제거하여 불필요한 재실행 방지)
      if (selectedElementIndex !== null || selectedElementType !== null) {
        setSelectedElementIndex(null)
        setSelectedElementType(null)
      }
    } else if (editMode === 'image') {
      // 이미지 편집 모드일 때는 이미지 핸들만 표시하고 자막 핸들은 제거
      const currentSceneIndex = currentSceneIndexRef.current
      
      // 자막 핸들 제거
      const existingTextHandles = textEditHandlesRef.current.get(currentSceneIndex)
      if (existingTextHandles && existingTextHandles.parent) {
        existingTextHandles.parent.removeChild(existingTextHandles)
        textEditHandlesRef.current.delete(currentSceneIndex)
      }
      
      // 스프라이트가 실제로 존재하는지 확인
      const sprite = spritesRef.current.get(currentSceneIndex)
      
      if (!sprite) {
        // loadAllScenes가 완료되지 않았으면 나중에 handleLoadComplete에서 처리됨
        if (!loadAllScenesCompletedRef.current) {
          return
        }
        // loadAllScenes가 완료되었는데도 스프라이트가 없으면 핸들이 이미 그려져 있는지 확인
        const existingHandles = editHandlesRef.current.get(currentSceneIndex)
        if (existingHandles?.parent) {
          // 핸들이 이미 있으면 정상 (handleLoadComplete에서 이미 처리됨)
          return
        }
        return
      }
      
      // 현재 씬의 이미지 핸들 표시
      // 편집 모드에서는 스프라이트를 먼저 표시한 후 핸들 그리기
      sprite.visible = true
      sprite.alpha = 1
      
      const existingHandles = editHandlesRef.current.get(currentSceneIndex)
      if (!existingHandles || !existingHandles.parent) {
        try {
          drawEditHandlesRef.current(sprite, currentSceneIndex, handleResizeRef.current, saveImageTransformRef.current)
        } catch {
          // 이미지 핸들 그리기 실패
        }
      }
      try {
        setupSpriteDragRef.current(sprite, currentSceneIndex)
      } catch {
        // 이미지 드래그 설정 실패
      }
    } else if (editMode === 'text') {
      // 자막 편집 모드일 때는 자막 핸들만 표시하고 이미지 핸들은 제거
      const currentSceneIndex = currentSceneIndexRef.current
      
      // 이미지 핸들 제거
      const existingHandles = editHandlesRef.current.get(currentSceneIndex)
      if (existingHandles && existingHandles.parent) {
        existingHandles.parent.removeChild(existingHandles)
        editHandlesRef.current.delete(currentSceneIndex)
      }
      
      // 텍스트가 실제로 존재하는지 확인
      const text = textsRef.current.get(currentSceneIndex)
      
      if (!text) {
        // loadAllScenes가 완료되지 않았으면 나중에 handleLoadComplete에서 처리됨
        if (!loadAllScenesCompletedRef.current) {
          return
        }
        // loadAllScenes가 완료되었는데도 텍스트가 없으면 핸들이 이미 그려져 있는지 확인
        const existingTextHandles = textEditHandlesRef.current.get(currentSceneIndex)
        if (existingTextHandles?.parent) {
          // 핸들이 이미 있으면 정상 (handleLoadComplete에서 이미 처리됨)
          return
        }
        return
      }
      
      // 현재 씬의 자막 핸들 표시
      // 편집 모드에서는 텍스트를 먼저 표시한 후 핸들 그리기
      text.visible = true
      text.alpha = 1
      
      const existingTextHandles = textEditHandlesRef.current.get(currentSceneIndex)
      if (!existingTextHandles || !existingTextHandles.parent) {
        try {
          drawTextEditHandlesRef.current(text, currentSceneIndex, handleTextResizeRef.current, saveTextTransformRef.current)
        } catch {
          // 자막 핸들 그리기 실패
        }
      }
      try {
        setupTextDragRef.current(text, currentSceneIndex)
      } catch {
        // 자막 드래그 설정 실패
      }
    }

    if (appRef.current) {
      // 렌더링은 PixiJS ticker가 처리
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, pixiReady, useFabricEditing])

  // 재생 시작 시 편집 모드 해제
  useEffect(() => {
    // isPlaying 사용 (Transport 또는 레거시)
    const playing = isPlaying
    if (playing && editMode !== 'none') {
      // 재생 중에는 편집 모드 해제
      setEditMode('none')
      setSelectedElementIndex(null)
      setSelectedElementType(null)
      
      // 모든 편집 핸들 제거
      editHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      editHandlesRef.current.clear()
      textEditHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      textEditHandlesRef.current.clear()
    }
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, editMode, setEditMode, setSelectedElementIndex, setSelectedElementType])
}
