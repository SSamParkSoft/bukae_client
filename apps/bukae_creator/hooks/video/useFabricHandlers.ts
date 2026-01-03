'use client'

import { useEffect, useCallback } from 'react'
import * as fabric from 'fabric'
import { TimelineData } from '@/store/useVideoCreateStore'

// 상수 정의
const TRANSFORM_SAVE_DELAY_MS = 200 // Transform 저장 후 플래그 해제 지연 시간
const DEFAULT_FONT_SIZE = 48 // 기본 폰트 크기
const DEFAULT_TEXT_COLOR = '#ffffff' // 기본 텍스트 색상
const DEFAULT_TEXT_ALIGN = 'center' // 기본 텍스트 정렬

interface UseFabricHandlersParams {
  fabricReady: boolean
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  fabricScaleRatioRef: React.MutableRefObject<number>
  isSavingTransformRef: React.MutableRefObject<boolean>
  savedSceneIndexRef: React.MutableRefObject<number | null>
  isManualSceneSelectRef: React.MutableRefObject<boolean>
}

/**
 * Fabric.js 이벤트 핸들러 관리 hook
 * Fabric.js 캔버스의 객체 수정, 텍스트 변경 등의 이벤트를 처리합니다.
 */
export function useFabricHandlers({
  fabricReady,
  fabricCanvasRef,
  timeline,
  setTimeline,
  currentSceneIndexRef,
  fabricScaleRatioRef,
  isSavingTransformRef,
  savedSceneIndexRef,
  isManualSceneSelectRef,
}: UseFabricHandlersParams) {
  /**
   * 이미지 Transform을 타임라인에 저장
   */
  const saveImageTransform = useCallback(
    (target: fabric.Object, sceneIndex: number) => {
      console.log(`[useFabricHandlers] 이미지 Transform 저장 | sceneIndex: ${sceneIndex}`)

      if (!timeline) {
        console.warn('[useFabricHandlers] timeline이 없습니다.')
        return
      }

      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale

      const nextTransform = {
        x: (target.left ?? 0) * invScale,
        y: (target.top ?? 0) * invScale,
        width: (target.getScaledWidth() ?? (target.width || 0)) * invScale,
        height: (target.getScaledHeight() ?? (target.height || 0)) * invScale,
        scaleX: 1,
        scaleY: 1,
        rotation: ((target.angle || 0) * Math.PI) / 180,
      }

      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === sceneIndex
            ? {
                ...scene,
                imageTransform: nextTransform,
              }
            : scene
        ),
      }

      setTimeline(nextTimeline)
      console.log(`[useFabricHandlers] 이미지 Transform 저장 완료 | sceneIndex: ${sceneIndex}`)
    },
    [timeline, setTimeline, fabricScaleRatioRef]
  )

  /**
   * 텍스트 Transform을 타임라인에 저장
   */
  const saveTextTransform = useCallback(
    (target: fabric.Textbox, sceneIndex: number, updateContent: boolean = false) => {
      console.log(`[useFabricHandlers] 텍스트 Transform 저장 | sceneIndex: ${sceneIndex}, updateContent: ${updateContent}`)

      if (!timeline) {
        console.warn('[useFabricHandlers] timeline이 없습니다.')
        return
      }

      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale

      const nextTransform = {
        x: (target.left ?? 0) * invScale,
        y: (target.top ?? 0) * invScale,
        width: (target.getScaledWidth() ?? (target.width || 0)) * invScale,
        height: (target.getScaledHeight() ?? (target.height || 0)) * invScale,
        scaleX: 1,
        scaleY: 1,
        rotation: ((target.angle || 0) * Math.PI) / 180,
      }

      const textContent = target.text ?? ''
      const baseFontSize = target.fontSize ?? DEFAULT_FONT_SIZE
      const textScaleY = target.scaleY ?? 1
      const actualFontSize = baseFontSize * textScaleY * invScale
      const fill = target.fill ?? DEFAULT_TEXT_COLOR
      const align = target.textAlign ?? DEFAULT_TEXT_ALIGN

      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === sceneIndex
            ? {
                ...scene,
                text: {
                  ...scene.text,
                  ...(updateContent && { content: textContent }),
                  fontSize: actualFontSize,
                  color: typeof fill === 'string' ? fill : DEFAULT_TEXT_COLOR,
                  style: {
                    ...scene.text.style,
                    align: align as 'left' | 'center' | 'right' | 'justify',
                  },
                  transform: nextTransform,
                },
              }
            : scene
        ),
      }

      setTimeline(nextTimeline)

      // 리사이즈 후 scale을 1로 리셋하고 fontSize를 실제 크기로 설정
      if (fabricCanvasRef.current) {
        target.set({
          fontSize: baseFontSize * textScaleY,
          scaleX: 1,
          scaleY: 1,
        })
        fabricCanvasRef.current.requestRenderAll()
      }

      console.log(`[useFabricHandlers] 텍스트 Transform 저장 완료 | sceneIndex: ${sceneIndex}`)
    },
    [timeline, setTimeline, fabricScaleRatioRef, fabricCanvasRef]
  )

  /**
   * 플래그 해제 (지연 후)
   */
  const clearFlags = useCallback(() => {
    console.log('[useFabricHandlers] 플래그 해제 예약 | delay:', TRANSFORM_SAVE_DELAY_MS, 'ms')
    setTimeout(() => {
      isSavingTransformRef.current = false
      isManualSceneSelectRef.current = false
      console.log('[useFabricHandlers] 플래그 해제 완료')
    }, TRANSFORM_SAVE_DELAY_MS)
  }, [isSavingTransformRef, isManualSceneSelectRef])

  /**
   * 객체 수정 핸들러
   */
  const handleModified = useCallback(
    (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e?.target as fabric.Object & { dataType?: 'image' | 'text' }
      const sceneIndex = currentSceneIndexRef.current

      if (!target) {
        console.warn('[useFabricHandlers] handleModified: target이 없습니다.')
        return
      }

      console.log(`[useFabricHandlers] 객체 수정 이벤트 | sceneIndex: ${sceneIndex}, dataType: ${target.dataType}`)

      // 씬 이동 방지: 현재 씬 인덱스 저장 및 플래그 설정
      const savedIndex = sceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true

      if (target.dataType === 'image') {
        saveImageTransform(target, savedIndex)
      } else if (target.dataType === 'text') {
        const textbox = target as fabric.Textbox
        saveTextTransform(textbox, savedIndex, true)
      }

      clearFlags()
    },
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, saveImageTransform, saveTextTransform, clearFlags]
  )

  /**
   * 텍스트 내용 변경 핸들러
   */
  const handleTextChanged = useCallback(
    (e: any) => {
      const target = e?.target as fabric.Textbox & { dataType?: 'image' | 'text' }
      if (!target || target.dataType !== 'text') {
        return
      }

      const sceneIndex = currentSceneIndexRef.current
      console.log(`[useFabricHandlers] 텍스트 내용 변경 | sceneIndex: ${sceneIndex}`)

      const savedIndex = sceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true

      if (!timeline) {
        console.warn('[useFabricHandlers] timeline이 없습니다.')
        return
      }

      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale

      const textContent = target.text ?? ''
      const scaledFontSize = target.fontSize ?? DEFAULT_FONT_SIZE
      const fontSize = scaledFontSize * invScale

      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === savedIndex
            ? {
                ...scene,
                text: {
                  ...scene.text,
                  content: textContent,
                  fontSize,
                },
              }
            : scene
        ),
      }

      setTimeline(nextTimeline)
      console.log(`[useFabricHandlers] 텍스트 내용 저장 완료 | sceneIndex: ${sceneIndex}`)

      clearFlags()
    },
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, timeline, setTimeline, fabricScaleRatioRef, clearFlags]
  )

  /**
   * 텍스트 편집 종료 핸들러
   */
  const handleTextEditingExited = useCallback(
    (e: any) => {
      const target = e?.target as fabric.Textbox & { dataType?: 'image' | 'text' }
      if (!target || target.dataType !== 'text') {
        return
      }

      const sceneIndex = currentSceneIndexRef.current
      console.log(`[useFabricHandlers] 텍스트 편집 종료 | sceneIndex: ${sceneIndex}`)

      const savedIndex = sceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true

      const textbox = target as fabric.Textbox
      saveTextTransform(textbox, savedIndex, true)

      clearFlags()
    },
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, saveTextTransform, clearFlags]
  )

  /**
   * 마우스 다운 핸들러 (현재는 빈 함수)
   */
  const handleMouseDown = useCallback((e: any) => {
    // 현재는 사용하지 않지만 이벤트 리스너 등록을 위해 유지
    const objects = fabricCanvasRef.current?.getObjects()
    if (objects) {
      console.log(`[useFabricHandlers] 마우스 다운 | objects: ${objects.length}`)
    }
  }, [fabricCanvasRef])

  // Fabric.js 이벤트 리스너 등록
  useEffect(() => {
    if (!fabricReady || !fabricCanvasRef.current || !timeline) {
      return
    }

    const fabricCanvas = fabricCanvasRef.current
    console.log('[useFabricHandlers] Fabric.js 이벤트 리스너 등록')

    fabricCanvas.on('object:modified', handleModified as any)
    fabricCanvas.on('mouse:down', handleMouseDown as any)
    fabricCanvas.on('text:changed', handleTextChanged as any)
    fabricCanvas.on('text:editing:exited', handleTextEditingExited as any)

    return () => {
      console.log('[useFabricHandlers] Fabric.js 이벤트 리스너 해제')
      fabricCanvas.off('object:modified', handleModified as any)
      fabricCanvas.off('mouse:down', handleMouseDown as any)
      fabricCanvas.off('text:changed', handleTextChanged as any)
      fabricCanvas.off('text:editing:exited', handleTextEditingExited as any)
    }
  }, [fabricReady, timeline, handleModified, handleMouseDown, handleTextChanged, handleTextEditingExited, fabricCanvasRef])
}

