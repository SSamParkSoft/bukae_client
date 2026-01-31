'use client'

import { useEffect } from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseEditHandlesManagerParams {
  containerRef: React.RefObject<PIXI.Container>
  pixiReady: boolean
  editMode: 'none' | 'image' | 'text'
  selectedElementIndex: number | null
  selectedElementType: 'image' | 'text' | null
  setSelectedElementIndex: (index: number | null) => void
  setSelectedElementType: (type: 'image' | 'text' | null) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  editHandlesRef: React.MutableRefObject<Map<number, PIXI.Graphics>>
  textEditHandlesRef: React.MutableRefObject<Map<number, PIXI.Graphics>>
  loadAllScenesCompletedRef: React.MutableRefObject<boolean>
  drawEditHandlesRef: React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>
  handleResizeRef: React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>
  saveImageTransformRef: React.MutableRefObject<() => void>
  setupSpriteDragRef: React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number) => void>
  drawTextEditHandlesRef: React.MutableRefObject<(text: PIXI.Text, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>
  handleTextResizeRef: React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>
  saveTextTransformRef: React.MutableRefObject<() => void>
  setupTextDragRef: React.MutableRefObject<(text: PIXI.Text, sceneIndex: number) => void>
  timelineRef: React.MutableRefObject<TimelineData | null>
}

/**
 * 편집 모드에 따른 핸들 표시/숨김을 관리하는 훅
 * - 편집 모드(none, image, text)에 따른 핸들 표시/숨김
 * - 이미지 편집 모드 핸들 관리
 * - 텍스트 편집 모드 핸들 관리
 * - 편집 모드 종료 시 핸들 정리
 */
export function useEditHandlesManager({
  containerRef,
  pixiReady,
  editMode,
  selectedElementIndex,
  selectedElementType,
  setSelectedElementIndex,
  setSelectedElementType,
  currentSceneIndexRef,
  spritesRef,
  textsRef,
  editHandlesRef,
  textEditHandlesRef,
  loadAllScenesCompletedRef,
  drawEditHandlesRef,
  handleResizeRef,
  saveImageTransformRef,
  setupSpriteDragRef,
  drawTextEditHandlesRef,
  handleTextResizeRef,
  saveTextTransformRef,
  setupTextDragRef,
  timelineRef,
}: UseEditHandlesManagerParams) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, pixiReady])
}
