import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { getPlayableSceneStartTime, getPlayableScenes, getSceneSegmentDuration } from './proPlaybackUtils'

export interface TtsNextAction {
  type: 'next'
  sceneIndex: number
  seekTo: number
}

export interface TtsStopAction {
  type: 'stop'
  seekTo: number
}

export type TtsEndedAction = TtsNextAction | TtsStopAction

/**
 * 씬 `finishedSceneIndex`의 TTS 재생이 끝났을 때 다음 동작을 결정합니다.
 *
 * - 다음 재생 가능한 씬이 있으면: `{ type: 'next', sceneIndex, seekTo }` — Transport를 다음 씬 시작 시간으로 seek 후 해당 TTS 재생
 * - 마지막 재생 가능한 씬이면: `{ type: 'stop', seekTo }` — Transport를 타임라인 끝으로 seek 후 정지
 * - 재생 불가능한 씬이 완료됐다고 들어오면: null (호출 자체가 잘못된 경우)
 */
export function computeOnTtsEnded(
  scenes: ProStep3Scene[],
  finishedSceneIndex: number
): TtsEndedAction | null {
  const playable = getPlayableScenes(scenes)

  const finishedPlayableIdx = playable.findIndex((p) => p.originalIndex === finishedSceneIndex)
  if (finishedPlayableIdx === -1) {
    return null
  }

  const nextPlayable = playable[finishedPlayableIdx + 1]

  if (!nextPlayable) {
    // 마지막 씬: 타임라인 끝 시간을 계산해서 정지
    let totalDuration = 0
    for (const p of playable) {
      totalDuration += p.duration
    }
    return { type: 'stop', seekTo: totalDuration }
  }

  const seekTo = getPlayableSceneStartTime(scenes, nextPlayable.originalIndex)
  if (seekTo === null) {
    return null
  }

  return { type: 'next', sceneIndex: nextPlayable.originalIndex, seekTo }
}

/**
 * Transport 시간 `transportTime`에서 씬 `sceneIndex`의 TTS를 재생할 때,
 * TTS 오디오를 어느 위치(초)부터 시작해야 하는지 반환합니다.
 *
 * - Transport가 씬 시작 이전이면 0
 * - Transport가 씬 중간이면 (transportTime - sceneStartTime)
 * - Transport가 TTS duration을 넘어서면 duration에 근접한 값으로 clamp
 */
export function computeTtsStartOffset(
  scenes: ProStep3Scene[],
  sceneIndex: number,
  transportTime: number
): number {
  const sceneStartTime = getPlayableSceneStartTime(scenes, sceneIndex)
  if (sceneStartTime === null) {
    return 0
  }

  const scene = scenes[sceneIndex]
  if (!scene) {
    return 0
  }

  const maxDuration = getSceneSegmentDuration(scene)
  const rawOffset = transportTime - sceneStartTime
  const clampedOffset = Math.max(0, Math.min(rawOffset, maxDuration > 0 ? maxDuration - 0.01 : 0))

  return clampedOffset
}
