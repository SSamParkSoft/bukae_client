/**
 * Step 4: Base State 리셋
 * ANIMATION.md 표준 파이프라인 4단계
 * 매 프레임 항상 실행
 */

import type { PipelineContext } from './types'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import * as PIXI from 'pixi.js'

/**
 * 4단계: Base State 리셋
 * 
 * 누적 업데이트/상태 누수 방지를 위해 매 프레임 항상 기본값으로 리셋
 * 중요: 컨테이너에 추가한 후에 리셋해야 removeChildren()으로 인한 제거 방지
 * Base State 리셋은 항상 실행하고, 그 다음 Motion/Transition이 적용됨
 * 
 * @param context 파이프라인 컨텍스트
 * @param sprite 스프라이트
 * @param sceneText 텍스트 객체
 * @param sceneIndex 씬 인덱스
 * @param scene 씬 데이터
 */
export function step4ResetBaseState(
  context: PipelineContext,
  sprite: PIXI.Sprite | null,
  sceneText: PIXI.Text | null,
  sceneIndex: number,
  scene: TimelineScene
): void {
  const { resetBaseStateCallback } = context

  // Base State 리셋: 매 프레임마다 항상 실행 (ANIMATION.md 표준)
  // Motion과 Transition은 Base State를 기준으로 적용되므로 항상 리셋 필요
  resetBaseStateCallback(sprite, sceneText, sceneIndex, scene)
}
