/**
 * Easing 함수 구현
 * ANIMATION.md 표준에 따른 수식 기반 easing
 */

import type { EasingType } from './types'

/**
 * Easing 함수
 * progress는 0..1 범위
 */
export function applyEasing(progress: number, easing: EasingType): number {
  // progress를 0..1로 클램프
  const t = Math.max(0, Math.min(1, progress))
  
  switch (easing) {
    case 'linear':
      return t
      
    case 'ease-in':
      return t * t
      
    case 'ease-out':
      return 1 - (1 - t) * (1 - t)
      
    case 'ease-in-out':
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2
      
    case 'ease-out-cubic':
      return 1 - Math.pow(1 - t, 3)
      
    case 'ease-in-cubic':
      return t * t * t
      
    default:
      return t
  }
}

/**
 * progress를 0..1로 클램프
 */
export function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress))
}
