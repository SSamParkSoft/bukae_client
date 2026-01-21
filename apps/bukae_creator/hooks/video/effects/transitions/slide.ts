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

  // 여러 구간에 슬라이드 효과를 적용할 때 위치가 어긋나지 않도록
  // 항상 타임라인의 원래 위치(originalX, originalY)를 기준으로 시작 위치 계산
  // 앞 구간의 움직임 효과와 관계없이 항상 같은 기준점을 사용
  let offsetX = 0
  let offsetY = 0
  let slideObj: { x: number } | { y: number }
  let startX = originalX // 초기값 설정
  let startY = originalY // 초기값 설정

  switch (direction) {
    case 'left':
      offsetX = stageWidth * 0.1
      startX = originalX + offsetX
      slideObj = { x: startX }
      break
    case 'right':
      offsetX = stageWidth * 0.1
      startX = originalX - offsetX
      slideObj = { x: startX }
      break
    case 'up':
      // slide-up: 아래에서 위로 슬라이드 (아래에서 시작해서 위로 이동)
      offsetY = stageHeight * 0.1
      startY = originalY + offsetY
      slideObj = { y: startY }
      break
    case 'down':
      // slide-down: 위에서 아래로 슬라이드 (위에서 시작해서 아래로 이동)
      offsetY = stageHeight * 0.1
      startY = originalY - offsetY
      slideObj = { y: startY }
      break
  }

  // 이전 애니메이션 제거 전에 원래 위치로 복귀 (두 번째 구간 이후 원래 위치 복귀 보장)
  // timeline.clear()가 호출되면 이전 애니메이션의 onComplete가 실행되지 않을 수 있으므로
  // 미리 원래 위치로 설정하여 다음 구간이 올바른 위치에서 시작하도록 함
  toSprite.x = originalX
  toSprite.y = originalY

  // 이전 애니메이션 제거 (겹침 방지)
  timeline.clear()

  // 시작 위치 설정 (원래 위치 기준으로 계산된 시작 위치)
  if (direction === 'left' || direction === 'right') {
    toSprite.x = startX
  } else {
    toSprite.y = startY
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
      ease: 'none', // 선형 애니메이션으로 정확한 듀레이션 보장
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
      onComplete: function () {
        // 슬라이드 효과 완료 후 원래 위치로 확실히 설정
        // anchor가 (0.5, 0.5)이므로 originalX, originalY는 이미 중심점 좌표
        if (toSprite) {
          // 모든 방향에서 원래 위치로 복귀
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.visible = true
          toSprite.alpha = 1
        }
      },
    },
    0
  )
}

