/**
 * 전환 효과 공통 유틸리티 함수
 */

import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'

/**
 * 스프라이트와 텍스트를 컨테이너에 추가하는 헬퍼 함수
 */
export function ensureInContainer(
  sprite: PIXI.Sprite | null,
  text: PIXI.Text | null,
  container: PIXI.Container
): void {
  if (sprite && sprite.parent !== container) {
    if (sprite.parent) {
      sprite.parent.removeChild(sprite)
    }
    container.addChild(sprite)
  }

  if (text && text.parent !== container) {
    if (text.parent) {
      text.parent.removeChild(text)
    }
    container.addChild(text)
  }
}

/**
 * 텍스트 페이드 효과 적용
 */
export function applyTextFade(text: PIXI.Text | null): void {
  if (!text) return
  text.alpha = 1
  text.visible = true
  if (text.mask) {
    text.mask = null
  }
}

/**
 * 전환 효과 공통 파라미터
 */
export interface TransitionParams {
  toSprite: PIXI.Sprite
  toText: PIXI.Text | null
  containerRef: React.RefObject<PIXI.Container | null>
  originalX: number
  originalY: number
  originalScale: number
  originalScaleX: number
  originalScaleY: number
  scaleRatio: number
  stageWidth: number
  stageHeight: number
  duration: number
  timeline: gsap.core.Timeline
}

