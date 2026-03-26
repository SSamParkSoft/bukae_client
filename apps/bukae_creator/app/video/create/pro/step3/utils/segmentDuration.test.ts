import { test, expect } from 'vitest'
import {
  clampPlaybackTime,
  getPlayableDurationBeforeSceneIndex,
  getPlayableSegmentStartTimeBySceneIndex,
  getPlayableSegments,
  getPreviousPlayableDuration,
  getSegmentDuration,
  isPlayableSegment,
  resolvePlayableSegmentAtTime,
} from './segmentDuration'

test('getSegmentDuration prefers ttsDuration and clamps invalid ranges', () => {
  expect(
    getSegmentDuration({
      ttsDuration: 4,
      selectionStartSeconds: 0,
      selectionEndSeconds: 1,
      mediaUrl: 'https://example.com/video.mp4',
    })
  ).toBe(4)

  expect(
    getSegmentDuration({
      selectionStartSeconds: 5,
      selectionEndSeconds: 2,
      mediaUrl: 'https://example.com/video.mp4',
    })
  ).toBe(0)
})

test('isPlayableSegment requires playable media and positive duration', () => {
  expect(
    isPlayableSegment({
      mediaUrl: null,
      selectionStartSeconds: 0,
      selectionEndSeconds: 2,
    })
  ).toBe(false)

  expect(
    isPlayableSegment({
      videoUrl: 'https://example.com/video.mp4',
      selectionStartSeconds: 3,
      selectionEndSeconds: 3,
    })
  ).toBe(false)

  expect(
    isPlayableSegment({
      mediaUrl: 'https://example.com/video.mp4',
      selectionStartSeconds: 1,
      selectionEndSeconds: 2,
    })
  ).toBe(true)
})

test('getPlayableSegments keeps original index and duration order', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', ttsDuration: 5, selectionStartSeconds: 0, selectionEndSeconds: 1 },
  ]

  const playable = getPlayableSegments(scenes)
  expect(playable.length).toBe(2)
  expect(playable[0]?.originalIndex).toBe(0)
  expect(playable[0]?.duration).toBe(2)
  expect(playable[1]?.originalIndex).toBe(2)
  expect(playable[1]?.duration).toBe(5)
})

test('getPreviousPlayableDuration sums previous playable durations', () => {
  const playable = getPlayableSegments([
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: 'https://example.com/2.mp4', selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 1 },
  ])

  expect(getPreviousPlayableDuration(playable, 0)).toBe(0)
  expect(getPreviousPlayableDuration(playable, 1)).toBe(2)
  expect(getPreviousPlayableDuration(playable, 2)).toBe(5)
})

test('clampPlaybackTime limits values to valid range', () => {
  expect(clampPlaybackTime(-1, 5)).toBe(0)
  expect(clampPlaybackTime(2, 5)).toBe(2)
  expect(clampPlaybackTime(10, 5)).toBe(5)
  expect(clampPlaybackTime(Number.NaN, 5)).toBe(0)
  expect(clampPlaybackTime(2, 0)).toBe(0)
})

test('getPlayableDurationBeforeSceneIndex returns timeline start offset by scene index', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  expect(getPlayableDurationBeforeSceneIndex(scenes, 0)).toBe(0)
  expect(getPlayableDurationBeforeSceneIndex(scenes, 1)).toBe(2)
  expect(getPlayableDurationBeforeSceneIndex(scenes, 2)).toBe(2)
  expect(getPlayableDurationBeforeSceneIndex(scenes, 3)).toBe(6)
})

test('getPlayableSegmentStartTimeBySceneIndex returns start only for playable scene', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  expect(getPlayableSegmentStartTimeBySceneIndex(scenes, 0)).toBe(0)
  expect(getPlayableSegmentStartTimeBySceneIndex(scenes, 1)).toBeNull()
  expect(getPlayableSegmentStartTimeBySceneIndex(scenes, 2)).toBe(2)
})

test('resolvePlayableSegmentAtTime resolves scene and relative time with fallback to last scene', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  const first = resolvePlayableSegmentAtTime(scenes, 1.5)
  expect(first?.originalIndex).toBe(0)
  expect(first?.sceneTimeInSegment).toBe(1.5)
  expect(first?.sceneStartTime).toBe(0)

  const second = resolvePlayableSegmentAtTime(scenes, 3.2)
  expect(second?.originalIndex).toBe(2)
  expect(second).not.toBeNull()
  expect(second!.sceneTimeInSegment).toBeCloseTo(1.2, 9)
  expect(second?.sceneStartTime).toBe(2)

  const lastFallback = resolvePlayableSegmentAtTime(scenes, 999)
  expect(lastFallback?.originalIndex).toBe(2)
  expect(lastFallback?.sceneTimeInSegment).toBe(4)
})

test('resolvePlayableSegmentAtTime supports forceSceneIndex', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  const forcedPlayable = resolvePlayableSegmentAtTime(scenes, 0.5, { forceSceneIndex: 2 })
  expect(forcedPlayable?.originalIndex).toBe(2)
  expect(forcedPlayable?.sceneStartTime).toBe(2)
  expect(forcedPlayable?.sceneTimeInSegment).toBe(0)

  const forcedNonPlayable = resolvePlayableSegmentAtTime(scenes, 0.5, { forceSceneIndex: 1 })
  expect(forcedNonPlayable).toBeNull()
})
