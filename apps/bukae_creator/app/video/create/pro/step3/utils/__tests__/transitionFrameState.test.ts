import { test, expect } from 'vitest'
import {
  DEFAULT_TRANSITION_START_BUFFER_SEC,
  getTransitionFrameState,
} from '../transitionFrameState'

test('returns no transition when effect is disabled', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: false,
    transitionDurationSec: 0.5,
    relativeTimeSec: 0.1,
  })

  expect(result.shouldTransition).toBe(false)
  expect(result.progress).toBe(1)
})

test('returns no transition when duration is invalid', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0,
    relativeTimeSec: 0.1,
  })

  expect(result.shouldTransition).toBe(false)
  expect(result.progress).toBe(1)
})

test('keeps transition active in start buffer range', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: -0.01,
  })

  expect(result.shouldTransition).toBe(true)
  expect(result.progress).toBe(0)
})

test('disables transition before start buffer range', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: -(DEFAULT_TRANSITION_START_BUFFER_SEC + 0.01),
  })

  expect(result.shouldTransition).toBe(false)
  expect(result.progress).toBe(0)
})

test('calculates progress in transition window', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: 0.2,
  })

  expect(result.shouldTransition).toBe(true)
  expect(result.progress).toBe(0.4)
})

test('marks transition complete at end boundary', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: 0.5,
  })

  expect(result.shouldTransition).toBe(false)
  expect(result.progress).toBe(1)
})

test('handles NaN input safely', () => {
  const result = getTransitionFrameState({
    hasTransitionEffect: true,
    transitionDurationSec: 0.5,
    relativeTimeSec: Number.NaN,
  })

  expect(result.shouldTransition).toBe(true)
  expect(result.progress).toBe(0)
  expect(result.relativeTimeSec).toBe(0)
})
