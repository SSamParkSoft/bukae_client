/**
 * 슬라이드 전환 효과 (left, right, up, down)
 */

import * as PIXI from 'pixi.js'
import { ensureInContainer, type TransitionParams } from '../utils'

export type SlideDirection = 'left' | 'right' | 'up' | 'down'

/**
 * 슬라이드 전환 효과 적용
 */
export function applySlideTransition(
  params: TransitionParams,
  direction: SlideDirection
): void {
  const {
    toSprite,
    toText,
    containerRef,
    originalX,
    originalY,
    stageWidth,
    stageHeight,
    duration,
    timeline,
  } = params

  if (!containerRef.current || !toSprite) return

  let offsetX = 0
  let offsetY = 0
  let slideObj: { x: number } | { y: number }

  switch (direction) {
    case 'left':
      offsetX = stageWidth * 0.1
      slideObj = { x: originalX + offsetX }
      toSprite.x = originalX + offsetX
      break
    case 'right':
      offsetX = stageWidth * 0.1
      slideObj = { x: originalX - offsetX }
      toSprite.x = originalX - offsetX
      break
    case 'up':
      offsetY = stageHeight * 0.1
      slideObj = { y: originalY - offsetY }
      toSprite.y = originalY - offsetY
      break
    case 'down':
      offsetY = stageHeight * 0.1
      slideObj = { y: originalY + offsetY }
      toSprite.y = originalY + offsetY
      break
  }

  toSprite.alpha = 1
  toSprite.visible = true

  const targetX = direction === 'left' || direction === 'right' ? originalX : undefined
  const targetY = direction === 'up' || direction === 'down' ? originalY : undefined

  timeline.to(
    slideObj,
    {
      ...(targetX !== undefined && { x: targetX }),
      ...(targetY !== undefined && { y: targetY }),
      duration,
      onUpdate: function () {
        if (toSprite && containerRef.current) {
          ensureInContainer(toSprite, toText, containerRef.current)
          if (direction === 'left' || direction === 'right') {
            toSprite.x = (slideObj as { x: number }).x
          } else {
            toSprite.y = (slideObj as { y: number }).y
          }
          toSprite.visible = true
          toSprite.alpha = 1
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

