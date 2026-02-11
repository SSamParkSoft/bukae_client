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
