'use client'

import { useEffect, useCallback, useRef } from 'react'
import * as fabric from 'fabric'
import { TimelineData } from '@/store/useVideoCreateStore'

// 상수 정의
const TRANSFORM_SAVE_DELAY_MS = 200 // Transform 저장 후 플래그 해제 지연 시간
const DEFAULT_FONT_SIZE = 48 // 기본 폰트 크기
const DEFAULT_TEXT_COLOR = '#ffffff' // 기본 텍스트 색상
const DEFAULT_TEXT_ALIGN = 'center' // 기본 텍스트 정렬

function toCenteredCoordinate(
  position: number,
  origin: string | undefined,
  scaledSize: number
): number {
  if (origin === 'left' || origin === 'top') {
    return position + scaledSize / 2
  }
  if (origin === 'right' || origin === 'bottom') {
    return position - scaledSize / 2
  }
  return position
}

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
  disableContinuousTextScaleCorrection?: boolean
  persistTimelineDuringTransform?: boolean
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
  disableContinuousTextScaleCorrection = false,
  persistTimelineDuringTransform = true,
}: UseFabricHandlersParams) {
  const timelineRef = useRef<TimelineData | null>(timeline)

  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  // Fabric 포인터 활성화 상태 (lower/upper 캔버스)
  useEffect(() => {
    if (!fabricCanvasElementRef?.current || editMode === undefined) return
    const lower = fabricCanvasElementRef.current
    const pointer = useFabricEditing ? 'auto' : 'none'
    if (lower) lower.style.pointerEvents = pointer
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
    fabricCanvas.renderAll()
  }, [fabricReady, editMode, useFabricEditing, fabricCanvasRef])

  /**
   * 이미지 Transform을 타임라인에 저장
   */
  const saveImageTransform = useCallback(
    (target: fabric.Object, sceneIndex: number) => {
      const currentTimeline = timelineRef.current
      if (!currentTimeline) {
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
        // getScaledWidth/getScaledHeight가 있으면 사용, 없으면 width/height * scaleX/scaleY 계산
        if (typeof target.getScaledWidth === 'function' && typeof target.getScaledHeight === 'function') {
          scaledWidth = target.getScaledWidth()
          scaledHeight = target.getScaledHeight()
        } else {
          // fabric.Rect 같은 경우 직접 계산
          const width = target.width || 0
          const height = target.height || 0
          const scaleX = target.scaleX || 1
          const scaleY = target.scaleY || 1
          scaledWidth = width * scaleX
          scaledHeight = height * scaleY
        }
      } catch (error) {
        console.warn('[useFabricHandlers] 크기 계산 에러:', error)
        // 폴백: width/height * scaleX/scaleY
        const width = target.width || 0
        const height = target.height || 0
        const scaleX = target.scaleX || 1
        const scaleY = target.scaleY || 1
        scaledWidth = width * scaleX
        scaledHeight = height * scaleY
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
        ...currentTimeline,
        scenes: currentTimeline.scenes.map((scene, idx) =>
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
    [setTimeline, fabricScaleRatioRef]
  )

  /**
   * 텍스트 Transform을 타임라인에 저장
   */
  const saveTextTransform = useCallback(
    (target: fabric.Textbox, sceneIndex: number, updateContent: boolean = false) => {
      const currentTimeline = timelineRef.current
      if (!currentTimeline) {
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

      const textContent = target.text ?? ''
      const existingSceneText = currentTimeline.scenes[sceneIndex]?.text
      const existingColor = existingSceneText?.color ?? DEFAULT_TEXT_COLOR
      const normalizedExistingColor = existingColor.trim().toLowerCase()
      const isExistingColorTransparent =
        normalizedExistingColor === 'transparent' ||
        normalizedExistingColor === 'rgba(0,0,0,0)' ||
        normalizedExistingColor === 'rgba(255,255,255,0.001)'
      const nextColor = isExistingColorTransparent ? DEFAULT_TEXT_COLOR : existingColor
      const existingHAlign = existingSceneText?.transform?.hAlign
      const alignFromStyle = existingSceneText?.style?.align ?? DEFAULT_TEXT_ALIGN
      const align = (existingHAlign === 'left' || existingHAlign === 'right' || existingHAlign === 'center')
        ? existingHAlign
        : alignFromStyle
      const hAlign = align === 'left' || align === 'right' ? align : 'center'

      const left = target.left ?? 0
      const top = target.top ?? 0
      const centerX = toCenteredCoordinate(left, target.originX, scaledWidth)
      const centerY = toCenteredCoordinate(top, target.originY, scaledHeight)

      const nextTransform = {
        x: centerX * invScale,
        y: centerY * invScale,
        width: scaledWidth * invScale,
        height: scaledHeight * invScale,
        scaleX: 1,
        scaleY: 1,
        rotation: ((target.angle || 0) * Math.PI) / 180,
        anchor: { x: 0.5, y: 0.5 },
        hAlign,
        vAlign: 'middle' as const,
      }

      // 폰트사이즈는 변경하지 않고 기존 값을 유지 (패스트트랙처럼 width만 변경)
      const existingFontSize = currentTimeline.scenes[sceneIndex]?.text?.fontSize ?? DEFAULT_FONT_SIZE

      const nextTimeline: TimelineData = {
        ...currentTimeline,
        scenes: currentTimeline.scenes.map((scene, idx) =>
          idx === sceneIndex
            ? {
                ...scene,
                text: {
                  ...scene.text,
                  ...(updateContent && { content: textContent }),
                  fontSize: existingFontSize, // 폰트사이즈는 변경하지 않음
                  color: nextColor,
                  style: {
                    ...scene.text.style,
                    align: align as 'left' | 'center' | 'right' | 'justify',
                  },
                  transform: nextTransform, // width만 변경됨
                },
              }
            : scene
        ),
      }

      setTimeline(nextTimeline)

      // 리사이즈 후 스케일을 width로 변환하고 scale을 1로 리셋 (패스트트랙처럼 width만 변경)
      // Fabric.js Textbox의 width를 변경하면 자동으로 줄바꿈이 일어남
      if (fabricCanvasRef.current && target && !(target as fabric.Object & { destroyed?: boolean }).destroyed) {
        try {
          // 스케일된 width를 실제 width로 변환
          const newWidth = scaledWidth
          const newHeight = scaledHeight
          
          // Group인 경우 내부 Textbox 객체들의 width를 업데이트해야 함
          if (target instanceof fabric.Group) {
            const group = target as fabric.Group
            // Group 내부의 모든 Textbox 객체에 width 업데이트
            group._objects.forEach((obj) => {
              if (obj instanceof fabric.Textbox) {
                const currentText = obj.text
                obj.set({
                  width: newWidth,
                  height: newHeight,
                })
                // width 변경 후 텍스트를 다시 설정하여 줄바꿈이 적용되도록 함
                obj.text = currentText || ''
              }
            })
            // Group 자체의 스케일은 1로 리셋
            group.set({
              scaleX: 1,
              scaleY: 1,
            })
          } else {
            // Group이 아닌 경우 직접 Textbox이므로 width 업데이트
            const currentText = (target as fabric.Textbox).text
            target.set({
              width: newWidth,
              height: newHeight,
              scaleX: 1,
              scaleY: 1,
            })
            // width 변경 후 텍스트를 다시 설정하여 줄바꿈이 적용되도록 함
            if (target instanceof fabric.Textbox) {
              target.text = currentText || ''
            }
          }
          fabricCanvasRef.current.requestRenderAll()
        } catch (error) {
          console.warn('[useFabricHandlers] target.set 에러:', error)
        }
      }

    },
    [setTimeline, fabricScaleRatioRef, fabricCanvasRef]
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
        
        // 텍스트의 경우: 스케일을 리셋하고 width만 유지
        if (target instanceof fabric.Group) {
          const group = target as fabric.Group
          // Group의 스케일을 1로 리셋
          group.set({
            scaleX: 1,
            scaleY: 1,
          })
          // 내부 Textbox 객체들의 스케일도 리셋
          group._objects.forEach((obj) => {
            if (obj instanceof fabric.Textbox) {
              obj.set({
                scaleX: 1,
                scaleY: 1,
              })
            }
          })
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.requestRenderAll()
          }
        } else {
          // Group이 아닌 경우: 직접 Textbox이므로 스케일 리셋
          target.set({
            scaleX: 1,
            scaleY: 1,
          })
          if (fabricCanvasRef.current) {
            fabricCanvasRef.current.requestRenderAll()
          }
        }
        
        saveTextTransform(textbox, savedIndex, true)
      }
      } catch (error) {
        console.error('[useFabricHandlers] handleModified 에러:', error)
      }

      clearFlags()
    },
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, saveImageTransform, saveTextTransform, clearFlags, fabricCanvasRef]
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

      const currentTimeline = timelineRef.current
      if (!currentTimeline) {
        return
      }

      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale

      const textContent = target.text ?? ''
      const scaledFontSize = target.fontSize ?? DEFAULT_FONT_SIZE
      const fontSize = scaledFontSize * invScale

      const nextTimeline: TimelineData = {
        ...currentTimeline,
        scenes: currentTimeline.scenes.map((scene, idx) =>
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
    [currentSceneIndexRef, isSavingTransformRef, savedSceneIndexRef, isManualSceneSelectRef, setTimeline, fabricScaleRatioRef, clearFlags]
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

  /**
   * 드래그/리사이즈 중 실시간 업데이트 핸들러
   */
  const handleMoving = useCallback(
    (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      if (!persistTimelineDuringTransform) {
        return
      }
      const target = e?.target as fabric.Object & { dataType?: 'image' | 'text' }
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }

      if (target.dataType === 'image') {
        saveImageTransform(target, currentSceneIndexRef.current)
      } else if (target.dataType === 'text') {
        saveTextTransform(target as fabric.Textbox, currentSceneIndexRef.current, false)
      }
    },
    [currentSceneIndexRef, saveImageTransform, saveTextTransform, persistTimelineDuringTransform]
  )

  const handleScaling = useCallback(
    (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e?.target as fabric.Object & { dataType?: 'image' | 'text' }
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }

      // 텍스트의 경우 width만 갱신하고 폰트사이즈는 유지한다.
      if (target.dataType === 'text') {
        if (!timelineRef.current || !fabricCanvasRef.current) {
          return
        }
        
        // 패스트트랙처럼: 리사이즈 중에 스케일을 완전히 막고 width만 변경
        // Fabric.js의 object:scaling 이벤트에서 스케일을 즉시 리셋하고 width만 업데이트
        // 동기적으로 처리하여 시각적 스케일링이 보이지 않도록 함
        
        if (target instanceof fabric.Group) {
          // Group인 경우: 내부 Textbox 객체들의 width를 업데이트
          const group = target as fabric.Group
          
          // 현재 스케일된 크기 계산 (스케일이 적용되기 전에 계산)
          let scaledWidth: number
          let scaledHeight: number
          try {
            // 스케일이 적용된 현재 크기 계산
            const currentScaleX = group.scaleX ?? 1
            const currentScaleY = group.scaleY ?? 1
            const baseWidth = group.width ?? 0
            const baseHeight = group.height ?? 0
            scaledWidth = baseWidth * currentScaleX
            scaledHeight = baseHeight * currentScaleY
          } catch (error) {
            console.warn('[useFabricHandlers] Group 크기 계산 에러:', error)
            scaledWidth = group.width || 0
            scaledHeight = group.height || 0
          }
          
          // 패스트트랙처럼: 스케일을 즉시 1로 고정하고 width만 변경
          // 동기적으로 처리하여 시각적 스케일링이 보이지 않도록 함
          // 내부 Textbox 객체들의 width 업데이트 및 스케일 리셋 (먼저 처리)
          group._objects.forEach((obj) => {
            if (obj instanceof fabric.Textbox) {
              const currentText = obj.text
              // 스케일을 즉시 1로 고정하고 width만 업데이트 (폰트 사이즈는 변경하지 않음)
              obj.set({
                scaleX: 1,
                scaleY: 1,
                width: scaledWidth,
                height: scaledHeight,
              })
              // width 변경 후 텍스트를 다시 설정하여 줄바꿈이 적용되도록 함
              obj.text = currentText || ''
              obj.setCoords()
            }
          })
          
          // Group 자체의 스케일 리셋 및 width 업데이트
          group.set({
            scaleX: 1,
            scaleY: 1,
            width: scaledWidth,
            height: scaledHeight,
          })
          group.setCoords()
          
          // 즉시 렌더링하여 스케일이 적용된 상태가 보이지 않도록 함
          fabricCanvasRef.current.requestRenderAll()
          
          if (!disableContinuousTextScaleCorrection) {
            // 리사이즈가 계속 진행 중이면 매 프레임마다 스케일 체크 및 리셋
            const checkAndResetScale = () => {
              if (group && !(group as fabric.Object & { destroyed?: boolean }).destroyed && fabricCanvasRef.current) {
                const activeObject = fabricCanvasRef.current.getActiveObject()
                if (activeObject !== group) {
                  return // 리사이즈가 끝났으면 체크 중단
                }
                
                let needsReset = false
                
                // Group 스케일 체크
                if (group.scaleX !== 1 || group.scaleY !== 1) {
                  const currentScaleX = group.scaleX ?? 1
                  const currentScaleY = group.scaleY ?? 1
                  const baseWidth = group.width ?? 0
                  const baseHeight = group.height ?? 0
                  const newWidth = baseWidth * currentScaleX
                  const newHeight = baseHeight * currentScaleY
                  
                  group._objects.forEach((obj) => {
                    if (obj instanceof fabric.Textbox) {
                      const currentText = obj.text
                      obj.set({
                        scaleX: 1,
                        scaleY: 1,
                        width: newWidth,
                        height: newHeight,
                      })
                      obj.text = currentText || ''
                      obj.setCoords()
                    }
                  })
                  
                  group.set({
                    scaleX: 1,
                    scaleY: 1,
                    width: newWidth,
                    height: newHeight,
                  })
                  group.setCoords()
                  needsReset = true
                }
                
                // 내부 Textbox 스케일 체크
                group._objects.forEach((obj) => {
                  if (obj instanceof fabric.Textbox && !(obj as fabric.Object & { destroyed?: boolean }).destroyed) {
                    if (obj.scaleX !== 1 || obj.scaleY !== 1) {
                      const currentScaleX = obj.scaleX ?? 1
                      const currentScaleY = obj.scaleY ?? 1
                      const baseWidth = obj.width ?? 0
                      const baseHeight = obj.height ?? 0
                      const currentText = obj.text
                      
                      obj.set({
                        scaleX: 1,
                        scaleY: 1,
                        width: baseWidth * currentScaleX,
                        height: baseHeight * currentScaleY,
                      })
                      obj.text = currentText || ''
                      obj.setCoords()
                      needsReset = true
                    }
                  }
                })
                
                if (needsReset) {
                  fabricCanvasRef.current.requestRenderAll()
                }
                
                // 다음 프레임에서도 계속 체크
                requestAnimationFrame(checkAndResetScale)
              }
            }
            
            // 다음 프레임부터 계속 체크
            requestAnimationFrame(checkAndResetScale)
          }
        } else {
          // Group이 아닌 경우: 일반 Textbox 처리
          const textbox = target as fabric.Textbox
          
          // 스케일이 적용된 현재 크기 계산
          const currentScaleX = textbox.scaleX ?? 1
          const currentScaleY = textbox.scaleY ?? 1
          const baseWidth = textbox.width ?? 0
          const baseHeight = textbox.height ?? 0
          const scaledWidth = baseWidth * currentScaleX
          const scaledHeight = baseHeight * currentScaleY
          const currentText = textbox.text
          
          // 패스트트랙처럼: 스케일을 즉시 1로 고정하고 width만 변경
          // 동기적으로 처리하여 시각적 스케일링이 보이지 않도록 함
          textbox.set({
            scaleX: 1,
            scaleY: 1,
            width: scaledWidth,
            height: scaledHeight,
          })
          // width 변경 후 텍스트를 다시 설정하여 줄바꿈이 적용되도록 함 (폰트 사이즈는 변경하지 않음)
          textbox.text = currentText || ''
          textbox.setCoords()
          
          // 즉시 렌더링하여 스케일이 적용된 상태가 보이지 않도록 함
          fabricCanvasRef.current.requestRenderAll()
          
          if (!disableContinuousTextScaleCorrection) {
            // 리사이즈가 계속 진행 중이면 매 프레임마다 스케일 체크 및 리셋
            const checkAndResetScale = () => {
              if (textbox && !(textbox as fabric.Object & { destroyed?: boolean }).destroyed && fabricCanvasRef.current) {
                const activeObject = fabricCanvasRef.current.getActiveObject()
                if (activeObject !== textbox) {
                  return // 리사이즈가 끝났으면 체크 중단
                }
                
                if (textbox.scaleX !== 1 || textbox.scaleY !== 1) {
                  const currentScaleX = textbox.scaleX ?? 1
                  const currentScaleY = textbox.scaleY ?? 1
                  const baseWidth = textbox.width ?? 0
                  const baseHeight = textbox.height ?? 0
                  const currentText = textbox.text
                  
                  textbox.set({
                    scaleX: 1,
                    scaleY: 1,
                    width: baseWidth * currentScaleX,
                    height: baseHeight * currentScaleY,
                  })
                  textbox.text = currentText || ''
                  textbox.setCoords()
                  fabricCanvasRef.current.requestRenderAll()
                }
                
                // 다음 프레임에서도 계속 체크
                requestAnimationFrame(checkAndResetScale)
              }
            }
            
            // 다음 프레임부터 계속 체크
            requestAnimationFrame(checkAndResetScale)
          }
        }
        if (persistTimelineDuringTransform) {
          saveTextTransform(target as fabric.Textbox, currentSceneIndexRef.current, false)
        }
      } else if (target.dataType === 'image') {
        if (persistTimelineDuringTransform) {
          saveImageTransform(target, currentSceneIndexRef.current)
        }
      }
    },
    [currentSceneIndexRef, saveImageTransform, saveTextTransform, fabricCanvasRef, disableContinuousTextScaleCorrection, persistTimelineDuringTransform]
  )

  const handleRotating = useCallback(
    (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      if (!persistTimelineDuringTransform) {
        return
      }
      const target = e?.target as fabric.Object & { dataType?: 'image' | 'text' }
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }

      if (target.dataType === 'image') {
        saveImageTransform(target, currentSceneIndexRef.current)
      } else if (target.dataType === 'text') {
        const textbox = target as fabric.Textbox
        saveTextTransform(textbox, currentSceneIndexRef.current, false)
      }
    },
    [currentSceneIndexRef, saveImageTransform, saveTextTransform, persistTimelineDuringTransform]
  )

  // Fabric.js 이벤트 리스너 등록
  useEffect(() => {
    // Fabric.js 편집 모드가 비활성화되어 있으면 핸들러 등록하지 않음
    if (!useFabricEditing) {
      return
    }
    
    // 조건이 만족되지 않으면 리턴 (조건이 만족되면 자동으로 다시 실행됨)
    // fabricReady 대신 fabricCanvasRef.current를 직접 확인 (더 정확함)
    if (!fabricCanvasRef.current) {
      return
    }

    const fabricCanvas = fabricCanvasRef.current
    
    // 이벤트 핸들러 등록
    // 드래그/리사이즈 중 실시간 업데이트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:moving', handleMoving as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:scaling', handleScaling as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:rotating', handleRotating as any)
    // 드래그/리사이즈 완료 후 최종 저장
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:modified', handleModified as any)
    // 텍스트 관련 이벤트
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('text:changed', handleTextChanged as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('text:editing:exited', handleTextEditingExited as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:moving', handleMoving as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:scaling', handleScaling as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:rotating', handleRotating as any)
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
    fabricCanvasRef,
    handleMoving,
    handleScaling,
    handleRotating,
    handleModified,
    handleTextChanged,
    handleTextEditingExited,
  ])
}
