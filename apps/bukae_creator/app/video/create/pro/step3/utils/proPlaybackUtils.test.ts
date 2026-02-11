import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampPlaybackTime,
  getPlayableScenes,
  getPreviousPlayableDuration,
  getSceneSegmentDuration,
  hasRecentGesture,
  isPlayableScene,
} from './proPlaybackUtils'
import type { ProStep3Scene } from '../components/ProSceneListPanel'

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
