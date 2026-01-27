/**
 * Base State 리셋 유틸리티
 * 매 프레임 sprite/text를 기본값으로 리셋하여 누적 업데이트/상태 누수 방지
 * ANIMATION.md 표준 파이프라인 4단계
 */

import * as React from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { StageDimensions } from '../../types/common'
import { getFabricImagePosition } from './getFabricPosition'

/**
 * Base State 리셋 함수
 * 매 프레임 sprite/text를 기본값으로 리셋하여 누적 업데이트/상태 누수 방지
 * 원래 위치는 Fabric canvas에서 사용자가 설정한 위치를 사용
 * 
 * @param sprite Sprite 객체 (null 가능)
 * @param text Text 객체 (null 가능)
 * @param sceneIndex 씬 인덱스
 * @param scene 씬 데이터
 * @param fabricCanvasRef Fabric canvas ref
 * @param fabricScaleRatioRef Fabric 스케일 비율 ref
 * @param stageDimensions 스테이지 크기
 */
export function resetBaseState(
  sprite: PIXI.Sprite | null,
  text: PIXI.Text | null,
  sceneIndex: number,
  scene: TimelineData['scenes'][number],
  fabricCanvasRef: React.RefObject<fabric.Canvas | null> | undefined,
  fabricScaleRatioRef: React.MutableRefObject<number> | undefined,
  stageDimensions: StageDimensions
): void {
  // Sprite 기본값 리셋
  if (sprite && !sprite.destroyed) {
    // 원래 위치는 Fabric canvas에서 사용자가 설정한 위치를 가져옴
    const position = getFabricImagePosition(
      sceneIndex,
      scene,
      fabricCanvasRef,
      fabricScaleRatioRef,
      stageDimensions
    )

    // 사용자가 Fabric에서 설정한 원래 위치로 리셋
    // PIXI에서 width/height와 scale은 서로 영향을 주므로, 원본 텍스처 크기를 기준으로 계산
    sprite.x = position.x
    sprite.y = position.y
    sprite.rotation = position.rotation
    
    // 원본 텍스처 크기를 기준으로 width/height를 설정한 후 scale 적용
    // 이렇게 하면 Motion 적용 시 scale 변경이 올바르게 작동함
    const texture = sprite.texture
    if (texture && texture.width > 0 && texture.height > 0) {
      // 원본 텍스처 크기를 기준으로 목표 크기 계산
      const targetWidth = position.width
      const targetHeight = position.height
      
      // 원본 텍스처 크기를 기준으로 scale 계산
      const calculatedScaleX = targetWidth / texture.width
      const calculatedScaleY = targetHeight / texture.height
      
      // 계산된 scale을 적용 (Fabric에서 설정한 scale과 일치해야 함)
      sprite.scale.set(calculatedScaleX, calculatedScaleY)
    } else {
      // 텍스처가 없으면 Fabric에서 가져온 scale 직접 사용
      sprite.scale.set(position.scaleX, position.scaleY)
    }

    // 기본 속성 리셋
    sprite.alpha = 1
    sprite.visible = true
    sprite.filters = []
    
    // tint는 Motion 적용 시 변경되므로 여기서는 원본 색상으로 리셋
    sprite.tint = 0xFFFFFF // 흰색 (원본 색상)

    // 마스크 제거
    if (sprite.mask) {
      sprite.mask = null
    }
  }

  // Text 기본값 리셋 제거
  // 자막은 step7에서 매 프레임마다 렌더링되므로, 여기서 리셋하면 Transition 진행 중 자막이 사라지는 문제 발생
  // 다른 씬의 텍스트는 step6에서 이미 숨기고 있으므로, resetBaseState에서 텍스트를 리셋할 필요 없음
  // 자막의 visible/alpha는 step7의 renderSubtitlePart에서 관리됨
}
