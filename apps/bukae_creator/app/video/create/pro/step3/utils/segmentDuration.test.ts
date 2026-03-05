import test from 'node:test'
import assert from 'node:assert/strict'
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
  assert.equal(
    getSegmentDuration({
      ttsDuration: 4,
      selectionStartSeconds: 0,
      selectionEndSeconds: 1,
      mediaUrl: 'https://example.com/video.mp4',
    }),
    4
  )

  assert.equal(
    getSegmentDuration({
      selectionStartSeconds: 5,
      selectionEndSeconds: 2,
      mediaUrl: 'https://example.com/video.mp4',
    }),
    0
  )
})

test('isPlayableSegment requires playable media and positive duration', () => {
  assert.equal(
    isPlayableSegment({
      mediaUrl: null,
      selectionStartSeconds: 0,
      selectionEndSeconds: 2,
    }),
    false
  )

  assert.equal(
    isPlayableSegment({
      videoUrl: 'https://example.com/video.mp4',
      selectionStartSeconds: 3,
      selectionEndSeconds: 3,
    }),
    false
  )

  assert.equal(
    isPlayableSegment({
      mediaUrl: 'https://example.com/video.mp4',
      selectionStartSeconds: 1,
      selectionEndSeconds: 2,
    }),
    true
  )
})

test('getPlayableSegments keeps original index and duration order', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', ttsDuration: 5, selectionStartSeconds: 0, selectionEndSeconds: 1 },
  ]

  const playable = getPlayableSegments(scenes)
  assert.equal(playable.length, 2)
  assert.equal(playable[0]?.originalIndex, 0)
  assert.equal(playable[0]?.duration, 2)
  assert.equal(playable[1]?.originalIndex, 2)
  assert.equal(playable[1]?.duration, 5)
})

test('getPreviousPlayableDuration sums previous playable durations', () => {
  const playable = getPlayableSegments([
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: 'https://example.com/2.mp4', selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 1 },
  ])

  assert.equal(getPreviousPlayableDuration(playable, 0), 0)
  assert.equal(getPreviousPlayableDuration(playable, 1), 2)
  assert.equal(getPreviousPlayableDuration(playable, 2), 5)
})

test('clampPlaybackTime limits values to valid range', () => {
  assert.equal(clampPlaybackTime(-1, 5), 0)
  assert.equal(clampPlaybackTime(2, 5), 2)
  assert.equal(clampPlaybackTime(10, 5), 5)
  assert.equal(clampPlaybackTime(Number.NaN, 5), 0)
  assert.equal(clampPlaybackTime(2, 0), 0)
})

test('getPlayableDurationBeforeSceneIndex returns timeline start offset by scene index', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  assert.equal(getPlayableDurationBeforeSceneIndex(scenes, 0), 0)
  assert.equal(getPlayableDurationBeforeSceneIndex(scenes, 1), 2)
  assert.equal(getPlayableDurationBeforeSceneIndex(scenes, 2), 2)
  assert.equal(getPlayableDurationBeforeSceneIndex(scenes, 3), 6)
})

test('getPlayableSegmentStartTimeBySceneIndex returns start only for playable scene', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  assert.equal(getPlayableSegmentStartTimeBySceneIndex(scenes, 0), 0)
  assert.equal(getPlayableSegmentStartTimeBySceneIndex(scenes, 1), null)
  assert.equal(getPlayableSegmentStartTimeBySceneIndex(scenes, 2), 2)
})

test('resolvePlayableSegmentAtTime resolves scene and relative time with fallback to last scene', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  const first = resolvePlayableSegmentAtTime(scenes, 1.5)
  assert.equal(first?.originalIndex, 0)
  assert.equal(first?.sceneTimeInSegment, 1.5)
  assert.equal(first?.sceneStartTime, 0)

  const second = resolvePlayableSegmentAtTime(scenes, 3.2)
  assert.equal(second?.originalIndex, 2)
  assert.ok(second !== null)
  assert.ok(Math.abs(second.sceneTimeInSegment - 1.2) < 1e-9)
  assert.equal(second?.sceneStartTime, 2)

  const lastFallback = resolvePlayableSegmentAtTime(scenes, 999)
  assert.equal(lastFallback?.originalIndex, 2)
  assert.equal(lastFallback?.sceneTimeInSegment, 4)
})

test('resolvePlayableSegmentAtTime supports forceSceneIndex', () => {
  const scenes = [
    { id: 's1', mediaUrl: 'https://example.com/1.mp4', selectionStartSeconds: 0, selectionEndSeconds: 2 },
    { id: 's2', mediaUrl: null, selectionStartSeconds: 0, selectionEndSeconds: 3 },
    { id: 's3', mediaUrl: 'https://example.com/3.mp4', selectionStartSeconds: 0, selectionEndSeconds: 4 },
  ]

  const forcedPlayable = resolvePlayableSegmentAtTime(scenes, 0.5, { forceSceneIndex: 2 })
  assert.equal(forcedPlayable?.originalIndex, 2)
  assert.equal(forcedPlayable?.sceneStartTime, 2)
  assert.equal(forcedPlayable?.sceneTimeInSegment, 0)

  const forcedNonPlayable = resolvePlayableSegmentAtTime(scenes, 0.5, { forceSceneIndex: 1 })
  assert.equal(forcedNonPlayable, null)
})
