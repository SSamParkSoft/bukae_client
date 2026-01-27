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
    sprite.x = position.x
    sprite.y = position.y
    sprite.width = position.width
    sprite.height = position.height
    sprite.rotation = position.rotation
    sprite.scale.set(1, 1) // scale은 transform에 저장되지 않으므로 항상 1로 리셋

    // 기본 속성 리셋
    sprite.alpha = 1
    sprite.visible = true
    sprite.filters = []

    // 마스크 제거
    if (sprite.mask) {
      sprite.mask = null
    }
  }

  // Text 기본값 리셋 (자막은 별도 로직으로 최종 세팅되므로 visible/alpha만 최소 리셋)
  if (text && !text.destroyed) {
    text.visible = false
    text.alpha = 0
  }
}
