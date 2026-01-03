/**
 * 페이드 전환 효과
 */

import * as PIXI from 'pixi.js'
import { ensureInContainer, applyTextFade, type TransitionParams } from '../utils'

/**
 * 페이드 전환 효과 적용
 */
export function applyFadeTransition(params: TransitionParams): void {
  const { toSprite, toText, containerRef, duration, timeline } = params

  if (!containerRef.current) return

  const fadeObj = { alpha: 0 }
  let hasWarnedAboutParent = false

  if (toText) {
    if (toText.mask) {
      toText.mask = null
    }
  }

  timeline.to(
    fadeObj,
    {
      alpha: 1,
      duration,
      onUpdate: function () {
        if (toSprite && containerRef.current) {
          ensureInContainer(toSprite, toText, containerRef.current)
          toSprite.visible = true
          toSprite.alpha = fadeObj.alpha
        }

        if (toText && containerRef.current) {
          ensureInContainer(toSprite, toText, containerRef.current)
          toText.alpha = 1
          toText.visible = true
        }
      },
    },
    0
  )
}

