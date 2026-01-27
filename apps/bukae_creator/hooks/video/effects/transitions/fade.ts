/**
 * 페이드 전환 효과
 */

import { ensureInContainer, type TransitionParams } from '../utils'

/**
 * 페이드 전환 효과 적용
 */
export function applyFadeTransition(params: TransitionParams): void {
  const { toSprite, toText, fromSprite, containerRef, duration, timeline } = params

  if (!containerRef.current || !toSprite) return

  // toSprite를 로컬 변수로 저장하여 클로저에서 안전하게 접근
  const spriteRef = toSprite
  const fromSpriteRef = fromSprite

  const fadeObj = { alpha: 0 }
  const fadeOutObj = { alpha: 1 } // 이전 씬의 페이드 아웃용

  if (toText) {
    if (toText.mask) {
      toText.mask = null
    }
  }

  // 이전 씬의 스프라이트가 있으면 페이드 아웃 처리
  if (fromSpriteRef && !fromSpriteRef.destroyed && containerRef.current) {
    // 이전 씬의 스프라이트를 컨테이너에 추가
    if (fromSpriteRef.parent !== containerRef.current) {
      if (fromSpriteRef.parent) {
        fromSpriteRef.parent.removeChild(fromSpriteRef)
      }
      containerRef.current.addChild(fromSpriteRef)
    }
    fromSpriteRef.visible = true
    fromSpriteRef.alpha = 1

    // 이전 씬의 페이드 아웃 애니메이션
    timeline.to(
      fadeOutObj,
      {
        alpha: 0,
        duration,
        onUpdate: function () {
          if (!fromSpriteRef || fromSpriteRef.destroyed || !containerRef.current) {
            return
          }
          fromSpriteRef.alpha = fadeOutObj.alpha
        },
      },
      0
    )
  }

  // 현재 씬의 페이드 인 애니메이션
  timeline.to(
    fadeObj,
    {
      alpha: 1,
      duration,
      onUpdate: function () {
        // 매 프레임마다 null 체크 (애니메이션 중에 toSprite가 null이 될 수 있음)
        if (!spriteRef || spriteRef.destroyed || !containerRef.current) {
          return
        }
        ensureInContainer(spriteRef, toText, containerRef.current)
        spriteRef.visible = true
        spriteRef.alpha = fadeObj.alpha

        if (toText && containerRef.current) {
          ensureInContainer(spriteRef, toText, containerRef.current)
          toText.alpha = 1
          toText.visible = true
        }
      },
    },
    0
  )
}

