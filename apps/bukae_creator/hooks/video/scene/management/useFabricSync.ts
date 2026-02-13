/**
 * Fabric.js와 씬 상태 동기화 훅
 * Fabric.js 캔버스를 현재 씬 상태에 맞게 동기화합니다.
 */

import { useCallback, useRef } from 'react'
import * as fabric from 'fabric'
import { TimelineData } from '@/store/useVideoCreateStore'
import { calculateSpriteParams } from '@/utils/pixi'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import type { StageDimensions } from '../../types/common'

interface UseFabricSyncParams {
  useFabricEditing: boolean
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>
  fabricScaleRatioRef: React.MutableRefObject<number>
  currentSceneIndexRef: React.MutableRefObject<number>
  timeline: TimelineData | null
  stageDimensions: StageDimensions
  resolveSceneImageObject?: (params: {
    scene: TimelineData['scenes'][number]
    sceneIndex: number
    scale: number
    stageDimensions: StageDimensions
  }) => fabric.Object | null | Promise<fabric.Object | null>
  resolveSceneTextContent?: (params: {
    scene: TimelineData['scenes'][number]
    sceneIndex: number
  }) => string | null | undefined
}

/**
 * Fabric.js와 씬 상태를 동기화하는 훅
 */
export function useFabricSync({
  useFabricEditing,
  fabricCanvasRef,
  fabricScaleRatioRef,
  currentSceneIndexRef,
  timeline,
  stageDimensions,
  resolveSceneImageObject,
  resolveSceneTextContent,
}: UseFabricSyncParams) {
  const syncingRef = useRef(false)
  
  const syncFabricWithScene = useCallback(async () => {
    if (!useFabricEditing || !fabricCanvasRef.current || !timeline) return
    
    // 이미 동기화 중이면 무시
    if (syncingRef.current) return
    syncingRef.current = true
    
    try {
      const fabricCanvas = fabricCanvasRef.current
      const sceneIndex = currentSceneIndexRef.current
      const scene = timeline.scenes[sceneIndex]
      if (!scene) return
      
      const scale = fabricScaleRatioRef.current
      // 기존 객체 모두 제거 (Group 내부 객체까지 완전히 정리)
      const existingObjects = fabricCanvas.getObjects()
      existingObjects.forEach((obj) => {
        if (obj instanceof fabric.Group) {
          // Group 내부 객체도 모두 제거
          obj._objects.forEach((innerObj) => {
            if (innerObj.canvas && innerObj.canvas !== fabricCanvas) {
              innerObj.canvas.remove(innerObj)
            }
          })
        }
        fabricCanvas.remove(obj)
      })
      fabricCanvas.clear()

    const { width, height } = stageDimensions

    // 이미지 (좌표를 스케일 비율에 맞게 조정)
    if (resolveSceneImageObject) {
      try {
        const customImageObject = await resolveSceneImageObject({
          scene,
          sceneIndex,
          scale,
          stageDimensions,
        })
        if (customImageObject) {
          customImageObject.set({
            selectable: true,
            evented: true,
            centeredScaling: true,
            centeredRotation: true,
            lockScalingFlip: true,
          })
          ;(customImageObject as fabric.Object & { dataType?: 'image' | 'text' }).dataType ??= 'image'
          fabricCanvas.add(customImageObject)
        }
      } catch (error) {
        console.warn('[useFabricSync] 커스텀 이미지 오브젝트 생성 실패:', { sceneIndex, error })
      }
    } else if (scene.image) {
      try {
        const img = await (fabric.Image.fromURL as (url: string, options?: { crossOrigin?: string }) => Promise<fabric.Image>)(
          scene.image,
          { crossOrigin: 'anonymous' }
        ) as fabric.Image

        // img가 null이 아니고, 이미지가 제대로 로드되었는지 확인
        if (img && img.width && img.height && img.width > 0 && img.height > 0) {
          const transform = scene.imageTransform
          let centerX: number, centerY: number, imgScaleX: number, imgScaleY: number, angleDeg: number

          if (transform) {
            angleDeg = (transform.rotation || 0) * (180 / Math.PI)
            const effectiveWidth = transform.width * (transform.scaleX || 1)
            const effectiveHeight = transform.height * (transform.scaleY || 1)
            imgScaleX = (effectiveWidth / img.width) * scale
            imgScaleY = (effectiveHeight / img.height) * scale
            // transform.x와 transform.y는 중심점 좌표
            centerX = transform.x * scale
            centerY = transform.y * scale
          } else {
            // Transform이 없으면 imageFit을 사용하여 이미지 크기/위치 계산
            const imageFit = scene.imageFit || 'contain'
            const params = calculateSpriteParams(img.width, img.height, width, height, imageFit)
            imgScaleX = (params.width / img.width) * scale
            imgScaleY = (params.height / img.height) * scale
            // anchor가 (0.5, 0.5)이므로 중심점 좌표로 변환
            centerX = (params.x + params.width / 2) * scale
            centerY = (params.y + params.height / 2) * scale
            angleDeg = 0
          }

          // originX: 'center', originY: 'center'일 때 Fabric.js의 left/top 속성은 중심점 좌표를 의미함
          img.set({
            originX: 'center',
            originY: 'center',
            left: centerX, // 중심점 x 좌표
            top: centerY, // 중심점 y 좌표
            scaleX: imgScaleX,
            scaleY: imgScaleY,
            angle: angleDeg,
            selectable: true,
            evented: true,
            centeredScaling: true, // 리사이즈 시 중심점 유지
            centeredRotation: true, // 회전 시 중심점 유지
            lockScalingFlip: true,
          })
          ;(img as fabric.Image & { dataType?: 'image' | 'text' }).dataType = 'image'
          fabricCanvas.add(img)
        }
      } catch (error) {
        console.warn(
          '[useFabricSync] 이미지 로드 실패 (network/CORS/유효하지 않은 URL 등):',
          { sceneIndex, imageUrl: scene.image?.substring?.(0, 120), error }
        )
      }
    }

    // 텍스트 (좌표를 스케일 비율에 맞게 조정)
    const resolvedTextContent = scene.text?.content ?? resolveSceneTextContent?.({ scene, sceneIndex })
    if (resolvedTextContent && resolvedTextContent.trim()) {
      const transform = scene.text?.transform
      const angleDeg = (transform?.rotation || 0) * (180 / Math.PI)
      const baseFontSize = scene.text?.fontSize || 48
      const scaledFontSize = baseFontSize * scale
      const fontFamily = resolveSubtitleFontFamily(scene.text?.font)
      const fontWeight = scene.text?.fontWeight ?? (scene.text?.style?.bold ? 700 : 400)
      
      // transform.x와 transform.y는 중심점 좌표
      const centerX = (transform?.x ?? width / 2) * scale
      const centerY = (transform?.y ?? height * 0.9) * scale
      
      const strokeColor = scene.text?.stroke?.color || '#000000'
      const strokeWidth = scene.text?.stroke?.width ?? 10
      const fillColor = scene.text?.color || '#ffffff'
      
      // stroke가 있으면 두 레이어를 Group으로 묶어서 하나처럼 동작하도록 함
      if (strokeWidth > 0) {
        // stroke 레이어 (뒤): fill을 투명하게, stroke만 적용
        const strokeTextObj = new fabric.Textbox(resolvedTextContent, {
          left: 0, // Group 내부에서는 상대 좌표 사용
          top: 0,
          originX: 'center',
          originY: 'center',
          fontFamily,
          fontSize: scaledFontSize,
          fill: 'transparent', // fill을 투명하게 설정
          fontWeight,
          fontStyle: scene.text?.style?.italic ? 'italic' : 'normal',
          underline: scene.text?.style?.underline || false,
          textAlign: scene.text?.style?.align || 'center',
          selectable: false, // stroke 레이어는 선택 불가
          evented: false, // stroke 레이어는 이벤트 처리 안 함
          angle: 0, // Group 내부에서는 회전 없음
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        })
        
        // fill 레이어 (앞): fill만 설정, stroke 없음
        const fillTextObj = new fabric.Textbox(resolvedTextContent, {
          left: 0, // Group 내부에서는 상대 좌표 사용
          top: 0,
          originX: 'center',
          originY: 'center',
          fontFamily,
          fontSize: scaledFontSize,
          fill: fillColor,
          fontWeight,
          fontStyle: scene.text?.style?.italic ? 'italic' : 'normal',
          underline: scene.text?.style?.underline || false,
          textAlign: scene.text?.style?.align || 'center',
          selectable: false, // Group 내부 객체는 개별 선택 불가
          evented: false, // Group 내부 객체는 개별 이벤트 처리 안 함
          angle: 0, // Group 내부에서는 회전 없음
        })
        
        if (transform) {
          if (transform.width) {
            strokeTextObj.set({ width: transform.width * scale })
            fillTextObj.set({ width: transform.width * scale })
          }
        }
        
        // 두 객체를 Group으로 묶기
        // Fabric.js Group은 배열의 마지막 요소가 가장 위에 렌더링됨
        // 따라서 [strokeTextObj, fillTextObj] 순서로 하면 fillTextObj가 위에 렌더링됨
        const textGroup = new fabric.Group([strokeTextObj, fillTextObj], {
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          angle: angleDeg,
          selectable: true,
          evented: true,
        })
        
        // Group 내부 객체들이 캔버스에 직접 추가되지 않도록 보장
        textGroup._objects.forEach((obj) => {
          // Group 내부 객체는 캔버스에 직접 추가되면 안 됨
          if (obj.canvas && obj.canvas !== fabricCanvas) {
            obj.canvas.remove(obj)
          }
          // Group 내부 객체는 항상 selectable과 evented가 false여야 함
          obj.set({
            selectable: false,
            evented: false,
          })
        })
        
        // Group 내부 객체 순서 확인 및 조정
        // fillTextObj가 마지막(위)에 오도록 보장
        const objects = textGroup._objects
        const strokeIndex = objects.indexOf(strokeTextObj)
        const fillIndex = objects.indexOf(fillTextObj)
        
        if (fillIndex < strokeIndex) {
          // fillTextObj를 마지막으로 이동
          objects.splice(fillIndex, 1)
          objects.push(fillTextObj)
          // Group 업데이트
          textGroup.setCoords()
        }
        
        ;(textGroup as fabric.Group & { dataType?: 'image' | 'text' }).dataType = 'text'
        fabricCanvas.add(textGroup)
      } else {
        // stroke가 없으면 fill만 렌더링
        const textObj = new fabric.Textbox(resolvedTextContent, {
          left: centerX,
          top: centerY,
          originX: 'center',
          originY: 'center',
          fontFamily,
          fontSize: scaledFontSize,
          fill: fillColor,
          fontWeight,
          fontStyle: scene.text?.style?.italic ? 'italic' : 'normal',
          underline: scene.text?.style?.underline || false,
          textAlign: scene.text?.style?.align || 'center',
          selectable: true,
          evented: true,
          angle: angleDeg,
        })
        
        if (transform) {
          if (transform.width) {
            textObj.set({ width: transform.width * scale })
          }
        }
        
        ;(textObj as fabric.Textbox & { dataType?: 'image' | 'text' }).dataType = 'text'
        fabricCanvas.add(textObj)
      }
    }

      // renderAll 전에 모든 객체가 유효한지 확인
      try {
        const objects = fabricCanvas.getObjects()
        // destroyed된 객체나 null 객체 제거
        objects.forEach((obj) => {
          if (!obj || (obj as fabric.Object & { destroyed?: boolean }).destroyed) {
            fabricCanvas.remove(obj)
          }
        })
        fabricCanvas.renderAll()
      } catch (error) {
        console.error('[useFabricSync] renderAll 실패:', error)
      }
    } finally {
      syncingRef.current = false
    }
  }, [
    useFabricEditing,
    fabricCanvasRef,
    fabricScaleRatioRef,
    currentSceneIndexRef,
    timeline,
    stageDimensions,
    resolveSceneImageObject,
    resolveSceneTextContent,
  ])

  return {
    syncFabricWithScene,
  }
}
