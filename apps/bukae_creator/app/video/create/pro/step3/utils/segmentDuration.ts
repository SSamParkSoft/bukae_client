export interface SegmentDurationSceneLike {
  ttsDuration?: number
  selectionStartSeconds?: number
  selectionEndSeconds?: number
  mediaUrl?: string | null
  videoUrl?: string | null
}

export interface PlayableSegment<T extends SegmentDurationSceneLike> {
  scene: T
  originalIndex: number
  duration: number
}

export interface ResolvedPlayableSegment<T extends SegmentDurationSceneLike> extends PlayableSegment<T> {
  playableIndex: number
  sceneStartTime: number
  sceneTimeInSegment: number
  totalDuration: number
}

const EPSILON_SECONDS = 0.001

export function getSegmentDuration(scene: SegmentDurationSceneLike): number {
  if (scene.ttsDuration && scene.ttsDuration > 0) {
    return scene.ttsDuration
  }

  const start = scene.selectionStartSeconds ?? 0
  const end = scene.selectionEndSeconds ?? start
  return Math.max(0, end - start)
}

function hasPlayableMedia(scene: SegmentDurationSceneLike): boolean {
  if (scene.mediaUrl) {
    return true
  }
  if (scene.videoUrl) {
    return true
  }
  return false
}

export function isPlayableSegment(scene: SegmentDurationSceneLike): boolean {
  return hasPlayableMedia(scene) && getSegmentDuration(scene) > EPSILON_SECONDS
}

export function getPlayableSegments<T extends SegmentDurationSceneLike>(
  scenes: T[]
): PlayableSegment<T>[] {
  return scenes
    .map((scene, originalIndex) => ({
      scene,
      originalIndex,
      duration: getSegmentDuration(scene),
    }))
    .filter((item) => isPlayableSegment(item.scene))
}

export function getPlayableDurationBeforeSceneIndex<T extends SegmentDurationSceneLike>(
  scenes: T[],
  sceneIndex: number
): number {
  const playableSegments = getPlayableSegments(scenes)
  return playableSegments
    .filter((item) => item.originalIndex < sceneIndex)
    .reduce((sum, item) => sum + item.duration, 0)
}

export function getPlayableSegmentStartTimeBySceneIndex<T extends SegmentDurationSceneLike>(
  scenes: T[],
  sceneIndex: number
): number | null {
  const playableSegments = getPlayableSegments(scenes)
  const playableIndex = playableSegments.findIndex((item) => item.originalIndex === sceneIndex)
  if (playableIndex < 0) {
    return null
  }

  return getPreviousPlayableDuration(playableSegments, playableIndex)
}

export function resolvePlayableSegmentAtTime<T extends SegmentDurationSceneLike>(
  scenes: T[],
  tSec: number,
  options?: { forceSceneIndex?: number }
): ResolvedPlayableSegment<T> | null {
  const playableSegments = getPlayableSegments(scenes)
  if (playableSegments.length === 0) {
    return null
  }

  const totalDuration = playableSegments.reduce((sum, item) => sum + item.duration, 0)

  if (options?.forceSceneIndex !== undefined) {
    const playableIndex = playableSegments.findIndex((item) => item.originalIndex === options.forceSceneIndex)
    if (playableIndex < 0) {
      return null
    }
    const target = playableSegments[playableIndex]
    if (!target) {
      return null
    }
    const sceneStartTime = getPreviousPlayableDuration(playableSegments, playableIndex)
    return {
      scene: target.scene,
      originalIndex: target.originalIndex,
      duration: target.duration,
      playableIndex,
      sceneStartTime,
      sceneTimeInSegment: 0,
      totalDuration,
    }
  }

  const normalizedTime = Math.max(0, Number.isFinite(tSec) ? tSec : 0)

  let accumulatedTime = 0
  for (let i = 0; i < playableSegments.length; i++) {
    const item = playableSegments[i]
    if (!item) {
      continue
    }
    const sceneEndTime = accumulatedTime + item.duration
    if (normalizedTime >= accumulatedTime && normalizedTime < sceneEndTime) {
      return {
        scene: item.scene,
        originalIndex: item.originalIndex,
        duration: item.duration,
        playableIndex: i,
        sceneStartTime: accumulatedTime,
        sceneTimeInSegment: normalizedTime - accumulatedTime,
        totalDuration,
      }
    }
    accumulatedTime = sceneEndTime
  }

  const lastPlayableIndex = playableSegments.length - 1
  const lastPlayable = playableSegments[lastPlayableIndex]
  if (!lastPlayable) {
    return null
  }
  const lastSceneStartTime = totalDuration - lastPlayable.duration
  if (normalizedTime >= lastSceneStartTime) {
    return {
      scene: lastPlayable.scene,
      originalIndex: lastPlayable.originalIndex,
      duration: lastPlayable.duration,
      playableIndex: lastPlayableIndex,
      sceneStartTime: lastSceneStartTime,
      sceneTimeInSegment: Math.min(normalizedTime - lastSceneStartTime, lastPlayable.duration),
      totalDuration,
    }
  }

  return null
}

export function getPreviousPlayableDuration<T extends SegmentDurationSceneLike>(
  playableSegments: Array<PlayableSegment<T>>,
  segmentIndex: number
): number {
  if (segmentIndex <= 0) {
    return 0
  }

  return playableSegments
    .slice(0, segmentIndex)
    .reduce((sum, item) => sum + item.duration, 0)
}

export function clampPlaybackTime(time: number, totalDuration: number): number {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
    return 0
  }

  if (!Number.isFinite(time)) {
    return 0
  }

  return Math.max(0, Math.min(time, totalDuration))
}
