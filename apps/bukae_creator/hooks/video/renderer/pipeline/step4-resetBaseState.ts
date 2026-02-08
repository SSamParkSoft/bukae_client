/**
 * Step 4: Base State 리셋
 * ANIMATION.md 표준 파이프라인 4단계
 * 매 프레임 항상 실행
 */

import { getSceneStartTimeFromTts } from '@/utils/timeline-render'
import { MOVEMENT_EFFECTS } from '../../types/effects'
import type { PipelineContext } from './types'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import * as PIXI from 'pixi.js'

/** 전환 직전으로 간주하는 구간 (초). 이 구간에서는 스프라이트 리셋 스킵 → 한 프레임 돌아가는 현상 방지 */
const TRANSITION_LEAD_BUFFER = 0.5

/**
 * 4단계: Base State 리셋
 *
 * 누적 업데이트/상태 누수 방지를 위해 매 프레임 기본값으로 리셋.
 * 단, 전환 직전이고 다음 전환이 움직임 효과일 때는 리셋하지 않음
 * (움직임 끝난 위치에서 슬라이드 아웃되도록, TIMING_POLICY.md).
 */
export function step4ResetBaseState(
  context: PipelineContext,
  sprite: PIXI.Sprite | null,
  sceneText: PIXI.Text | null,
  sceneIndex: number,
  scene: TimelineScene
): void {
  const {
    timeline,
    tSec,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    resetBaseStateCallback,
  } = context

  const nextScene = timeline.scenes[sceneIndex + 1]
  const nextTransition = (nextScene?.transition || 'none').toLowerCase()
  const isNextMovementEffect = MOVEMENT_EFFECTS.includes(
    nextTransition as (typeof MOVEMENT_EFFECTS)[number]
  )

  let nearNextSceneStart = false
  if (
    nextScene &&
    ttsCacheRef &&
    buildSceneMarkup &&
    makeTtsKey
  ) {
    const nextStart = getSceneStartTimeFromTts(timeline, sceneIndex + 1, {
      ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
    })
    nearNextSceneStart = tSec >= nextStart - TRANSITION_LEAD_BUFFER
  }

  if (nearNextSceneStart && isNextMovementEffect && sprite && !sprite.destroyed) {
    // 전환 직전 + 다음 전환이 움직임 효과 → 스프라이트 리셋 스킵 (움직임 끝 위치 유지)
    if (sceneText && !sceneText.destroyed) {
      resetBaseStateCallback(null, sceneText, sceneIndex, scene)
    }
    return
  }

  resetBaseStateCallback(sprite, sceneText, sceneIndex, scene)
}
