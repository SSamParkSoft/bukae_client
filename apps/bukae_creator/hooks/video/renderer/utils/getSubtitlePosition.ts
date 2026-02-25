/**
 * 자막 위치 유틸리티
 * 사용자가 설정한 자막 위치를 가져오는 공통 함수
 */

import type { TimelineData } from '@/store/useVideoCreateStore'
import type { StageDimensions } from '../../types/common'

/**
 * 자막 위치 정보
 */
export interface SubtitlePosition {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  // transform이 있을 때 추가 정보
  width?: number
  height?: number
  anchor?: { x: number; y: number }
  hAlign?: 'left' | 'center' | 'right'
  vAlign?: 'middle'
}

export interface GetSubtitlePositionOptions {
  track?: 'fast' | 'pro'
}

/**
 * 사용자가 설정한 자막의 위치를 가져옴
 * 
 * 우선순위:
 * 1. scene.text.transform 사용 (사용자가 직접 설정한 위치)
 * 2. scene.text.position ('top', 'center', 'bottom') 값에 따라 계산된 위치 반환
 * 
 * @param scene 씬 데이터
 * @param stageDimensions 스테이지 크기
 * @returns 자막의 위치 정보
 */
export function getSubtitlePosition(
  scene: TimelineData['scenes'][number],
  stageDimensions: StageDimensions,
  options?: GetSubtitlePositionOptions
): SubtitlePosition {
  // 우선순위 1: transform이 있으면 사용 (사용자가 직접 설정한 위치)
  if (scene.text?.transform) {
    const transform = scene.text.transform
    return {
      x: transform.x,
      y: transform.y,
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
      rotation: transform.rotation ?? 0,
      width: transform.width,
      height: transform.height,
      anchor: transform.anchor,
      hAlign: transform.hAlign,
      vAlign: transform.vAlign,
    }
  }
  
  // 우선순위 2: position 값에 따라 계산
  const position = scene.text?.position || 'bottom'
  const { width, height } = stageDimensions
  const track = options?.track ?? 'fast'
  
  let y: number
  if (track === 'pro') {
    if (position === 'top') {
      y = 200
    } else if (position === 'bottom') {
      y = height - 200
    } else {
      y = height * 0.5
    }
  } else {
    if (position === 'top') {
      y = height * 0.15
    } else if (position === 'bottom') {
      // 하단 자막은 비디오 콘텐츠 위에 오버레이되도록 위치 조정
      // 0.75 = 화면 하단에서 약 25% 위쪽 (비디오 콘텐츠 영역 내)
      y = height * 0.75
    } else {
      y = height * 0.5
    }
  }
  
  return {
    x: width * 0.5,
    y,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  }
}
