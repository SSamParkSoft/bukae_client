/**
 * Fabric 위치 유틸리티
 * Fabric canvas에서 사용자가 설정한 원래 위치를 가져오는 공통 함수
 */

import * as fabric from 'fabric'
import type { TimelineData } from '@/store/useVideoCreateStore'
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
 * 1. Fabric canvas에서 직접 가져오기 (사용자가 설정한 위치)
 * 2. scene.imageTransform 사용 (fallback)
 * 3. 기본 위치 사용 (최종 fallback)
 * 
 * @param sceneIndex 씬 인덱스
 * @param scene 씬 데이터
 * @param fabricCanvasRef Fabric canvas ref
 * @param fabricScaleRatioRef Fabric 스케일 비율 ref
 * @param stageDimensions 스테이지 크기
 * @returns 이미지의 원래 위치 정보
 */
export function getFabricImagePosition(
  sceneIndex: number,
  scene: TimelineData['scenes'][number],
  fabricCanvasRef: React.RefObject<fabric.Canvas | null> | undefined,
  fabricScaleRatioRef: React.MutableRefObject<number> | undefined,
  stageDimensions: StageDimensions
): FabricImagePosition {
  // Fabric canvas에서 이미지 객체 찾기
  const fabricImage = fabricCanvasRef?.current?.getObjects().find(
    (obj) => {
      const objWithDataType = obj as unknown as fabric.Object & { dataType?: 'image' | 'text' }
      return objWithDataType.dataType === 'image'
    }
  ) as fabric.Image | undefined

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
  } else if (scene.imageTransform) {
    // Fabric이 없으면 scene.imageTransform 사용 (fallback)
    return {
      x: scene.imageTransform.x,
      y: scene.imageTransform.y,
      width: scene.imageTransform.width,
      height: scene.imageTransform.height,
      scaleX: scene.imageTransform.scaleX || 1,
      scaleY: scene.imageTransform.scaleY || 1,
      rotation: scene.imageTransform.rotation ?? 0,
    }
  } else {
    // Transform이 없으면 기본 위치 사용
    const imageY = stageDimensions.height * 0.15
    return {
      x: stageDimensions.width * 0.5,
      y: imageY + (stageDimensions.height * 0.7) * 0.5,
      width: stageDimensions.width,
      height: stageDimensions.height * 0.7,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    }
  }
}
