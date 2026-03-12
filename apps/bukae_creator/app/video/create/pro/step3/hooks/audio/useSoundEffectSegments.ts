import { useMemo, useCallback } from 'react'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getPlayableScenes } from '../../utils/proPlaybackUtils'
import type { ProStep3Scene } from '../../model/types'
import type { TimelineData } from '@/lib/types/domain/timeline'

const MIN_AUDIO_SEGMENT_SEC = 0.001

export interface SoundEffectSegmentInfo {
  segmentIndex: number
  sceneIndex: number
  partIndex: number
  startSec: number
  endSec: number
}

interface UseSoundEffectSegmentsParams {
  scenes: ProStep3Scene[]
  timeline: TimelineData | null
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>
  ttsCacheVersion: number
}

export function useSoundEffectSegments({
  scenes,
  timeline,
  ttsCacheRef,
  ttsCacheVersion,
}: UseSoundEffectSegmentsParams) {
  const soundEffectTimelineKey = useMemo(() => {
    if (!timeline?.scenes || timeline.scenes.length === 0) {
      return ''
    }

    return timeline.scenes
      .map((scene, sceneIndex) => {
        const textContent = scene.text?.content ?? ''
        const voiceTemplate = scene.voiceTemplate ?? ''
        const soundEffect = scene.soundEffect ?? ''
        const duration = Number.isFinite(scene.duration) ? scene.duration : 0
        return `${sceneIndex}:${textContent}:${voiceTemplate}:${soundEffect}:${duration}`
      })
      .join('|')
  }, [timeline])

  const soundEffectSceneKey = useMemo(() => {
    if (scenes.length === 0) {
      return ''
    }

    return scenes
      .map((scene, sceneIndex) => {
        const voiceTemplate = scene.voiceTemplate ?? ''
        const script = scene.script ?? ''
        const ttsDuration = scene.ttsDuration ?? 0
        const selectionStart = scene.selectionStartSeconds ?? 0
        const selectionEnd = scene.selectionEndSeconds ?? 0
        return `${sceneIndex}:${voiceTemplate}:${script}:${ttsDuration}:${selectionStart}:${selectionEnd}`
      })
      .join('|')
  }, [scenes])

  const soundEffectSegments = useMemo<SoundEffectSegmentInfo[]>(() => {
    const currentTimeline = timeline
    if (!currentTimeline?.scenes || currentTimeline.scenes.length === 0 || scenes.length === 0) {
      return []
    }

    const playableScenes = getPlayableScenes(scenes)
    if (playableScenes.length === 0) {
      return []
    }

    const segments: SoundEffectSegmentInfo[] = []
    let accumulatedTime = 0
    let segmentIndex = 0

    playableScenes.forEach((playableScene) => {
      const sceneIndex = playableScene.originalIndex
      const timelineScene = currentTimeline.scenes[sceneIndex]
      if (!timelineScene) {
        accumulatedTime += playableScene.duration
        return
      }

      const sceneDuration = Math.max(playableScene.duration, MIN_AUDIO_SEGMENT_SEC)
      const sceneVoiceTemplate = (timelineScene.voiceTemplate ?? scenes[sceneIndex]?.voiceTemplate ?? '').trim()
      const markups = buildSceneMarkup(currentTimeline, sceneIndex)

      let partDurations: number[] = [sceneDuration]
      if (sceneVoiceTemplate && markups.length > 0) {
        const cachedDurations = markups.map((markup) => {
          const key = makeTtsKey(sceneVoiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          return cached?.durationSec && cached.durationSec > 0 ? cached.durationSec : 0
        })

        const hasAllDurations = cachedDurations.every((duration) => duration > 0)
        const totalCachedDuration = cachedDurations.reduce((sum, duration) => sum + duration, 0)
        if (hasAllDurations && totalCachedDuration > 0) {
          const scale = sceneDuration / totalCachedDuration
          const normalizedDurations = cachedDurations.map((duration) => duration * scale)
          const leadingDurationSum = normalizedDurations
            .slice(0, Math.max(0, normalizedDurations.length - 1))
            .reduce((sum, duration) => sum + duration, 0)

          if (normalizedDurations.length > 0) {
            normalizedDurations[normalizedDurations.length - 1] = Math.max(
              MIN_AUDIO_SEGMENT_SEC,
              sceneDuration - leadingDurationSum
            )
          }

          partDurations = normalizedDurations
        }
      }

      let partStartTime = accumulatedTime
      partDurations.forEach((duration, partIndex) => {
        const safeDuration = Math.max(duration, MIN_AUDIO_SEGMENT_SEC)
        const isLastPart = partIndex === partDurations.length - 1
        const partEndTime = isLastPart ? accumulatedTime + sceneDuration : partStartTime + safeDuration

        segments.push({
          segmentIndex,
          sceneIndex,
          partIndex,
          startSec: partStartTime,
          endSec: partEndTime,
        })

        segmentIndex += 1
        partStartTime = partEndTime
      })

      accumulatedTime += sceneDuration
    })

    return segments
    // timeline/scenes 전체 변경은 잦아서 오디오 관련 키 기반으로만 재계산한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEffectTimelineKey, soundEffectSceneKey, ttsCacheVersion])

  const getActiveSegmentForSoundEffect = useCallback(
    (timeSec: number) => {
      if (soundEffectSegments.length === 0) {
        return null
      }

      const safeTime = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0
      let left = 0
      let right = soundEffectSegments.length - 1
      let matched: SoundEffectSegmentInfo | null = null

      while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        const candidate = soundEffectSegments[mid]
        if (!candidate) {
          break
        }

        if (safeTime < candidate.startSec) {
          right = mid - 1
          continue
        }
        if (safeTime >= candidate.endSec) {
          left = mid + 1
          continue
        }

        matched = candidate
        break
      }

      if (!matched) {
        matched = safeTime < soundEffectSegments[0]!.startSec
          ? soundEffectSegments[0]!
          : soundEffectSegments[soundEffectSegments.length - 1]!
      }

      return {
        segment: {
          sceneIndex: matched.sceneIndex,
          partIndex: matched.partIndex,
          startSec: matched.startSec,
        },
        offset: Math.max(0, safeTime - matched.startSec),
        segmentIndex: matched.segmentIndex,
      }
    },
    [soundEffectSegments]
  )

  return { soundEffectSegments, getActiveSegmentForSoundEffect }
}
