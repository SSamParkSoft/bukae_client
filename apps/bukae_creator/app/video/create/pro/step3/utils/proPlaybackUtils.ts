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

const SEGMENT_END_EPSILON_SEC = 0.001

/**
 * 씬의 선택 구간(selectionStart~selectionEnd) 안으로 비디오 시간을 제한합니다.
 * 타임라인 세그먼트 길이가 TTS 기준으로 더 길더라도, 영상은 사용자가 선택한 구간 밖으로 재생하지 않습니다.
 */
export function clampVideoTimeToSelection(scene: ProStep3Scene, rawVideoTime: number): number {
  const safeTime = Number.isFinite(rawVideoTime) ? rawVideoTime : 0
  const selectionStart = Number.isFinite(scene.selectionStartSeconds)
    ? scene.selectionStartSeconds
    : 0
  const selectionEnd = Number.isFinite(scene.selectionEndSeconds)
    ? scene.selectionEndSeconds
    : selectionStart

  if (selectionEnd <= selectionStart) {
    return Math.max(0, selectionStart)
  }

  // 마지막 프레임 안정성을 위해 end 바로 직전까지만 허용
  const maxPlayableTime = Math.max(selectionStart, selectionEnd - SEGMENT_END_EPSILON_SEC)
  return Math.max(selectionStart, Math.min(safeTime, maxPlayableTime))
}

/**
 * TTS보다 원본 영상이 짧을 때: 원본을 이어붙인 "확장 소스" 위에서 사용자가 격자로 선택한 구간을 재생합니다.
 * 선택 구간 내 시간(sceneTimeInSegment)을 원본 비디오의 재생 시간으로 변환합니다.
 * - originalVideoDurationSeconds가 있으면: 소스 시간 = selectionStart + sceneTimeInSegment, 비디오 시간 = 소스 시간 % 원본길이 (원본 영상을 1번, 2번, … 재생하는 식).
 * - 없으면: 기존처럼 선택 구간 길이로 나머지 연산(하위 호환).
 */
export function getVideoTimeInSelectionWithLoop(
  scene: ProStep3Scene,
  sceneTimeInSegment: number,
  originalVideoDurationSeconds?: number
): number {
  const selectionStart = Number.isFinite(scene.selectionStartSeconds)
    ? scene.selectionStartSeconds
    : 0
  const selectionEnd = Number.isFinite(scene.selectionEndSeconds)
    ? scene.selectionEndSeconds
    : selectionStart
  const selectionDuration = Math.max(0, selectionEnd - selectionStart)
  const safeTime = Number.isFinite(sceneTimeInSegment) && sceneTimeInSegment >= 0 ? sceneTimeInSegment : 0

  const originalDuration =
    originalVideoDurationSeconds != null && Number.isFinite(originalVideoDurationSeconds) && originalVideoDurationSeconds > 0
      ? originalVideoDurationSeconds
      : 0

  if (originalDuration > 0) {
    // 확장 소스: 소스 시간 = 선택 시작 + 세그먼트 내 시간 → 원본 비디오 시간 = 소스 % 원본길이
    const sourceTime = selectionStart + safeTime
    const offsetInOriginal = sourceTime % originalDuration
    const clamped = Math.min(offsetInOriginal, originalDuration - SEGMENT_END_EPSILON_SEC)
    return Math.max(0, clamped)
  }

  if (selectionDuration <= 0) {
    return selectionStart
  }

  const offsetInSelection = safeTime % selectionDuration
  const clampedOffset = Math.min(offsetInSelection, selectionDuration - SEGMENT_END_EPSILON_SEC)
  return selectionStart + clampedOffset
}

/**
 * TTS보다 원본 영상이 짧을 때, 격자 편집용 "확장 소스" 길이(초).
 * 예: 원본 7초, TTS 12초 → ceil(12/7)*7 = 14초. 이 14초 위에서 사용자가 12초 구간을 선택.
 */
export function getEffectiveSourceDuration(
  ttsDuration: number,
  originalVideoDurationSeconds: number
): number {
  if (!Number.isFinite(originalVideoDurationSeconds) || originalVideoDurationSeconds <= 0) {
    return ttsDuration
  }
  if (!Number.isFinite(ttsDuration) || ttsDuration <= 0) {
    return originalVideoDurationSeconds
  }
  if (originalVideoDurationSeconds >= ttsDuration) {
    return originalVideoDurationSeconds
  }
  const n = Math.ceil(ttsDuration / originalVideoDurationSeconds)
  return n * originalVideoDurationSeconds
}

const DEFAULT_TTS_DURATION_SEC = 10
const MIN_SELECTION_SPAN_SEC = 0.001

export interface NormalizeSelectionRangeParams {
  ttsDuration?: number
  originalVideoDurationSeconds?: number
  selectionStartSeconds?: number
  selectionEndSeconds?: number
}

export interface NormalizedSelectionRange {
  startSeconds: number
  endSeconds: number
  spanSeconds: number
  ttsDurationSeconds: number
  effectiveSourceDurationSeconds: number
}

/**
 * 선택 구간을 안정적으로 정규화합니다.
 * - 원본이 TTS보다 짧으면 확장 소스 길이를 기준으로 계산합니다.
 * - start/end가 누락/역전/범위초과여도 항상 유효한 구간으로 보정합니다.
 * - span은 기본적으로 TTS 길이를 유지하되 소스 길이를 넘지 않도록 제한합니다.
 */
export function normalizeSelectionRange({
  ttsDuration,
  originalVideoDurationSeconds,
  selectionStartSeconds,
  selectionEndSeconds,
}: NormalizeSelectionRangeParams): NormalizedSelectionRange {
  const safeTtsDuration =
    Number.isFinite(ttsDuration) && (ttsDuration as number) > 0
      ? (ttsDuration as number)
      : DEFAULT_TTS_DURATION_SEC

  const safeOriginalDuration =
    Number.isFinite(originalVideoDurationSeconds) && (originalVideoDurationSeconds as number) > 0
      ? (originalVideoDurationSeconds as number)
      : 0

  const rawStart =
    Number.isFinite(selectionStartSeconds) && (selectionStartSeconds as number) >= 0
      ? (selectionStartSeconds as number)
      : 0

  const hasValidEnd =
    Number.isFinite(selectionEndSeconds) &&
    (selectionEndSeconds as number) > rawStart

  const rawEnd = hasValidEnd ? (selectionEndSeconds as number) : null

  const effectiveSourceDurationSeconds =
    safeOriginalDuration > 0
      ? getEffectiveSourceDuration(safeTtsDuration, safeOriginalDuration)
      : Math.max(safeTtsDuration, rawEnd ?? 0)

  const defaultSpan = Math.min(safeTtsDuration, effectiveSourceDurationSeconds)
  const rawSpan = hasValidEnd
    ? (selectionEndSeconds as number) - rawStart
    : defaultSpan

  const spanSeconds = Math.max(
    MIN_SELECTION_SPAN_SEC,
    Math.min(rawSpan, effectiveSourceDurationSeconds)
  )

  const maxStartSeconds = Math.max(0, effectiveSourceDurationSeconds - spanSeconds)
  const startSeconds = Math.max(0, Math.min(rawStart, maxStartSeconds))
  const endSeconds = startSeconds + spanSeconds

  return {
    startSeconds,
    endSeconds,
    spanSeconds,
    ttsDurationSeconds: safeTtsDuration,
    effectiveSourceDurationSeconds,
  }
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
