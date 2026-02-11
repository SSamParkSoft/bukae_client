import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampPlaybackTime,
  getDurationBeforeSceneIndex,
  getPlayableSceneStartTime,
  getPlayableScenes,
  getPreviousPlayableDuration,
  getSceneSegmentDuration,
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
  assert.equal(getSceneSegmentDuration(makeScene({ selectionStartSeconds: 1, selectionEndSeconds: 4 })), 3)
  assert.equal(getSceneSegmentDuration(makeScene({ selectionStartSeconds: 4, selectionEndSeconds: 1 })), 0)
})

test('isPlayableScene requires videoUrl and positive duration', () => {
  assert.equal(isPlayableScene(makeScene({ videoUrl: null })), false)
  assert.equal(
    isPlayableScene(makeScene({ selectionStartSeconds: 3, selectionEndSeconds: 3 })),
    false
  )
  assert.equal(
    isPlayableScene(makeScene({ videoUrl: 'https://example.com/a.mp4', selectionStartSeconds: 0, selectionEndSeconds: 1 })),
    true
  )
})

test('getPlayableScenes keeps original index order and duration', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 1 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 2, selectionEndSeconds: 5 }),
  ]

  const playable = getPlayableScenes(scenes)
  assert.equal(playable.length, 2)
  assert.equal(playable[0]?.originalIndex, 0)
  assert.equal(playable[0]?.duration, 1)
  assert.equal(playable[1]?.originalIndex, 2)
  assert.equal(playable[1]?.duration, 3)
})

test('getPreviousPlayableDuration sums durations up to current segment', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', selectionStartSeconds: 1, selectionEndSeconds: 3 }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  const playable = getPlayableScenes(scenes)
  assert.equal(getPreviousPlayableDuration(playable, 0), 0)
  assert.equal(getPreviousPlayableDuration(playable, 1), 2)
  assert.equal(getPreviousPlayableDuration(playable, 2), 4)
})

test('getDurationBeforeSceneIndex returns previous playable sum for any scene index', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  assert.equal(getDurationBeforeSceneIndex(scenes, 0), 0)
  assert.equal(getDurationBeforeSceneIndex(scenes, 1), 2)
  assert.equal(getDurationBeforeSceneIndex(scenes, 2), 2)
  assert.equal(getDurationBeforeSceneIndex(scenes, 3), 6)
})

test('getPlayableSceneStartTime returns start only when target is playable', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  assert.equal(getPlayableSceneStartTime(scenes, 0), 0)
  assert.equal(getPlayableSceneStartTime(scenes, 1), null)
  assert.equal(getPlayableSceneStartTime(scenes, 2), 2)
})

test('resolveProSceneAtTime resolves current playable scene by timeline time', () => {
  const scenes: ProStep3Scene[] = [
    makeScene({ id: 's1', selectionStartSeconds: 0, selectionEndSeconds: 2 }),
    makeScene({ id: 's2', videoUrl: null }),
    makeScene({ id: 's3', selectionStartSeconds: 4, selectionEndSeconds: 8 }),
  ]

  const first = resolveProSceneAtTime(scenes, 1.2)
  assert.equal(first?.sceneIndex, 0)
  assert.equal(first?.sceneTimeInSegment, 1.2)

  const second = resolveProSceneAtTime(scenes, 3.5)
  assert.equal(second?.sceneIndex, 2)
  assert.equal(second?.sceneTimeInSegment, 1.5)

  const forced = resolveProSceneAtTime(scenes, 0, { forceSceneIndex: 2 })
  assert.equal(forced?.sceneIndex, 2)
  assert.equal(forced?.sceneStartTime, 2)
  assert.equal(forced?.sceneTimeInSegment, 0)
})

test('clampPlaybackTime keeps value within 0..totalDuration', () => {
  assert.equal(clampPlaybackTime(-1, 10), 0)
  assert.equal(clampPlaybackTime(4, 10), 4)
  assert.equal(clampPlaybackTime(12, 10), 10)
  assert.equal(clampPlaybackTime(2, 0), 0)
  assert.equal(clampPlaybackTime(Number.NaN, 10), 0)
})

test('hasRecentGesture validates timestamp in TTL window', () => {
  const now = 1_700_000_000_000
  assert.equal(hasRecentGesture(null, now, 3000), false)
  assert.equal(hasRecentGesture(now - 1000, now, 3000), true)
  assert.equal(hasRecentGesture(now - 3500, now, 3000), false)
  assert.equal(hasRecentGesture(now + 1, now, 3000), false)
})
