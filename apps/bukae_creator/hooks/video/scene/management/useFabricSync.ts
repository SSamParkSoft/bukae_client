/**
 * Fabric.js와 씬 상태 동기화 훅
 * Fabric.js 캔버스를 현재 씬 상태에 맞게 동기화합니다.
 */

import { useCallback } from 'react'
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
}: UseFabricSyncParams) {
  const syncFabricWithScene = useCallback(async () => {
    if (!useFabricEditing || !fabricCanvasRef.current || !timeline) return
    
    const fabricCanvas = fabricCanvasRef.current
    const sceneIndex = currentSceneIndexRef.current
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    
    const scale = fabricScaleRatioRef.current
    fabricCanvas.clear()

    const { width, height } = stageDimensions

    // 이미지 (좌표를 스케일 비율에 맞게 조정)
    if (scene.image) {
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
            top: centerY,  // 중심점 y 좌표
            scaleX: imgScaleX,
            scaleY: imgScaleY,
            angle: angleDeg,
            selectable: true,
            evented: true,
            centeredScaling: true, // 리사이즈 시 중심점 유지
            centeredRotation: true, // 회전 시 중심점 유지
          })
          ;(img as fabric.Image & { dataType?: 'image' | 'text' }).dataType = 'image'
          fabricCanvas.add(img)
        }
      } catch (error) {
        // 이미지 로드 실패 시 무시
      }
    }

    // 텍스트 (좌표를 스케일 비율에 맞게 조정)
    if (scene.text?.content) {
      const transform = scene.text.transform
      const angleDeg = (transform?.rotation || 0) * (180 / Math.PI)
      const baseFontSize = scene.text.fontSize || 48
      const scaledFontSize = baseFontSize * scale
      const fontFamily = resolveSubtitleFontFamily(scene.text.font)
      const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
      
      // transform.x와 transform.y는 중심점 좌표
      const centerX = (transform?.x ?? width / 2) * scale
      const centerY = (transform?.y ?? height * 0.9) * scale
      
      const textObj = new fabric.Textbox(scene.text.content, {
        left: centerX, // 중심점 x 좌표
        top: centerY,  // 중심점 y 좌표
        originX: 'center',
        originY: 'center',
        fontFamily,
        fontSize: scaledFontSize,
        fill: scene.text.color || '#ffffff',
        fontWeight,
        fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
        underline: scene.text.style?.underline || false,
        textAlign: scene.text.style?.align || 'center',
        selectable: true,
        evented: true,
        angle: angleDeg,
      })
      
      if (transform) {
        // width가 있으면 박스 크기 반영
        if (transform.width) {
          textObj.set({ width: transform.width * scale })
        }
        // scaleX/scaleY는 이미 fontSize와 width에 반영됨
      }
      
      ;(textObj as fabric.Textbox & { dataType?: 'image' | 'text' }).dataType = 'text'
      fabricCanvas.add(textObj)
    }

    // renderAll 전에 모든 객체가 유효한지 확인
    try {
      const objects = fabricCanvas.getObjects()
      // destroyed된 객체나 null 객체 제거
      objects.forEach((obj, index) => {
        if (!obj || (obj as fabric.Object & { destroyed?: boolean }).destroyed) {
          fabricCanvas.remove(obj)
        }
      })
      fabricCanvas.renderAll()
    } catch (error) {
      // renderAll 에러 시 무시
    }
  }, [useFabricEditing, fabricCanvasRef, fabricScaleRatioRef, currentSceneIndexRef, timeline, stageDimensions])

  return {
    syncFabricWithScene,
  }
}

