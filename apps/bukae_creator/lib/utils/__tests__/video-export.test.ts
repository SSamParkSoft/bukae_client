import { test, expect } from 'vitest'
import { resolveSceneEffect } from '../video-export'

test('resolveSceneEffect prioritizes transition over motion', () => {
  const resolved = resolveSceneEffect({
    transition: 'fade',
    transitionDuration: 0.7,
    motion: {
      type: 'zoom-in',
      startSecInScene: 0,
      durationSec: 2,
      easing: 'ease-out',
      params: { scaleFrom: 1, scaleTo: 1.2 },
    },
  })

  expect(resolved).toEqual({
    effectType: 'fade',
    effectDuration: 0.7,
  })
})

test('resolveSceneEffect falls back to motion when transition is none', () => {
  const resolved = resolveSceneEffect({
    transition: 'none',
    transitionDuration: 0,
    motion: {
      type: 'slide-left',
      startSecInScene: 0,
      durationSec: 1.8,
      easing: 'ease-out',
      params: { distance: 200 },
    },
  })

  expect(resolved).toEqual({
    effectType: 'slide-left',
    effectDuration: 1.8,
  })
})

test('resolveSceneEffect returns none when both transition and motion are absent', () => {
  const resolved = resolveSceneEffect({
    transition: 'none',
  })

  expect(resolved).toEqual({
    effectType: 'none',
    effectDuration: 0,
  })
})

test('resolveSceneEffect uses safe default durations for invalid values', () => {
  const transitionResolved = resolveSceneEffect({
    transition: 'blur',
    transitionDuration: 0,
  })
  expect(transitionResolved).toEqual({
    effectType: 'blur',
    effectDuration: 0.5,
  })

  const motionResolved = resolveSceneEffect({
    transition: 'none',
    motion: {
      type: 'zoom-out',
      startSecInScene: 0,
      durationSec: 0,
      easing: 'ease-out',
      params: { scaleFrom: 1.2, scaleTo: 1 },
    },
  })
  expect(motionResolved).toEqual({
    effectType: 'zoom-out',
    effectDuration: 0.5,
  })
})

test('resolveSceneEffect treats empty transition as none and falls back to motion', () => {
  const resolved = resolveSceneEffect({
    transition: '   ',
    motion: {
      type: 'slide-right',
      startSecInScene: 0,
      durationSec: 1.2,
      easing: 'ease-out',
      params: { distance: 120 },
    },
  })

  expect(resolved).toEqual({
    effectType: 'slide-right',
    effectDuration: 1.2,
  })
})
