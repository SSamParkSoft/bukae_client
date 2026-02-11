import type { ProStep3Scene } from '@/app/video/create/pro/step3/components/ProSceneListPanel'
import {
  clampPlaybackTime as clampPlaybackTimeShared,
  getPlayableSegments,
  getPreviousPlayableDuration as getPreviousPlayableDurationShared,
  getSegmentDuration,
  isPlayableSegment,
} from '@/app/video/create/_utils/step3'

export interface PlayableScene {
  scene: ProStep3Scene
  originalIndex: number
  duration: number
}

/**
 * 씬의 재생 duration을 계산합니다.
 * TTS duration이 있으면 우선 사용하고, 없으면 비디오 세그먼트 duration을 사용합니다.
 * Fast track과 동일한 로직: TTS duration을 기준으로 재생 시간을 계산하여 일관된 타이밍을 보장합니다.
 */
export function getSceneSegmentDuration(scene: ProStep3Scene): number {
  return getSegmentDuration(scene)
}

export function isPlayableScene(scene: ProStep3Scene): boolean {
  return isPlayableSegment({
    ...scene,
    mediaUrl: scene.videoUrl,
  })
}

export function getPlayableScenes(scenes: ProStep3Scene[]): PlayableScene[] {
  const playable = getPlayableSegments(
    scenes.map((scene) => ({
      ...scene,
      mediaUrl: scene.videoUrl,
    }))
  )

  return playable.map(({ originalIndex, duration }) => ({
    scene: scenes[originalIndex] as ProStep3Scene,
    originalIndex,
    duration,
  }))
}

export function getPreviousPlayableDuration(playableScenes: PlayableScene[], segmentIndex: number): number {
  return getPreviousPlayableDurationShared(playableScenes, segmentIndex)
}

export function clampPlaybackTime(time: number, totalDuration: number): number {
  return clampPlaybackTimeShared(time, totalDuration)
}

export function hasRecentGesture(
  timestamp: number | null | undefined,
  now = Date.now(),
  ttlMs = 3000
): boolean {
  if (!timestamp) {
    return false
  }

  const elapsed = now - timestamp
  return elapsed >= 0 && elapsed <= ttlMs
}
