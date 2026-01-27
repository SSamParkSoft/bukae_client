'use client'

import { useEffect, useRef } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'

interface UseEditModeManagerParams {
  // Refs
  containerRef: React.RefObject<PIXI.Container>
  appRef: React.RefObject<PIXI.Application>
  pixiContainerRef: React.RefObject<HTMLDivElement>
  fabricCanvasRef: React.RefObject<fabric.Canvas>
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

export function useEditModeManager({
  containerRef,
  appRef,
  pixiContainerRef,
  fabricCanvasRef,
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

  // Pixi 캔버스 포인터 이벤트 제어 및 Fabric 편집 시 숨김
  // 재생 중 또는 전환 효과 미리보기 중일 때는 PixiJS를 보여서 전환 효과가 보이도록 함
  useEffect(() => {
    if (!pixiContainerRef.current) return
    const pixiCanvas = pixiContainerRef.current.querySelector('canvas:not([data-fabric])') as HTMLCanvasElement
    if (!pixiCanvas) return
    
    // 재생 중이거나 전환 효과 미리보기 중이면 항상 PixiJS 보이기
    // 재생 중에는 isPreviewingTransition이 false여도 PixiJS를 보여야 함
    // 재생 중일 때는 다른 상태 변경에 영향받지 않도록 먼저 체크
    if (isPlaying || isPreviewingTransition) {
      pixiCanvas.style.opacity = '1'
      pixiCanvas.style.pointerEvents = 'none'
      pixiCanvas.style.zIndex = '10'
      return // 재생 중이면 여기서 종료하여 다른 조건에 영향받지 않도록 함
    }
    
    // 재생 중이 아닐 때만 편집 모드에 따라 canvas 표시/숨김 처리
    if (useFabricEditing && fabricReady) {
      // Fabric.js 편집 활성화 시 PixiJS 캔버스 숨김
      pixiCanvas.style.opacity = '0'
      pixiCanvas.style.pointerEvents = 'none'
      pixiCanvas.style.zIndex = '1'
    } else {
      // PixiJS 편집 모드: editMode가 'none'이 아니어도 보임 (편집 중에도 보여야 함)
      pixiCanvas.style.opacity = '1'
      pixiCanvas.style.pointerEvents = 'auto'
      pixiCanvas.style.zIndex = '10'
    }
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFabricEditing, fabricReady, pixiReady, isPlaying, isPreviewingTransition, editMode])

  // 재생 중 또는 전환 효과 미리보기 중일 때 Fabric.js 캔버스 숨기기
  useEffect(() => {
    if (!fabricCanvasRef.current) return
    const fabricCanvas = fabricCanvasRef.current
    
    if (isPlaying || isPreviewingTransition) {
      // 재생 중 또는 전환 효과 미리보기 중일 때 Fabric 캔버스 숨기기
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '0'
        fabricCanvas.wrapperEl.style.pointerEvents = 'none'
      }
    } else {
      // 재생 중이 아닐 때 Fabric 캔버스 보이기
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '1'
        fabricCanvas.wrapperEl.style.pointerEvents = 'auto'
      }
    }
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPreviewingTransition, fabricReady, useFabricEditing])

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
      } else {
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
      } else {
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
  }, [editMode, pixiReady])

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
