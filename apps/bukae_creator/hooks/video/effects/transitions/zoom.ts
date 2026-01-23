/**
 * 줌 전환 효과 (in, out)
 */

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

  // anchor가 (0.5, 0.5)이므로 originalX, originalY는 이미 중심점 좌표
  const centerX = originalX
  const centerY = originalY

  applyTextFade(toText)

  const targetScale = direction === 'in' ? originalScale * 1.15 : originalScale * 0.85

  // 이전 애니메이션 제거 (겹침 방지)
  timeline.clear()
  
  timeline.to(
    toZoomObj,
    {
      scale: targetScale,
      duration,
      ease: 'none', // 선형 애니메이션으로 정확한 듀레이션 보장
      onUpdate: function () {
        if (toSprite && containerRef.current) {
          ensureInContainer(toSprite, toText, containerRef.current)
          const scaleFactor = toZoomObj.scale
          toSprite.visible = true
          // 페이드 효과 제거: alpha를 항상 1로 유지
          toSprite.alpha = 1
          toSprite.scale.set(scaleFactor, scaleFactor * scaleRatio)

          // anchor가 (0.5, 0.5)이므로 중심점 좌표를 그대로 사용
          toSprite.x = centerX
          toSprite.y = centerY
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

