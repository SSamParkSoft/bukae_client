/**
 * GSAP Transport 어댑터
 * Transport 시간 t를 직접 사용하여 전환효과를 렌더링합니다.
 * GSAP의 interpolation과 easing을 사용하여 GSAP(t) 방식으로 계산합니다.
 */

import { gsap } from 'gsap'
import type { TransitionTiming } from './transitionTiming'
import type { TransitionEffect } from '../types/effects'
import * as PIXI from 'pixi.js'

/**
 * 전환효과 렌더링 함수 타입
 */
type TransitionRenderFunction = (
  t: number,
  toSprite: PIXI.Sprite,
  fromSprite: PIXI.Sprite | null,
  transitionTiming: TransitionTiming
) => void

/**
 * GSAP Transport 어댑터 클래스
 * Transport 시간 t를 직접 사용하여 전환효과를 렌더링합니다.
 */
export class GSAPTransportAdapter {
  private transitionTiming: TransitionTiming
  private isDestroyed: boolean = false
  private renderFunction: TransitionRenderFunction | null = null
  private toSprite: PIXI.Sprite | null = null
  private fromSprite: PIXI.Sprite | null = null
  private stageWidth: number = 0
  private stageHeight: number = 0
  private originalX: number = 0
  private originalY: number = 0
  private originalScaleX: number = 1
  private originalScaleY: number = 1
  private scaleRatio: number = 1

  constructor(
    transitionTiming: TransitionTiming,
    toSprite: PIXI.Sprite,
    fromSprite: PIXI.Sprite | null,
    stageWidth: number,
    stageHeight: number,
    originalX: number,
    originalY: number,
    originalScaleX: number,
    originalScaleY: number
  ) {
    this.transitionTiming = transitionTiming
    this.toSprite = toSprite
    this.fromSprite = fromSprite
    this.stageWidth = stageWidth
    this.stageHeight = stageHeight
    this.originalX = originalX
    this.originalY = originalY
    this.originalScaleX = originalScaleX
    this.originalScaleY = originalScaleY
    this.scaleRatio = originalScaleY / originalScaleX

    // 전환효과 타입에 따라 렌더링 함수 설정
    this.renderFunction = this.createRenderFunction(transitionTiming.transitionType)
  }

  /**
   * 전환효과 타입에 따라 렌더링 함수 생성
   */
  private createRenderFunction(transitionType: TransitionEffect): TransitionRenderFunction | null {
    switch (transitionType) {
      case 'fade':
        return this.renderFade.bind(this)
      case 'slide-left':
      case 'slide-right':
      case 'slide-up':
      case 'slide-down':
        return this.renderSlide.bind(this)
      case 'zoom-in':
      case 'zoom-out':
        return this.renderZoom.bind(this)
      case 'rotate':
      case 'blur':
      case 'glitch':
      case 'ripple':
      case 'circle':
      case 'circular':
        // Circle: Shader Transition으로 처리됨 (GSAP에서는 처리하지 않음)
        return this.renderNone.bind(this)
      case 'wave':
        // 복잡한 전환효과는 일단 fade로 처리 (나중에 개별 구현 가능)
        return this.renderFade.bind(this)
      case 'none':
        return this.renderNone.bind(this)
      default:
        console.warn('[GSAPTransportAdapter] Unknown transition type, using none:', transitionType)
        return this.renderNone.bind(this) // 기본값: none
    }
  }

  /**
   * Transport 시간 t에 맞춰 전환효과 렌더링
   * @param t 타임라인 시간 (초)
   */
  syncToTransportTime(t: number): void {
    if (this.isDestroyed || !this.renderFunction || !this.toSprite) {
      return
    }
    
    // toSprite가 destroyed된 경우 처리하지 않음
    if (this.toSprite.destroyed) {
      return
    }

    // Transport 시간 t를 직접 사용하여 전환효과 렌더링
    // 전환효과 범위 밖에서도 호출하여 초기/최종 상태 유지
    const { startTime, endTime } = this.transitionTiming
    const isInTransition = t >= startTime && t < endTime
    
    // 디버깅: syncToTransportTime이 호출되는지 확인 (항상 출력하되 샘플링)
    // 매 0.1초마다 한 번씩만 출력하여 로그가 너무 많아지지 않도록 함
    const shouldLog = Math.floor(t * 10) % 2 === 0 // 0.2초마다 출력
    if (shouldLog || isInTransition || (Math.abs(t - startTime) < 0.1) || (Math.abs(t - endTime) < 0.1)) {
      console.log('[GSAPTransportAdapter] syncToTransportTime called:', {
        t: t.toFixed(3),
        startTime: startTime.toFixed(3),
        endTime: endTime.toFixed(3),
        isInTransition,
        transitionType: this.transitionTiming.transitionType,
      })
    }
    
    // renderFunction 호출 전에 toSprite가 여전히 유효한지 다시 확인
    if (!this.toSprite || this.toSprite.destroyed) {
      return
    }
    
    this.renderFunction(
      t,
      this.toSprite,
      this.fromSprite,
      this.transitionTiming
    )
  }

  /**
   * 페이드 전환효과 렌더링
   * GSAP의 interpolation을 사용하여 부드러운 애니메이션 적용
   */
  private renderFade(
    t: number,
    toSprite: PIXI.Sprite,
    fromSprite: PIXI.Sprite | null,
    transitionTiming: TransitionTiming
  ): void {
    // toSprite가 null이거나 destroyed된 경우 처리하지 않음
    if (!toSprite || toSprite.destroyed) {
      return
    }
    
    const { startTime, duration, endTime } = transitionTiming
    const relativeTime = t - startTime

    // 전환효과 진행도 계산 (0 ~ 1)
    let progress = 0
    if (relativeTime < 0) {
      // 전환효과 시작 전: alpha = 0
      progress = 0
    } else if (t >= endTime) {
      // 전환효과 종료 후: alpha = 1
      progress = 1
    } else {
      // 전환효과 진행 중: 상대 시간을 duration으로 나눔
      progress = relativeTime / duration
      progress = Math.max(0, Math.min(1, progress))
    }

    // GSAP의 interpolation을 사용하여 alpha 값 계산
    // power2.out easing 적용
    const ease = gsap.parseEase('power2.out')
    const easedProgress = ease(progress)

    // 현재 씬 페이드 인: alpha = easedProgress
    // 중요: 항상 alpha를 설정하여 전환효과가 렌더링되도록 함
    toSprite.visible = true
    const targetAlpha = easedProgress
    toSprite.alpha = targetAlpha
    
    // 디버깅: 전환효과 진행 중일 때 alpha 값 확인
    if (progress > 0 && progress < 1) {
      // 샘플링하여 로그가 너무 많이 나오지 않도록 함
      const shouldLog = Math.floor(progress * 10) % 2 === 0
      if (shouldLog) {
        console.log('[GSAPTransportAdapter] Fade (IN TRANSITION):', {
          t: t.toFixed(3),
          startTime: startTime.toFixed(3),
          endTime: endTime.toFixed(3),
          relativeTime: relativeTime.toFixed(3),
          progress: progress.toFixed(3),
          easedProgress: easedProgress.toFixed(3),
          targetAlpha: targetAlpha.toFixed(3),
          actualAlpha: toSprite.alpha.toFixed(3),
          toSpriteVisible: toSprite.visible,
          spriteDestroyed: toSprite.destroyed,
        })
      }
    } else if (relativeTime >= -0.1 && relativeTime < 0.1) {
      // 전환효과 시작 직전/직후에도 로그 출력
      console.log('[GSAPTransportAdapter] Fade (NEAR START):', {
        t: t.toFixed(3),
        startTime: startTime.toFixed(3),
        relativeTime: relativeTime.toFixed(3),
        progress: progress.toFixed(3),
        easedProgress: easedProgress.toFixed(3),
        targetAlpha: targetAlpha.toFixed(3),
        actualAlpha: toSprite.alpha.toFixed(3),
        toSpriteVisible: toSprite.visible,
      })
    }

    // 이전 씬 페이드 아웃: alpha = 1 - easedProgress
    if (fromSprite && !fromSprite.destroyed) {
      if (t >= endTime) {
        // 전환효과가 끝난 후에는 이전 씬 숨김
        fromSprite.visible = false
        fromSprite.alpha = 0
      } else if (relativeTime >= 0) {
        // 전환효과 진행 중에만 이전 씬 표시
        fromSprite.visible = true
        fromSprite.alpha = 1 - easedProgress
      } else {
        // 전환효과 시작 전에는 이전 씬을 완전히 표시
        fromSprite.visible = true
        fromSprite.alpha = 1
      }
    }
  }

  /**
   * 슬라이드 전환효과 렌더링
   * GSAP의 interpolation을 사용하여 부드러운 애니메이션 적용
   */
  private renderSlide(
    t: number,
    toSprite: PIXI.Sprite,
    _fromSprite: PIXI.Sprite | null,
    transitionTiming: TransitionTiming
  ): void {
    // toSprite가 null이거나 destroyed된 경우 처리하지 않음
    if (!toSprite || toSprite.destroyed) {
      return
    }
    
    const { startTime, duration, endTime, transitionType } = transitionTiming
    const relativeTime = t - startTime

    // 전환효과 진행도 계산 (0 ~ 1)
    let progress = 0
    if (relativeTime < 0) {
      // 전환효과 시작 전: 시작 위치에 있음
      progress = 0
    } else if (t >= endTime) {
      // 전환효과 종료 후: 최종 위치에 있음
      progress = 1
    } else {
      // 전환효과 진행 중
      progress = Math.max(0, Math.min(1, relativeTime / duration))
    }

    // 슬라이드 방향에 따라 오프셋 계산
    const offsetX = this.stageWidth * 0.1
    const offsetY = this.stageHeight * 0.1

    toSprite.visible = true
    toSprite.alpha = 1

    // GSAP의 power2.out easing 적용
    const ease = gsap.parseEase('power2.out')
    const easedProgress = ease(progress)

    // GSAP의 mapRange를 사용하여 값 보간
    switch (transitionType) {
      case 'slide-left':
        // 오른쪽에서 왼쪽으로: startX = originalX + offsetX, endX = originalX
        const startXLeft = this.originalX + offsetX
        toSprite.x = gsap.utils.mapRange(0, 1, startXLeft, this.originalX, easedProgress)
        toSprite.y = this.originalY
        break
      case 'slide-right':
        // 왼쪽에서 오른쪽으로: startX = originalX - offsetX, endX = originalX
        const startXRight = this.originalX - offsetX
        toSprite.x = gsap.utils.mapRange(0, 1, startXRight, this.originalX, easedProgress)
        toSprite.y = this.originalY
        break
      case 'slide-up':
        // 아래에서 위로: startY = originalY + offsetY, endY = originalY
        const startYUp = this.originalY + offsetY
        toSprite.x = this.originalX
        toSprite.y = gsap.utils.mapRange(0, 1, startYUp, this.originalY, easedProgress)
        break
      case 'slide-down':
        // 위에서 아래로: startY = originalY - offsetY, endY = originalY
        const startYDown = this.originalY - offsetY
        toSprite.x = this.originalX
        toSprite.y = gsap.utils.mapRange(0, 1, startYDown, this.originalY, easedProgress)
        break
    }
  }

  /**
   * 줌 전환효과 렌더링
   * GSAP의 interpolation을 사용하여 부드러운 애니메이션 적용
   */
  private renderZoom(
    t: number,
    toSprite: PIXI.Sprite,
    _fromSprite: PIXI.Sprite | null,
    transitionTiming: TransitionTiming
  ): void {
    // toSprite가 null이거나 destroyed된 경우 처리하지 않음
    if (!toSprite || toSprite.destroyed) {
      return
    }
    
    const { startTime, duration, endTime, transitionType } = transitionTiming
    const relativeTime = t - startTime

    // 전환효과 진행도 계산 (0 ~ 1)
    let progress = 0
    if (relativeTime < 0) {
      // 전환효과 시작 전: 시작 스케일에 있음
      progress = 0
    } else if (t >= endTime) {
      // 전환효과 종료 후: 최종 스케일에 있음
      progress = 1
    } else {
      // 전환효과 진행 중
      progress = Math.max(0, Math.min(1, relativeTime / duration))
    }

    toSprite.visible = true
    toSprite.alpha = 1

    // 원래 위치로 설정
    toSprite.x = this.originalX
    toSprite.y = this.originalY

    // GSAP의 power2.out easing 적용
    const ease = gsap.parseEase('power2.out')
    const easedProgress = ease(progress)

    if (transitionType === 'zoom-in') {
      // 줌 인: startScale = originalScale * 1.15, endScale = originalScale
      const startScale = this.originalScaleX * 1.15
      const targetScale = gsap.utils.mapRange(0, 1, startScale, this.originalScaleX, easedProgress)
      toSprite.scale.set(targetScale, targetScale * this.scaleRatio)
    } else {
      // 줌 아웃: startScale = originalScale * 0.85, endScale = originalScale
      const startScale = this.originalScaleX * 0.85
      const targetScale = gsap.utils.mapRange(0, 1, startScale, this.originalScaleX, easedProgress)
      toSprite.scale.set(targetScale, targetScale * this.scaleRatio)
    }
  }

  /**
   * 전환효과 없음 렌더링
   */
  private renderNone(
    _t: number,
    toSprite: PIXI.Sprite,
    _fromSprite: PIXI.Sprite | null,
    _transitionTiming: TransitionTiming
  ): void {
    // toSprite가 null이거나 destroyed된 경우 처리하지 않음
    if (!toSprite || toSprite.destroyed) {
      return
    }
    
    toSprite.visible = true
    toSprite.alpha = 1
  }

  /**
   * Transport 재생 상태에 맞춰 GSAP 재생/일시정지
   * @param isPlaying Transport 재생 중 여부
   * 
   * 주의: Transport 기반 렌더링에서는 GSAP timeline을 사용하지 않고
   * Transport 시간 t를 직접 사용하여 렌더링하므로 이 메서드는 아무 작업도 하지 않습니다.
   */
  syncPlaybackState(_isPlaying: boolean): void {
    // GSAP timeline을 사용하지 않으므로 아무 작업도 하지 않음
    // Transport 시간 t를 직접 사용하여 렌더링
    void _isPlaying
  }

  /**
   * 전환효과 타이밍 정보 반환
   */
  getTransitionTiming(): TransitionTiming {
    return this.transitionTiming
  }

  /**
   * 어댑터 정리
   */
  destroy(): void {
    if (this.isDestroyed) {
      return
    }

    this.isDestroyed = true
    // GSAP timeline을 사용하지 않으므로 정리할 것이 없음
  }

  /**
   * 어댑터가 정리되었는지 확인
   */
  isDestroyedCheck(): boolean {
    return this.isDestroyed
  }
}
