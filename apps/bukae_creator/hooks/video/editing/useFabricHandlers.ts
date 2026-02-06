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
  useFabricEditing?: boolean // Fabric.js 편집 모드 활성화 여부
  /** 포인터/선택 UI 동기화용 (단일 책임: Fabric 캔버스 UI 상태) */
  fabricCanvasElementRef?: React.RefObject<HTMLCanvasElement | null>
  editMode?: 'none' | 'image' | 'text'
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
  useFabricEditing = false,
  fabricCanvasElementRef,
  editMode,
}: UseFabricHandlersParams) {
  // Fabric 포인터 활성화 상태 (lower/upper 캔버스)
  useEffect(() => {
    if (!fabricCanvasElementRef?.current || editMode === undefined) return
    const lower = fabricCanvasElementRef.current
    const upper = fabricCanvasRef.current?.upperCanvasEl
    const pointer = useFabricEditing ? 'auto' : 'none'
    if (lower) lower.style.pointerEvents = pointer
    if (upper) upper.style.pointerEvents = pointer
  }, [editMode, useFabricEditing, fabricCanvasRef, fabricCanvasElementRef])

  // Fabric 오브젝트 선택 가능 여부 (편집 모드에 맞춰 갱신)
  useEffect(() => {
    if (!fabricReady || !fabricCanvasRef.current || !useFabricEditing) return
    const fabricCanvas = fabricCanvasRef.current
    fabricCanvas.selection = true
    fabricCanvas.forEachObject((obj: fabric.Object & { dataType?: 'image' | 'text' }) => {
      obj.set({
        selectable: true,
        evented: true,
        lockScalingFlip: true,
        hoverCursor: 'move',
        moveCursor: 'move',
      })
    })
    fabricCanvas.discardActiveObject()
    fabricCanvas.renderAll()
  }, [fabricReady, editMode, useFabricEditing, fabricCanvasRef])

  /**
   * 이미지 Transform을 타임라인에 저장
   */
  const saveImageTransform = useCallback(
    (target: fabric.Object, sceneIndex: number) => {
      if (!timeline) {
        return
      }

      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale

      // Fabric.js의 이미지는 originX: 'center', originY: 'center'로 설정되어 있음
      // 따라서 left와 top이 이미 중심점 좌표임
      // target이 null이거나 destroyed 상태인지 확인
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }
      
      let scaledWidth: number
      let scaledHeight: number
      try {
        scaledWidth = target.getScaledWidth?.() ?? (target.width || 0)
        scaledHeight = target.getScaledHeight?.() ?? (target.height || 0)
      } catch (error) {
        console.warn('[useFabricHandlers] getScaledWidth/getScaledHeight 에러:', error)
        scaledWidth = target.width || 0
        scaledHeight = target.height || 0
      }
      const centerX = target.left ?? 0
      const centerY = target.top ?? 0

      const nextTransform = {
        x: centerX * invScale,
        y: centerY * invScale,
        width: scaledWidth * invScale,
        height: scaledHeight * invScale,
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

      // 중요: width/height 변경을 하지 않음
      // 이유: Fabric.js에서 width/height를 변경하면 내부적으로 좌표를 재계산하는데,
      // 이 과정에서 originX/originY 설정이 제대로 적용되지 않아 왼쪽 상단으로 튀는 문제 발생
      // 
      // 해결책: 타임라인에만 실제 크기(width, height)와 scaleX: 1, scaleY: 1로 저장하고,
      // Fabric.js 객체는 리사이즈된 상태(scaleX/scaleY가 변경된 상태)로 그대로 둠
      // 다음에 로드할 때 useFabricSync에서 타임라인의 width/height를 기반으로 올바르게 복원됨
    },
    [timeline, setTimeline, fabricScaleRatioRef]
  )

  /**
   * 텍스트 Transform을 타임라인에 저장
   */
  const saveTextTransform = useCallback(
    (target: fabric.Textbox, sceneIndex: number, updateContent: boolean = false) => {
      if (!timeline) {
        return
      }

      // target이 null이거나 destroyed 상태인지 확인
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }

      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale

      let scaledWidth: number
      let scaledHeight: number
      try {
        scaledWidth = target.getScaledWidth?.() ?? (target.width || 0)
        scaledHeight = target.getScaledHeight?.() ?? (target.height || 0)
      } catch (error) {
        console.warn('[useFabricHandlers] getScaledWidth/getScaledHeight 에러:', error)
        scaledWidth = target.width || 0
        scaledHeight = target.height || 0
      }

      // Fabric.js의 originX/originY 확인 (중요: anchor 정보 파악)
      const originX = (target as fabric.Object).originX || 'left'
      const originY = (target as fabric.Object).originY || 'top'
      
      const nextTransform = {
        x: (target.left ?? 0) * invScale,
        y: (target.top ?? 0) * invScale,
        width: scaledWidth * invScale,
        height: scaledHeight * invScale,
        scaleX: 1,
        scaleY: 1,
        rotation: ((target.angle || 0) * Math.PI) / 180,
      }

      // 디버깅: Fabric.js에서 텍스트 transform 저장 시 로그
      console.log('[useFabricHandlers] 텍스트 Transform 저장:', {
        sceneIndex,
        fabric: {
          left: target.left,
          top: target.top,
          originX,
          originY,
          width: target.width,
          scaledWidth,
          textAlign: target.textAlign,
        },
        transform: nextTransform,
        scale,
        invScale,
      })

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
      if (fabricCanvasRef.current && target && !(target as fabric.Object & { destroyed?: boolean }).destroyed) {
        try {
          target.set({
            fontSize: baseFontSize * textScaleY,
            scaleX: 1,
            scaleY: 1,
          })
          fabricCanvasRef.current.requestRenderAll()
        } catch (error) {
          console.warn('[useFabricHandlers] target.set 에러:', error)
        }
      }

    },
    [timeline, setTimeline, fabricScaleRatioRef, fabricCanvasRef]
  )

  /**
   * 플래그 해제 (지연 후)
   */
  const clearFlags = useCallback(() => {
    setTimeout(() => {
      isSavingTransformRef.current = false
      isManualSceneSelectRef.current = false
    }, TRANSFORM_SAVE_DELAY_MS)
  }, [isSavingTransformRef, isManualSceneSelectRef])

  /**
   * 객체 수정 핸들러
   */
  const handleModified = useCallback(
    (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e?.target as fabric.Object & { dataType?: 'image' | 'text' }
      const sceneIndex = currentSceneIndexRef.current

      // target이 null이거나 destroyed 상태인지 확인
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }

      // 리사이즈 완료 후 객체 속성 초기화
      if (target.dataType === 'image') {
        const imageTarget = target as fabric.Object & { resizeStartCenter?: { x: number; y: number } }
        if (imageTarget.resizeStartCenter) {
          delete imageTarget.resizeStartCenter
        }
      }

      // 씬 이동 방지: 현재 씬 인덱스 저장 및 플래그 설정
      const savedIndex = sceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true

      try {
        if (target.dataType === 'image') {
          saveImageTransform(target, savedIndex)
        } else if (target.dataType === 'text') {
          const textbox = target as fabric.Textbox
          saveTextTransform(textbox, savedIndex, true)
        }
      } catch (error) {
        console.error('[useFabricHandlers] handleModified 에러:', error)
      }

      clearFlags()
    },
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, saveImageTransform, saveTextTransform, clearFlags]
  )

  /**
   * 텍스트 내용 변경 핸들러
   */
  const handleTextChanged = useCallback(
    (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e?.target as fabric.Textbox & { dataType?: 'image' | 'text' }
      // target이 null이거나 destroyed 상태인지 확인
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed || target.dataType !== 'text') {
        return
      }

      const sceneIndex = currentSceneIndexRef.current
      const savedIndex = sceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true

      if (!timeline) {
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
      clearFlags()
    },
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, timeline, setTimeline, fabricScaleRatioRef, clearFlags]
  )

  /**
   * 텍스트 편집 종료 핸들러
   */
  const handleTextEditingExited = useCallback(
    (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e?.target as fabric.Textbox & { dataType?: 'image' | 'text' }
      // target이 null이거나 destroyed 상태인지 확인
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed || target.dataType !== 'text') {
        return
      }

      const sceneIndex = currentSceneIndexRef.current
      const savedIndex = sceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true

      try {
        const textbox = target as fabric.Textbox
        saveTextTransform(textbox, savedIndex, true)
      } catch (error) {
        console.error('[useFabricHandlers] handleTextEditingExited 에러:', error)
      }

      clearFlags()
    },
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, saveTextTransform, clearFlags]
  )

  // 불필요한 복잡한 리사이즈 핸들러들 제거
  // centeredScaling: true 옵션으로 충분히 처리됨

  // Fabric.js 이벤트 리스너 등록
  useEffect(() => {
    // Fabric.js 편집 모드가 비활성화되어 있으면 핸들러 등록하지 않음
    if (!useFabricEditing) {
      return
    }
    
    // 조건이 만족되지 않으면 리턴 (조건이 만족되면 자동으로 다시 실행됨)
    if (!fabricReady || !fabricCanvasRef.current || !timeline) {
      return
    }

    const fabricCanvas = fabricCanvasRef.current
    
    // 이벤트 핸들러 등록
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:modified', handleModified as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('text:changed', handleTextChanged as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('text:editing:exited', handleTextEditingExited as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:modified', handleModified as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('text:changed', handleTextChanged as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('text:editing:exited', handleTextEditingExited as any)
    }
  }, [
    useFabricEditing,
    fabricReady,
    timeline,
    fabricCanvasRef,
    handleModified,
    handleTextChanged,
    handleTextEditingExited,
  ])
}

