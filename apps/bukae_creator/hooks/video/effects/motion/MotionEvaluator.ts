/**
 * Motion 평가기
 * ANIMATION.md 표준에 따른 수식 기반 Motion 평가
 * 
 * Motion은 "play"가 아니라 t에서 즉시 계산:
 * - progress = clamp((sceneLocalT - motionStartSec) / motionDurationSec)
 * - eased = easing(progress)
 * - 결과를 sprite에 즉시 세팅
 */

import type { MotionConfig, MotionResult, MotionType } from './types'
import { applyEasing, clampProgress } from './easing'

export class MotionEvaluator {
  /**
   * Motion 진행률 계산
   * @param sceneLocalT 씬 내 로컬 시간 (초)
   * @param motion Motion 설정
   * @returns 진행률 (0..1)
   */
  static calculateProgress(sceneLocalT: number, motion: MotionConfig): number {
    const elapsed = sceneLocalT - motion.startSecInScene
    const progress = elapsed / motion.durationSec
    return clampProgress(progress)
  }

  /**
   * Motion이 활성 상태인지 확인
   * @param sceneLocalT 씬 내 로컬 시간 (초)
   * @param motion Motion 설정
   * @returns 활성 여부
   */
  static isActive(sceneLocalT: number, motion: MotionConfig): boolean {
    const elapsed = sceneLocalT - motion.startSecInScene
    // 렌더링 시작 시점부터 Motion이 즉시 시작되도록 부동소수점 오차 허용 (-0.001초까지 허용)
    // durationSec까지 정확히 실행되도록 부동소수점 오차 허용 (+0.001초까지 허용)
    return elapsed >= -0.001 && elapsed <= motion.durationSec + 0.001
  }

  /**
   * Motion 평가 및 결과 반환
   * @param sceneLocalT 씬 내 로컬 시간 (초)
   * @param motion Motion 설정
   * @param baseState 기본 상태 (Motion 적용 전)
   * @returns Motion 적용 결과
   */
  static evaluate(
    sceneLocalT: number,
    motion: MotionConfig,
    baseState: {
      x: number
      y: number
      scaleX: number
      scaleY: number
      rotation: number
      alpha: number
    }
  ): MotionResult {
    // Motion이 활성 상태가 아니면 기본 상태 반환
    if (!this.isActive(sceneLocalT, motion)) {
      return {}
    }

    // 진행률 계산
    const progress = this.calculateProgress(sceneLocalT, motion)
    const eased = applyEasing(progress, motion.easing)

    // Motion 타입에 따라 결과 계산
    const result: MotionResult = {}

    switch (motion.type) {
      case 'slide-left':
      case 'slide-right':
      case 'slide-up':
      case 'slide-down':
        result.x = this.evaluateSlideX(motion, baseState.x, eased)
        result.y = this.evaluateSlideY(motion, baseState.y, eased)
        break

      case 'zoom-in':
      case 'zoom-out':
        result.scaleX = this.evaluateZoom(motion, baseState.scaleX, eased)
        result.scaleY = this.evaluateZoom(motion, baseState.scaleY, eased)
        break

      case 'rotate':
        result.rotation = this.evaluateRotate(motion, baseState.rotation, eased)
        break

      case 'fade':
        result.alpha = this.evaluateFade(motion, baseState.alpha, eased)
        break
    }

    return result
  }

  /**
   * 슬라이드 X 좌표 평가
   * 슬라이드는 반대 방향에서 원래 위치로 오는 느낌으로 설정
   */
  private static evaluateSlideX(
    motion: MotionConfig,
    baseX: number,
    eased: number
  ): number {
    const { direction, distance = 100 } = motion.params

    if (motion.type === 'slide-left') {
      // slide-left: 오른쪽에서 왼쪽으로 (원래 위치로)
      // 오른쪽(baseX + distance)에서 원래 위치(baseX)로 이동
      return baseX + distance * (1 - eased)
    } else if (motion.type === 'slide-right') {
      // slide-right: 왼쪽에서 오른쪽으로 (원래 위치로)
      // 왼쪽(baseX - distance)에서 원래 위치(baseX)로 이동
      return baseX - distance * (1 - eased)
    } else if (direction === 'left') {
      // 왼쪽으로 슬라이드: 오른쪽에서 왼쪽으로
      return baseX + distance * (1 - eased)
    } else if (direction === 'right') {
      // 오른쪽으로 슬라이드: 왼쪽에서 오른쪽으로
      return baseX - distance * (1 - eased)
    }

    return baseX
  }

  /**
   * 슬라이드 Y 좌표 평가
   * 슬라이드는 반대 방향에서 원래 위치로 오는 느낌으로 설정
   */
  private static evaluateSlideY(
    motion: MotionConfig,
    baseY: number,
    eased: number
  ): number {
    const { direction, distance = 100 } = motion.params

    if (motion.type === 'slide-up') {
      // slide-up: 아래에서 위로 (원래 위치로)
      // 아래(baseY + distance)에서 원래 위치(baseY)로 이동
      return baseY + distance * (1 - eased)
    } else if (motion.type === 'slide-down') {
      // slide-down: 위에서 아래로 (원래 위치로)
      // 위(baseY - distance)에서 원래 위치(baseY)로 이동
      return baseY - distance * (1 - eased)
    } else if (direction === 'up') {
      // 위로 슬라이드: 아래에서 위로
      return baseY + distance * (1 - eased)
    } else if (direction === 'down') {
      // 아래로 슬라이드: 위에서 아래로
      return baseY - distance * (1 - eased)
    }

    return baseY
  }

  /**
   * 줌 평가
   * 확대/축소는 원래 크기에서 확대/축소로 설정
   */
  private static evaluateZoom(
    motion: MotionConfig,
    baseScale: number,
    eased: number
  ): number {
    const { scaleFrom = 1, scaleTo = 1.5 } = motion.params

    if (motion.type === 'zoom-in') {
      // 확대: 작은 것에서 큰 것으로
      // baseScale * scaleFrom에서 baseScale * scaleTo로 확대
      const fromScale = baseScale > 0 ? baseScale * (scaleFrom || 0.8) : (scaleFrom || 0.8)
      const toScale = baseScale > 0 ? baseScale * scaleTo : scaleTo
      return fromScale + (toScale - fromScale) * eased
    } else if (motion.type === 'zoom-out') {
      // 축소: 큰 것에서 작은 것으로
      // baseScale * scaleFrom에서 baseScale * scaleTo로 축소
      const fromScale = baseScale > 0 ? baseScale * (scaleFrom || 1.2) : (scaleFrom || 1.2)
      const toScale = baseScale > 0 ? baseScale * scaleTo : scaleTo
      return fromScale + (toScale - fromScale) * eased
    }

    // 커스텀 파라미터 사용: 원래 크기에서 시작
    const fromScale = baseScale > 0 ? baseScale : scaleFrom
    return fromScale + (scaleTo - fromScale) * eased
  }

  /**
   * 회전 평가
   */
  private static evaluateRotate(
    motion: MotionConfig,
    baseRotation: number,
    eased: number
  ): number {
    const { rotationFrom = 0, rotationTo = 360 } = motion.params
    const rotationRad = (rotationFrom + (rotationTo - rotationFrom) * eased) * (Math.PI / 180)
    return baseRotation + rotationRad
  }

  /**
   * 페이드 평가
   */
  private static evaluateFade(
    motion: MotionConfig,
    baseAlpha: number,
    eased: number
  ): number {
    const { alphaFrom = 0, alphaTo = 1 } = motion.params
    return alphaFrom + (alphaTo - alphaFrom) * eased
  }
}
