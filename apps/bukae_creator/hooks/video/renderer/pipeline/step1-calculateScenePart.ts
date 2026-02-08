/**
 * Step 1: 씬/파트 계산
 * ANIMATION.md 표준 파이프라인 1단계
 */

import { calculateScenePartFromTime } from '../utils/calculateScenePart'
import type { PipelineContext, Step1Result } from './types'

/**
 * 1단계: 씬/파트 계산
 * 
 * @param context 파이프라인 컨텍스트
 * @returns 씬 인덱스와 파트 인덱스, 또는 null (유효하지 않은 경우)
 */
export function step1CalculateScenePart(context: PipelineContext): Step1Result | null {
  const { timeline, tSec, options, ttsCacheRef, voiceTemplate, buildSceneMarkup, makeTtsKey } = context

  // t에서 씬과 구간 계산
  const { sceneIndex, partIndex, sceneStartTime } = calculateScenePartFromTime({
    timeline,
    tSec,
    forceSceneIndex: options?.forceSceneIndex,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
  })

  // 유효하지 않은 씬 인덱스면 렌더링하지 않음
  if (sceneIndex < 0 || sceneIndex >= timeline.scenes.length) {
    return null
  }

  return {
    sceneIndex,
    partIndex: partIndex ?? null,
    sceneStartTime,
  }
}
