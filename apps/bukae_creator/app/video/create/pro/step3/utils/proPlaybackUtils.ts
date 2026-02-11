import type { ProStep3Scene } from '@/app/video/create/pro/step3/components/ProSceneListPanel'

export interface PlayableScene {
  scene: ProStep3Scene
  originalIndex: number
  duration: number
}

const EPSILON_SECONDS = 0.001

export function getSceneSegmentDuration(scene: ProStep3Scene): number {
  const start = scene.selectionStartSeconds ?? 0
  const end = scene.selectionEndSeconds ?? start
  return Math.max(0, end - start)
}

export function isPlayableScene(scene: ProStep3Scene): boolean {
  if (!scene.videoUrl) {
    return false
  }

  return getSceneSegmentDuration(scene) > EPSILON_SECONDS
}

export function getPlayableScenes(scenes: ProStep3Scene[]): PlayableScene[] {
  return scenes
    .map((scene, originalIndex) => ({
      scene,
      originalIndex,
      duration: getSceneSegmentDuration(scene),
    }))
    .filter((item) => isPlayableScene(item.scene))
}

export function getPreviousPlayableDuration(playableScenes: PlayableScene[], segmentIndex: number): number {
  if (segmentIndex <= 0) {
    return 0
  }

  return playableScenes
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
