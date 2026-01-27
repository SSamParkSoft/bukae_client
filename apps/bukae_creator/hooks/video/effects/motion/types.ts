/**
 * Motion(이미지 움직임) 관련 타입 정의
 * ANIMATION.md 표준에 따른 수식 기반 Motion 시스템
 */

/**
 * Motion 타입
 */
export type MotionType = 
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'rotate'
  | 'fade'

/**
 * Easing 함수 타입
 */
export type EasingType = 
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-out-cubic'
  | 'ease-in-cubic'

/**
 * Motion 파라미터
 */
export interface MotionParams {
  // 슬라이드 방향 (slide-left, slide-right, slide-up, slide-down)
  direction?: 'left' | 'right' | 'up' | 'down'
  // 슬라이드 거리 (픽셀)
  distance?: number
  
  // 확대/축소 비율 (zoom-in, zoom-out)
  scaleFrom?: number
  scaleTo?: number
  
  // 회전 각도 (도 단위)
  rotationFrom?: number
  rotationTo?: number
  
  // 페이드 (fade)
  alphaFrom?: number
  alphaTo?: number
}

/**
 * Motion 설정 (TimelineScene에서 사용)
 */
export interface MotionConfig {
  type: MotionType
  startSecInScene: number // 씬 내 시작 시간 (초)
  durationSec: number // 지속 시간 (초)
  easing: EasingType
  params: MotionParams // 필수로 변경 (타입 호환성)
}

/**
 * Motion 설정
 */
export interface MotionConfig {
  type: MotionType
  startSecInScene: number // 씬 내 시작 시간 (초)
  durationSec: number // 지속 시간 (초)
  easing: EasingType
  params: MotionParams
}

/**
 * Motion 적용 결과
 */
export interface MotionResult {
  x?: number
  y?: number
  scaleX?: number
  scaleY?: number
  rotation?: number
  alpha?: number
}
