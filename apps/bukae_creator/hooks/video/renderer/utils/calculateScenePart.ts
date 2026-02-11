/**
 * 씬/파트 계산 유틸리티
 * 시간 `t`에서 씬 인덱스와 파트 인덱스 계산
 */

import { resolvePlayableSegmentAtTime } from '@/app/video/create/step3/shared/model'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSceneStartTime } from '@/utils/timeline'
import { calculateSceneFromTime, getSceneStartTimeFromTts } from '@/utils/timeline-render'

/**
 * 씬/파트 계산 결과
 */
export interface ScenePartResult {
  /** 씬 인덱스 */
  sceneIndex: number
  /** 파트 인덱스 */
  partIndex: number
  /** 해당 씬의 시작 시간 (TTS 기준 when options provided) */
  sceneStartTime: number
}

/**
 * 씬/파트 계산 파라미터
 */
export interface CalculateScenePartParams {
  /** 타임라인 데이터 */
  timeline: TimelineData
  /** 시간 (초) */
  tSec: number
  /** 강제 씬 인덱스 (지정하면 tSec 계산 대신 이 씬을 직접 사용) */
  forceSceneIndex?: number
  /** TTS 캐시 ref */
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>
  /** 음성 템플릿 */
  voiceTemplate?: string | null
  /** 씬 마크업 생성 함수 */
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  /** TTS 키 생성 함수 */
  makeTtsKey?: (voiceName: string, markup: string) => string
}

function resolvePartIndexForScene({
  timeline,
  sceneIndex,
  relativeTime,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: {
  timeline: TimelineData
  sceneIndex: number
  relativeTime: number
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>
  voiceTemplate?: string | null
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey?: (voiceName: string, markup: string) => string
}): number {
  const scene = timeline.scenes[sceneIndex]
  if (!scene) {
    return 0
  }

  if (!ttsCacheRef || !buildSceneMarkup || !makeTtsKey) {
    return 0
  }

  const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
  if (!sceneVoiceTemplate) {
    return 0
  }

  const markups = buildSceneMarkup(timeline, sceneIndex)
  if (markups.length === 0) {
    return 0
  }

  let partIndex = 0
  let partAccumulatedTime = 0

  for (let p = 0; p < markups.length; p++) {
    const markup = markups[p]
    if (!markup) {
      continue
    }

    const key = makeTtsKey(sceneVoiceTemplate, markup)
    const cached = ttsCacheRef.current.get(key)
    const partDuration = cached?.durationSec || 0
    const partEndTime = partAccumulatedTime + partDuration

    if (relativeTime >= partAccumulatedTime && relativeTime < partEndTime) {
      partIndex = p
      break
    }

    if (p === markups.length - 1 && relativeTime >= partEndTime) {
      partIndex = p
      break
    }

    partAccumulatedTime = partEndTime
  }

  return partIndex
}

function buildTimelineSegmentsForTtsBoundary({
  timeline,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: {
  timeline: TimelineData
  ttsCacheRef: React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>
  voiceTemplate?: string | null
  buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: (voiceName: string, markup: string) => string
}) {
  return timeline.scenes.map((scene, index) => {
    let sceneDuration = 0
    const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate

    if (sceneVoiceTemplate) {
      const markups = buildSceneMarkup(timeline, index)
      for (const markup of markups) {
        if (!markup) {
          continue
        }

        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached?.durationSec && cached.durationSec > 0) {
          sceneDuration += cached.durationSec
        }
      }
    }

    if (sceneDuration <= 0) {
      sceneDuration = scene.duration ?? 0
    }

    return {
      ttsDuration: sceneDuration,
      // resolver는 playable media 조건이 필요하므로 timing-only 경로에서는 dummy media 허용
      mediaUrl: scene.image || `__timeline_scene_${index}`,
    }
  })
}

/**
 * 시간 `t`에서 씬 인덱스와 파트 인덱스 계산
 *
 * @param params 계산 파라미터
 * @returns 씬 인덱스와 파트 인덱스
 */
export function calculateScenePartFromTime({
  timeline,
  tSec,
  forceSceneIndex,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: CalculateScenePartParams): ScenePartResult {
  let sceneIndex: number
  let partIndex = 0
  let sceneStartTime = 0
  const hasTtsOptions = Boolean(ttsCacheRef && buildSceneMarkup && makeTtsKey)

  if (forceSceneIndex !== undefined) {
    sceneIndex = forceSceneIndex

    if (hasTtsOptions && ttsCacheRef && buildSceneMarkup && makeTtsKey) {
      const segments = buildTimelineSegmentsForTtsBoundary({
        timeline,
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
      })
      const resolved = resolvePlayableSegmentAtTime(segments, tSec, { forceSceneIndex: sceneIndex })
      sceneStartTime = resolved?.sceneStartTime ?? getSceneStartTimeFromTts(timeline, sceneIndex, {
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
      })
    } else {
      sceneStartTime = getSceneStartTime(timeline, sceneIndex)
    }

    const relativeTime = Math.max(0, tSec - sceneStartTime)
    partIndex = resolvePartIndexForScene({
      timeline,
      sceneIndex,
      relativeTime,
      ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
    })
  } else if (hasTtsOptions && ttsCacheRef && buildSceneMarkup && makeTtsKey) {
    const segments = buildTimelineSegmentsForTtsBoundary({
      timeline,
      ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
    })
    const resolved = resolvePlayableSegmentAtTime(segments, tSec)

    if (resolved) {
      sceneIndex = resolved.originalIndex
      sceneStartTime = resolved.sceneStartTime
      const relativeTime = Math.max(0, tSec - sceneStartTime)
      partIndex = resolvePartIndexForScene({
        timeline,
        sceneIndex,
        relativeTime,
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
      })
    } else {
      const calculated = calculateSceneFromTime(
        timeline,
        tSec,
        {
          ttsCacheRef,
          voiceTemplate,
          buildSceneMarkup,
          makeTtsKey,
        }
      )
      sceneIndex = calculated.sceneIndex
      partIndex = calculated.partIndex
      sceneStartTime = calculated.sceneStartTime
    }
  } else {
    const calculated = calculateSceneFromTime(
      timeline,
      tSec,
      {
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
      }
    )
    sceneIndex = calculated.sceneIndex
    partIndex = calculated.partIndex
    sceneStartTime = calculated.sceneStartTime
  }

  return {
    sceneIndex,
    partIndex,
    sceneStartTime,
  }
}
