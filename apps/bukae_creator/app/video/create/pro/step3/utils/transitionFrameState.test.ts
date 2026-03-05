import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_TRANSITION_START_BUFFER_SEC,
  getTransitionFrameState,
} from './transitionFrameState'

test('returns no transition when effect is disabled', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: false,
    transitionDurationSec: 0.5,
    relativeTimeSec: 0.1,
  })

  assert.equal(result.shouldTransition, false)
  assert.equal(result.progress, 1)
})

test('returns no transition when duration is invalid', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0,
    relativeTimeSec: 0.1,
  })

  assert.equal(result.shouldTransition, false)
  assert.equal(result.progress, 1)
})

test('keeps transition active in start buffer range', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: -0.01,
  })

  assert.equal(result.shouldTransition, true)
  assert.equal(result.progress, 0)
})

test('disables transition before start buffer range', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: -(DEFAULT_TRANSITION_START_BUFFER_SEC + 0.01),
  })

  assert.equal(result.shouldTransition, false)
  assert.equal(result.progress, 0)
})

test('calculates progress in transition window', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: 0.2,
  })

  assert.equal(result.shouldTransition, true)
  assert.equal(result.progress, 0.4)
})

test('marks transition complete at end boundary', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: 0.5,
  })

  assert.equal(result.shouldTransition, false)
  assert.equal(result.progress, 1)
})

test('handles NaN input safely', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: Number.NaN,
  })

  assert.equal(result.shouldTransition, true)
  assert.equal(result.progress, 0)
  assert.equal(result.relativeTimeSec, 0)
})
