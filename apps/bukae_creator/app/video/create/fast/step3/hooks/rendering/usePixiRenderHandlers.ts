'use client'

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'

interface UsePixiRenderHandlersParams {
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  editHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  textEditHandlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  editModeRef: React.MutableRefObject<'none' | 'image' | 'text'>
  setupSpriteDrag: (sprite: PIXI.Sprite, sceneIndex: number) => void
  setupTextDrag: (text: PIXI.Text, sceneIndex: number) => void
  drawEditHandles: (sprite: PIXI.Sprite, sceneIndex: number, handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void, saveImageTransform: (sceneIndex: number, sprite: PIXI.Sprite) => void) => void
  drawTextEditHandles: (text: PIXI.Text, sceneIndex: number, handleTextResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void, saveTextTransform: (sceneIndex: number, text: PIXI.Text) => void) => void
  handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void
  saveImageTransform: (sceneIndex: number, sprite: PIXI.Sprite) => void
  handleTextResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void
  saveTextTransform: (sceneIndex: number, text: PIXI.Text) => void
}

/**
 * PixiJS 렌더링 핸들러 훅
 * 애니메이션 완료 및 로드 완료 핸들러를 제공합니다.
 */
export function usePixiRenderHandlers({
  spritesRef,
  textsRef,
  editHandlesRef,
  textEditHandlesRef,
  editModeRef,
  setupSpriteDrag,
  setupTextDrag,
  drawEditHandles,
  drawTextEditHandles,
  handleResize,
  saveImageTransform,
  handleTextResize,
  saveTextTransform,
}: UsePixiRenderHandlersParams) {
  // 애니메이션 완료 후 드래그 설정 재적용
  const handleAnimationComplete = useCallback((sceneIndex: number) => {
    const sprite = spritesRef.current.get(sceneIndex)
    const text = textsRef.current.get(sceneIndex)
    
    if (sprite && sprite.visible) {
      setupSpriteDrag(sprite, sceneIndex)
    }
    
    if (text && text.visible) {
      setupTextDrag(text, sceneIndex)
    }
  }, [setupSpriteDrag, setupTextDrag, spritesRef, textsRef])

  // 로드 완료 후 드래그 설정 재적용 및 핸들 표시
  const handleLoadComplete = useCallback((sceneIndex: number) => {
    const sprite = spritesRef.current.get(sceneIndex)
    const text = textsRef.current.get(sceneIndex)
    
    // 편집 모드일 때 스프라이트와 텍스트를 먼저 표시 (핸들을 그리기 전에)
    const currentEditMode = editModeRef.current
    // isPlaying은 Transport에서 가져오므로 여기서는 ref를 직접 사용
    // 재생 중이 아니라고 가정 (편집 모드이므로)
    const isPlaying = false
    
    if (currentEditMode === 'image' || currentEditMode === 'text') {
      // 재생 중이 아니면 스프라이트와 텍스트를 표시
      if (!isPlaying) {
        if (sprite) {
          sprite.visible = true
          sprite.alpha = 1
        }
        if (text) {
          text.visible = true
          text.alpha = 1
        }
      }
    }
    
    if (sprite) {
      setupSpriteDrag(sprite, sceneIndex)
    }
    
    if (text) {
      setupTextDrag(text, sceneIndex)
    }
    
    // 편집 모드일 때 핸들 표시 (updateCurrentScene 완료 후)
    if (currentEditMode === 'image') {
      // 이미지 편집 모드일 때는 이미지 핸들만 표시하고 자막 핸들은 제거
      const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
      if (existingTextHandles && existingTextHandles.parent) {
        existingTextHandles.parent.removeChild(existingTextHandles)
        textEditHandlesRef.current.delete(sceneIndex)
      }
      
      // 스프라이트가 visible하고 alpha가 0보다 클 때만 핸들 그리기
      if (sprite && sprite.visible && sprite.alpha > 0) {
        const existingHandles = editHandlesRef.current.get(sceneIndex)
        if (!existingHandles || !existingHandles.parent) {
          try {
            drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)
          } catch {
            // 이미지 핸들 그리기 실패
          }
        }
      }
    } else if (currentEditMode === 'text') {
      // 자막 편집 모드일 때는 자막 핸들만 표시하고 이미지 핸들은 제거
      const existingHandles = editHandlesRef.current.get(sceneIndex)
      if (existingHandles && existingHandles.parent) {
        existingHandles.parent.removeChild(existingHandles)
        editHandlesRef.current.delete(sceneIndex)
      }
      
      // 텍스트가 visible하고 alpha가 0보다 클 때만 핸들 그리기
      if (text && text.visible && text.alpha > 0) {
        const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
        if (!existingTextHandles || !existingTextHandles.parent) {
          try {
            drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)
          } catch {
            // 자막 핸들 그리기 실패
          }
        }
      }
    }
  }, [
    setupSpriteDrag,
    setupTextDrag,
    drawEditHandles,
    drawTextEditHandles,
    handleResize,
    saveImageTransform,
    handleTextResize,
    saveTextTransform,
    spritesRef,
    textsRef,
    editHandlesRef,
    textEditHandlesRef,
    editModeRef,
  ])

  return {
    handleAnimationComplete,
    handleLoadComplete,
  }
}
