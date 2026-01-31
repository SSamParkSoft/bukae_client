/**
 * Fabric 위치 유틸리티
 * Fabric canvas에서 사용자가 설정한 원래 위치를 가져오는 공통 함수
 */

import * as fabric from 'fabric'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { calculateSpriteParams } from '@/utils/pixi/sprite'
import type { StageDimensions } from '../../types/common'

/**
 * Fabric에서 이미지의 원래 위치 정보
 */
export interface FabricImagePosition {
  x: number
  y: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  rotation: number
}

/**
 * Fabric canvas에서 사용자가 설정한 이미지의 원래 위치를 가져옴
 * 
 * 우선순위:
 * 1. imageFit 사용 (imageFit이 명시적으로 설정된 경우, imageTransform보다 우선)
 * 2. scene.imageTransform 사용 (사용자가 수동으로 설정한 위치, imageFit이 없을 때만)
 * 3. Fabric canvas에서 직접 가져오기 (imageTransform과 imageFit이 모두 없는 경우)
 * 4. 기본 위치 사용 (최종 fallback, fill)
 * 
 * @param sceneIndex 씬 인덱스
 * @param scene 씬 데이터
 * @param fabricCanvasRef Fabric canvas ref
 * @param fabricScaleRatioRef Fabric 스케일 비율 ref
 * @param stageDimensions 스테이지 크기
 * @param spriteTexture 옵셔널: 스프라이트 텍스처 (정확한 텍스처 크기를 위해 사용)
 * @returns 이미지의 원래 위치 정보
 */
export function getFabricImagePosition(
  sceneIndex: number,
  scene: TimelineData['scenes'][number],
  fabricCanvasRef: React.RefObject<fabric.Canvas | null> | undefined,
  fabricScaleRatioRef: React.MutableRefObject<number> | undefined,
  stageDimensions: StageDimensions,
  spriteTexture?: { width: number; height: number } | null
): FabricImagePosition {
  // Fabric canvas에서 이미지 객체 찾기
  const fabricImage = fabricCanvasRef?.current?.getObjects().find(
    (obj) => {
      const objWithDataType = obj as unknown as fabric.Object & { dataType?: 'image' | 'text' }
      return objWithDataType.dataType === 'image'
    }
  ) as fabric.Image | undefined

  // 우선순위 1: imageFit이 명시적으로 설정되어 있으면 imageFit 사용 (imageTransform보다 우선)
  // imageFit이 변경될 때 imageTransform을 제거하지만, 재생 중에도 imageFit이 우선 적용되도록 보장
  if (scene.imageFit) {
    const imageFit = scene.imageFit
    const { width, height } = stageDimensions
    
    // 텍스처 크기 사용 (spriteTexture가 있으면 사용, 없으면 스테이지 크기 사용)
    const textureWidth = spriteTexture?.width && spriteTexture.width > 0 
      ? spriteTexture.width 
      : width
    const textureHeight = spriteTexture?.height && spriteTexture.height > 0 
      ? spriteTexture.height 
      : height
    
    const params = calculateSpriteParams(
      textureWidth,
      textureHeight,
      width,
      height,
      imageFit
    )
    
    // anchor가 (0.5, 0.5)이므로 중심점 좌표로 변환
    return {
      x: params.x + params.width / 2,
      y: params.y + params.height / 2,
      width: params.width,
      height: params.height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    }
  }
  
  // 우선순위 2: imageTransform이 있으면 사용 (imageFit이 없을 때만)
  if (scene.imageFit) {
    const imageFit = scene.imageFit
    const { width, height } = stageDimensions
    
    // 텍스처 크기 사용 (spriteTexture가 있으면 사용, 없으면 스테이지 크기 사용)
    const textureWidth = spriteTexture?.width && spriteTexture.width > 0 
      ? spriteTexture.width 
      : width
    const textureHeight = spriteTexture?.height && spriteTexture.height > 0 
      ? spriteTexture.height 
      : height
    
    const params = calculateSpriteParams(
      textureWidth,
      textureHeight,
      width,
      height,
      imageFit
    )
    
    // anchor가 (0.5, 0.5)이므로 중심점 좌표로 변환
    return {
      x: params.x + params.width / 2,
      y: params.y + params.height / 2,
      width: params.width,
      height: params.height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    }
  }
  
  // 우선순위 3: Fabric canvas에서 직접 위치 가져오기
  if (fabricImage && fabricScaleRatioRef) {
    // Fabric에서 직접 위치 가져오기 (사용자가 설정한 위치)
    const scale = fabricScaleRatioRef.current || 1
    const invScale = 1 / scale
    // Fabric.js의 left/top은 originX: 'center', originY: 'center'일 때 중심점 좌표
    const x = (fabricImage.left ?? 0) * invScale
    const y = (fabricImage.top ?? 0) * invScale

    // Fabric에서 크기 가져오기
    const scaledWidth = fabricImage.getScaledWidth?.() ?? (fabricImage.width ?? 0) * (fabricImage.scaleX ?? 1)
    const scaledHeight = fabricImage.getScaledHeight?.() ?? (fabricImage.height ?? 0) * (fabricImage.scaleY ?? 1)
    const width = scaledWidth * invScale
    const height = scaledHeight * invScale
    const scaleX = fabricImage.scaleX ?? 1
    const scaleY = fabricImage.scaleY ?? 1
    const rotation = ((fabricImage.angle ?? 0) * Math.PI) / 180

    return { x, y, width, height, scaleX, scaleY, rotation }
  }
  
  // 우선순위 4: 기본 위치 사용 (contain)
  {
    const imageFit = scene.imageFit || 'contain'
    const { width, height } = stageDimensions
    
    // 텍스처 크기 사용 (spriteTexture가 있으면 사용, 없으면 스테이지 크기 사용)
    const textureWidth = spriteTexture?.width && spriteTexture.width > 0 
      ? spriteTexture.width 
      : width
    const textureHeight = spriteTexture?.height && spriteTexture.height > 0 
      ? spriteTexture.height 
      : height
    
    const params = calculateSpriteParams(
      textureWidth,
      textureHeight,
      width,
      height,
      imageFit
    )
    
    // anchor가 (0.5, 0.5)이므로 중심점 좌표로 변환
    return {
      x: params.x + params.width / 2,
      y: params.y + params.height / 2,
      width: params.width,
      height: params.height,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    }
  }
}
