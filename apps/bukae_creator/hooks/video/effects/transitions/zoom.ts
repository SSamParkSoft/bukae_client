/**
 * 줌 전환 효과 (in, out)
 */

import * as PIXI from 'pixi.js'
import { ensureInContainer, applyTextFade, type TransitionParams } from '../utils'

export type ZoomDirection = 'in' | 'out'

/**
 * 줌 전환 효과 적용
 */
export function applyZoomTransition(
  params: TransitionParams,
  direction: ZoomDirection
): void {
  const {
    toSprite,
    toText,
    containerRef,
    originalX,
    originalY,
    originalScale,
    originalScaleX,
    originalScaleY,
    scaleRatio,
    duration,
    timeline,
  } = params

  if (!containerRef.current || !toSprite) return

  const toZoomObj = { scale: originalScale }
  toSprite.scale.set(originalScaleX, originalScaleY)
  // 페이드 효과 제거: alpha를 항상 1로 설정
  toSprite.alpha = 1
  toSprite.visible = true

  const centerX = originalX + (toSprite.texture.width * originalScaleX) / 2
  const centerY = originalY + (toSprite.texture.height * originalScaleY) / 2

  applyTextFade(toText)

  const targetScale = direction === 'in' ? originalScale * 1.15 : originalScale * 0.85

  timeline.to(
    toZoomObj,
    {
      scale: targetScale,
      duration,
      ease: 'power1.out',
      onUpdate: function () {
        if (toSprite && containerRef.current) {
          ensureInContainer(toSprite, toText, containerRef.current)
          const scaleFactor = toZoomObj.scale
          toSprite.visible = true
          // 페이드 효과 제거: alpha를 항상 1로 유지
          toSprite.alpha = 1
          toSprite.scale.set(scaleFactor, scaleFactor * scaleRatio)

          const newWidth = toSprite.texture.width * scaleFactor
          const newHeight = toSprite.texture.height * scaleFactor * scaleRatio
          toSprite.x = centerX - newWidth / 2
          toSprite.y = centerY - newHeight / 2
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

