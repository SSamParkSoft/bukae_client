/**
 * 슬라이드 전환 효과 (left, right, up, down)
 */

// PIXI는 사용하지 않으므로 제거
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
      // slide-up: 아래에서 위로 슬라이드 (아래에서 시작해서 위로 이동)
      offsetY = stageHeight * 0.1
      slideObj = { y: originalY + offsetY }
      toSprite.y = originalY + offsetY
      break
    case 'down':
      // slide-down: 위에서 아래로 슬라이드 (위에서 시작해서 아래로 이동)
      offsetY = stageHeight * 0.1
      slideObj = { y: originalY - offsetY }
      toSprite.y = originalY - offsetY
      break
  }

  // 스프라이트와 텍스트를 컨테이너에 추가 (한 번만, 애니메이션 시작 전)
  if (toSprite && containerRef.current) {
    ensureInContainer(toSprite, toText, containerRef.current)
  }

  // 전환 효과 시작: 스프라이트를 표시하고 시작 위치로 이동
  // 슬라이드 효과는 위치 이동만 하므로 alpha는 항상 1로 유지
  toSprite.visible = true
  toSprite.alpha = 1

  const targetX = direction === 'left' || direction === 'right' ? originalX : undefined
  const targetY = direction === 'up' || direction === 'down' ? originalY : undefined

  // 텍스트는 applyEnterEffect에서 이미 설정되므로 여기서는 스프라이트만 처리
  // 중복 렌더링 방지를 위해 텍스트 visible/alpha 설정 제거

  timeline.to(
    slideObj,
    {
      ...(targetX !== undefined && { x: targetX }),
      ...(targetY !== undefined && { y: targetY }),
      duration,
      onUpdate: function () {
        if (toSprite && containerRef.current) {
          // ensureInContainer는 매 프레임마다 호출하지 않음 (이미 컨테이너에 추가되어 있음)
          // 위치만 업데이트
          if (direction === 'left' || direction === 'right') {
            toSprite.x = (slideObj as { x: number }).x
          } else {
            toSprite.y = (slideObj as { y: number }).y
          }
          toSprite.visible = true
          toSprite.alpha = 1  // 슬라이드 효과는 alpha 변경 없음
        }
      },
    },
    0
  )
}

