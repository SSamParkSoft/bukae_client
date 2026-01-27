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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    originalScaleX, // 타입 호환성을 위해 유지 (사용되지 않음)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    originalScaleY, // 타입 호환성을 위해 유지 (사용되지 않음)
    scaleRatio,
    duration,
    timeline,
  } = params

  if (!containerRef.current || !toSprite) return

  // toSprite를 로컬 변수로 저장하여 클로저에서 안전하게 접근
  const spriteRef = toSprite

  // anchor가 (0.5, 0.5)이므로 originalX, originalY는 이미 중심점 좌표
  const centerX = originalX
  const centerY = originalY

  applyTextFade(toText)

  // zoom-in: 작은 것에서 큰 것으로 (확대) - originalScale * 0.85 → originalScale
  // zoom-out: 큰 것에서 작은 것으로 (축소) - originalScale * 1.5 → originalScale
  // useTransitionEffects.ts와 일치하도록 1.5 사용
  const startScale = direction === 'in' ? originalScale * 0.85 : originalScale * 1.5
  const targetScale = originalScale
  
  // 시작 스케일로 설정
  spriteRef.scale.set(startScale, startScale * scaleRatio)
  // 페이드 효과 제거: alpha를 항상 1로 설정
  spriteRef.alpha = 1
  spriteRef.visible = true

  const toZoomObj = { scale: startScale }

  // timeline.clear()를 제거 - 메인 타임라인의 onComplete가 제거되지 않도록 함
  // 대신 이전 애니메이션은 메인 타임라인에서 이미 정리됨
  
  timeline.to(
    toZoomObj,
    {
      scale: targetScale,
      duration,
      ease: 'none', // 선형 애니메이션으로 정확한 듀레이션 보장
      onUpdate: function () {
        // UX 개선: 매 프레임마다 null 체크 (애니메이션 중에 toSprite가 null이 될 수 있음)
        if (!spriteRef || spriteRef.destroyed || !containerRef.current) {
          return
        }
        ensureInContainer(spriteRef, toText, containerRef.current)
        const scaleFactor = toZoomObj.scale
        
        // UX 개선: visible/alpha 변경 최소화로 깜빡임 방지
        if (!spriteRef.visible) {
          spriteRef.visible = true
        }
        // 페이드 효과 제거: alpha를 항상 1로 유지
        if (spriteRef.alpha !== 1) {
          spriteRef.alpha = 1
        }
        spriteRef.scale.set(scaleFactor, scaleFactor * scaleRatio)

        // anchor가 (0.5, 0.5)이므로 중심점 좌표를 그대로 사용
        spriteRef.x = centerX
        spriteRef.y = centerY

        // UX 개선: 텍스트도 부드럽게 처리
        if (toText && containerRef.current) {
          ensureInContainer(spriteRef, toText, containerRef.current)
          if (toText.alpha !== 1) {
            toText.alpha = 1
          }
          if (!toText.visible) {
            toText.visible = true
          }
        }
      },
      // onComplete는 제거 - 메인 타임라인의 onComplete에서 처리하도록 함 (다른 효과들과 동일하게)
    },
    0
  )
  
  // 원래 스케일로 복귀는 메인 타임라인의 onComplete에서 처리 (다른 효과들과 동일하게)
  // timeline.call() 제거 - 메인 타임라인의 onComplete가 항상 실행되도록 함
}

