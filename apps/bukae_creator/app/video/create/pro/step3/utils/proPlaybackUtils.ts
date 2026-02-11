import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import {
  clampPlaybackTime as clampPlaybackTimeShared,
  getPlayableDurationBeforeSceneIndex as getPlayableDurationBeforeSceneIndexShared,
  getPlayableSegmentStartTimeBySceneIndex as getPlayableSegmentStartTimeBySceneIndexShared,
  getPlayableSegments,
  getPreviousPlayableDuration as getPreviousPlayableDurationShared,
  getSegmentDuration,
  isPlayableSegment,
  resolvePlayableSegmentAtTime as resolvePlayableSegmentAtTimeShared,
} from '@/app/video/create/step3/shared/model'

export interface PlayableScene {
  scene: ProStep3Scene
  originalIndex: number
  duration: number
}

export interface ResolvedProSceneAtTime {
  scene: ProStep3Scene
  sceneIndex: number
  playableIndex: number
  sceneStartTime: number
  sceneTimeInSegment: number
  duration: number
  totalDuration: number
}

function toStep3SceneLike(scenes: ProStep3Scene[]) {
  return scenes.map((scene) => ({
    ...scene,
    mediaUrl: scene.videoUrl,
  }))
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
  const playable = getPlayableSegments(toStep3SceneLike(scenes))

  return playable.map(({ originalIndex, duration }) => ({
    scene: scenes[originalIndex] as ProStep3Scene,
    originalIndex,
    duration,
  }))
}

export function getPreviousPlayableDuration(playableScenes: PlayableScene[], segmentIndex: number): number {
  return getPreviousPlayableDurationShared(playableScenes, segmentIndex)
}

export function getDurationBeforeSceneIndex(scenes: ProStep3Scene[], sceneIndex: number): number {
  return getPlayableDurationBeforeSceneIndexShared(toStep3SceneLike(scenes), sceneIndex)
}

export function getPlayableSceneStartTime(scenes: ProStep3Scene[], sceneIndex: number): number | null {
  return getPlayableSegmentStartTimeBySceneIndexShared(toStep3SceneLike(scenes), sceneIndex)
}

export function resolveProSceneAtTime(
  scenes: ProStep3Scene[],
  tSec: number,
  options?: { forceSceneIndex?: number }
): ResolvedProSceneAtTime | null {
  const resolved = resolvePlayableSegmentAtTimeShared(toStep3SceneLike(scenes), tSec, options)
  if (!resolved) {
    return null
  }

  return {
    scene: scenes[resolved.originalIndex] as ProStep3Scene,
    sceneIndex: resolved.originalIndex,
    playableIndex: resolved.playableIndex,
    sceneStartTime: resolved.sceneStartTime,
    sceneTimeInSegment: resolved.sceneTimeInSegment,
    duration: resolved.duration,
    totalDuration: resolved.totalDuration,
  }
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
