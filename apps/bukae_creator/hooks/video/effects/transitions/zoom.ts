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

  // toSprite를 로컬 변수로 저장하여 클로저에서 안전하게 접근
  const spriteRef = toSprite

  const toZoomObj = { scale: originalScale }
  spriteRef.scale.set(originalScaleX, originalScaleY)
  // 페이드 효과 제거: alpha를 항상 1로 설정
  spriteRef.alpha = 1
  spriteRef.visible = true

  // anchor가 (0.5, 0.5)이므로 originalX, originalY는 이미 중심점 좌표
  const centerX = originalX
  const centerY = originalY

  applyTextFade(toText)

  const targetScale = direction === 'in' ? originalScale * 1.15 : originalScale * 0.85

  // timeline.clear()를 제거 - 메인 타임라인의 onComplete가 제거되지 않도록 함
  // 대신 이전 애니메이션은 메인 타임라인에서 이미 정리됨
  
  timeline.to(
    toZoomObj,
    {
      scale: targetScale,
      duration,
      ease: 'none', // 선형 애니메이션으로 정확한 듀레이션 보장
      onUpdate: function () {
        // 매 프레임마다 null 체크 (애니메이션 중에 toSprite가 null이 될 수 있음)
        if (!spriteRef || spriteRef.destroyed || !containerRef.current) {
          return
        }
        ensureInContainer(spriteRef, toText, containerRef.current)
        const scaleFactor = toZoomObj.scale
        spriteRef.visible = true
        // 페이드 효과 제거: alpha를 항상 1로 유지
        spriteRef.alpha = 1
        spriteRef.scale.set(scaleFactor, scaleFactor * scaleRatio)

        // anchor가 (0.5, 0.5)이므로 중심점 좌표를 그대로 사용
        spriteRef.x = centerX
        spriteRef.y = centerY

        if (toText && containerRef.current) {
          ensureInContainer(spriteRef, toText, containerRef.current)
          toText.alpha = 1
          toText.visible = true
        }
      },
      // onComplete는 제거 - 메인 타임라인의 onComplete에서 처리하도록 함 (다른 효과들과 동일하게)
    },
    0
  )
  
  // 원래 스케일로 복귀는 메인 타임라인의 onComplete에서 처리 (다른 효과들과 동일하게)
  // timeline.call() 제거 - 메인 타임라인의 onComplete가 항상 실행되도록 함
}

