import { test, expect } from 'vitest'
import {
  clampPlaybackTime,
  clampVideoTimeToSelection,
  getDurationBeforeSceneIndex,
  getEffectiveSourceDuration,
  normalizeSelectionRange,
  getPlayableSceneStartTime,
  getPlayableScenes,
  getPreviousPlayableDuration,
  getSceneSegmentDuration,
  getVideoTimeInSelectionWithLoop,
  hasRecentGesture,
  isPlayableScene,
  resolveProSceneAtTime,
} from './proPlaybackUtils'
import type { ProStep3Scene } from '../model/types'

function makeScene(overrides: Partial<ProStep3Scene> = {}): ProStep3Scene {
  return {
    id: overrides.id !== undefined ? overrides.id : 'scene-1',
    script: overrides.script !== undefined ? overrides.script : 'hello',
    videoUrl: overrides.videoUrl !== undefined ? overrides.videoUrl : 'https://example.com/video.mp4',
    selectionStartSeconds: overrides.selectionStartSeconds !== undefined ? overrides.selectionStartSeconds : 0,
    selectionEndSeconds: overrides.selectionEndSeconds !== undefined ? overrides.selectionEndSeconds : 2,
    voiceLabel: overrides.voiceLabel,
    voiceTemplate: overrides.voiceTemplate,
    ttsDuration: overrides.ttsDuration,
  }
}

test('getSceneSegmentDuration returns positive segment length only', () => {
  expect(getSceneSegmentDuration(makeScene({ selectionStartSeconds: 1, selectionEndSeconds: 4 }))).toBe(3)
  expect(getSceneSegmentDuration(makeScene({ selectionStartSeconds: 4, selectionEndSeconds: 1 }))).toBe(0)
})

test('isPlayableScene requires videoUrl and positive duration', () => {
  expect(isPlayableScene(makeScene({ videoUrl: null }))).toBe(false)
  expect(
    isPlayableScene(makeScene({ selectionStartSeconds: 3, selectionEndSeconds: 3 }))
  ).toBe(false)
  expect(
    isPlayableScene(makeScene({ videoUrl: 'https://example.com/a.mp4', selectionStartSeconds: 0, selectionEndSeconds: 1 }))
  ).toBe(true)
})

test('getPlayableScenes keeps original index order and duration', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 1 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 2, selectionEndSeconds: 5 }),
  ]

  const playable = getPlayableScenes(scenes)
  expect(playable.length).toBe(2)
  expect(playable[0]?.originalIndex).toBe(0)
  expect(playable[0]?.duration).toBe(1)
  expect(playable[1]?.originalIndex).toBe(2)
  expect(playable[1]?.duration).toBe(3)
})

test('getPreviousPlayableDuration sums durations up to current segment', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', selectionStartSeconds: 1, selectionEndSeconds: 3 }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  const playable = getPlayableScenes(scenes)
  expect(getPreviousPlayableDuration(playable, 0)).toBe(0)
  expect(getPreviousPlayableDuration(playable, 1)).toBe(2)
  expect(getPreviousPlayableDuration(playable, 2)).toBe(4)
})

test('getDurationBeforeSceneIndex returns previous playable sum for any scene index', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  expect(getDurationBeforeSceneIndex(scenes, 0)).toBe(0)
  expect(getDurationBeforeSceneIndex(scenes, 1)).toBe(2)
  expect(getDurationBeforeSceneIndex(scenes, 2)).toBe(2)
  expect(getDurationBeforeSceneIndex(scenes, 3)).toBe(6)
})

test('getPlayableSceneStartTime returns start only when target is playable', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  expect(getPlayableSceneStartTime(scenes, 0)).toBe(0)
  expect(getPlayableSceneStartTime(scenes, 1)).toBeNull()
  expect(getPlayableSceneStartTime(scenes, 2)).toBe(2)
})

test('resolveProSceneAtTime resolves current playable scene by timeline time', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  const first = resolveProSceneAtTime(scenes, 1.2)
  expect(first?.sceneIndex).toBe(0)
  expect(first?.sceneTimeInSegment).toBe(1.2)

  const second = resolveProSceneAtTime(scenes, 3.5)
  expect(second?.sceneIndex).toBe(2)
  expect(second?.sceneTimeInSegment).toBe(1.5)

  const forced = resolveProSceneAtTime(scenes, 0, { forceSceneIndex: 2 })
  expect(forced?.sceneIndex).toBe(2)
  expect(forced?.sceneStartTime).toBe(2)
  expect(forced?.sceneTimeInSegment).toBe(0)
})

test('clampPlaybackTime keeps value within 0..totalDuration', () => {
  expect(clampPlaybackTime(-1, 10)).toBe(0)
  expect(clampPlaybackTime(4, 10)).toBe(4)
  expect(clampPlaybackTime(12, 10)).toBe(10)
  expect(clampPlaybackTime(2, 0)).toBe(0)
  expect(clampPlaybackTime(Number.NaN, 10)).toBe(0)
})

test('clampVideoTimeToSelection keeps playback inside selected video window', () => {
  const scene = makeScene({
    selectionStartSeconds: 5,
    selectionEndSeconds: 7,
    ttsDuration: 4,
  })

  expect(clampVideoTimeToSelection(scene, 4)).toBe(5)
  expect(clampVideoTimeToSelection(scene, 5.8)).toBe(5.8)
  expect(clampVideoTimeToSelection(scene, 9)).toBeCloseTo(6.999, 9)
})

test('getVideoTimeInSelectionWithLoop loops video when TTS is longer than selection', () => {
  const scene = makeScene({
    selectionStartSeconds: 0,
    selectionEndSeconds: 5,
    ttsDuration: 12,
  })

  expect(getVideoTimeInSelectionWithLoop(scene, 0)).toBe(0)
  expect(getVideoTimeInSelectionWithLoop(scene, 2)).toBe(2)
  expect(getVideoTimeInSelectionWithLoop(scene, 4.5)).toBe(4.5)
  expect(getVideoTimeInSelectionWithLoop(scene, 5)).toBe(0)
  expect(getVideoTimeInSelectionWithLoop(scene, 7)).toBe(2)
  expect(getVideoTimeInSelectionWithLoop(scene, 10)).toBe(0)
  expect(getVideoTimeInSelectionWithLoop(scene, 11)).toBeCloseTo(1, 2)
})

test('getVideoTimeInSelectionWithLoop with non-zero selection start', () => {
  const scene = makeScene({
    selectionStartSeconds: 2,
    selectionEndSeconds: 6,
  })

  expect(getVideoTimeInSelectionWithLoop(scene, 0)).toBe(2)
  expect(getVideoTimeInSelectionWithLoop(scene, 3)).toBe(5)
  expect(getVideoTimeInSelectionWithLoop(scene, 4)).toBe(2)
  expect(getVideoTimeInSelectionWithLoop(scene, 8)).toBe(2)
})

test('getVideoTimeInSelectionWithLoop extended source: original 7s, selection 0-12', () => {
  const scene = makeScene({
    selectionStartSeconds: 0,
    selectionEndSeconds: 12,
    ttsDuration: 12,
    originalVideoDurationSeconds: 7,
  })
  expect(getVideoTimeInSelectionWithLoop(scene, 0, 7)).toBe(0)
  expect(getVideoTimeInSelectionWithLoop(scene, 6, 7)).toBe(6)
  expect(getVideoTimeInSelectionWithLoop(scene, 7, 7)).toBe(0)
  expect(getVideoTimeInSelectionWithLoop(scene, 12, 7)).toBe(5)
})

test('getEffectiveSourceDuration extends when original < TTS', () => {
  expect(getEffectiveSourceDuration(12, 7)).toBe(14)
  expect(getEffectiveSourceDuration(7, 7)).toBe(7)
  expect(getEffectiveSourceDuration(5, 10)).toBe(10)
})

test('normalizeSelectionRange keeps stored selection when valid', () => {
  const normalized = normalizeSelectionRange({
    ttsDuration: 7,
    originalVideoDurationSeconds: 5,
    selectionStartSeconds: 3,
    selectionEndSeconds: 10,
  })

  expect(normalized.startSeconds).toBe(3)
  expect(normalized.endSeconds).toBe(10)
  expect(normalized.spanSeconds).toBe(7)
  expect(normalized.effectiveSourceDurationSeconds).toBe(10)
})

test('normalizeSelectionRange preserves stored extended range when original duration is missing', () => {
  const normalized = normalizeSelectionRange({
    ttsDuration: 7,
    selectionStartSeconds: 3,
    selectionEndSeconds: 10,
  })

  expect(normalized.startSeconds).toBe(3)
  expect(normalized.endSeconds).toBe(10)
  expect(normalized.spanSeconds).toBe(7)
  expect(normalized.effectiveSourceDurationSeconds).toBe(10)
})

test('normalizeSelectionRange clamps out-of-range selection into effective source', () => {
  const normalized = normalizeSelectionRange({
    ttsDuration: 7,
    originalVideoDurationSeconds: 5,
    selectionStartSeconds: 4,
    selectionEndSeconds: 11,
  })

  expect(normalized.startSeconds).toBe(3)
  expect(normalized.endSeconds).toBe(10)
  expect(normalized.spanSeconds).toBe(7)
})

test('normalizeSelectionRange falls back to TTS span when end is missing', () => {
  const normalized = normalizeSelectionRange({
    ttsDuration: 6,
    originalVideoDurationSeconds: 0,
    selectionStartSeconds: 1.5,
  })

  expect(normalized.startSeconds).toBe(0)
  expect(normalized.endSeconds).toBe(6)
  expect(normalized.spanSeconds).toBe(6)
  expect(normalized.effectiveSourceDurationSeconds).toBe(6)
})

test('hasRecentGesture validates timestamp in TTL window', () => {
  const now = 1_700_000_000_000
  expect(hasRecentGesture(null, now, 3000)).toBe(false)
  expect(hasRecentGesture(now - 1000, now, 3000)).toBe(true)
  expect(hasRecentGesture(now - 3500, now, 3000)).toBe(false)
  expect(hasRecentGesture(now + 1, now, 3000)).toBe(false)
})
