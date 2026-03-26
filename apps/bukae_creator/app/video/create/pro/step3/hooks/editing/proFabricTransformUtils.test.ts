import { test, expect } from 'vitest'
import {
  buildDefaultTextSettings,
  toTimelineTextSettings,
  toTimelineTransform,
} from './proFabricTransformUtils'

test('toTimelineTransform converts scaled fabric coordinates into timeline coordinates', () => {
  const result = toTimelineTransform(
    {
      left: 200,
      top: 300,
      angle: 90,
      getScaledWidth: () => 400,
      getScaledHeight: () => 500,
    },
    2
  )

  expect(result.x).toBe(100)
  expect(result.y).toBe(150)
  expect(result.width).toBe(200)
  expect(result.height).toBe(250)
  expect(result.scaleX).toBe(1)
  expect(result.scaleY).toBe(1)
  expect(result.rotation).toBeCloseTo(Math.PI / 2, 9)
})

test('buildDefaultTextSettings returns required text defaults', () => {
  const settings = buildDefaultTextSettings('hello')

  expect(settings.content).toBe('hello')
  expect(settings.font).toBe('pretendard')
  expect(settings.color).toBe('#ffffff')
  expect(settings.fontSize).toBe(80)
  expect(settings.style?.align).toBe('center')
})

test('toTimelineTextSettings updates content, style and transform safely', () => {
  const previous = buildDefaultTextSettings('old content')
  previous.fontSize = 60

  const next = toTimelineTextSettings(
    {
      left: 180,
      top: 240,
      angle: 45,
      getScaledWidth: () => 300,
      getScaledHeight: () => 120,
      fontSize: 64,
      scaleY: 1.5,
      text: 'new content',
      fill: '#00ff00',
      textAlign: 'right',
    },
    2,
    previous,
    true
  )

  expect(next.content).toBe('new content')
  expect(next.color).toBe('#00ff00')
  expect(next.style?.align).toBe('right')
  expect(next.transform).toBeTruthy()
  expect(next.transform?.x).toBe(90)
  expect(next.transform?.y).toBe(120)
  expect(next.transform?.width).toBe(150)
  expect(next.transform?.height).toBe(60)
  expect(next.transform?.rotation ?? 0).toBeCloseTo(Math.PI / 4, 9)
  expect(next.fontSize).toBe(48)
})

test('toTimelineTextSettings keeps old content when updateContent=false', () => {
  const previous = buildDefaultTextSettings('keep me')

  const next = toTimelineTextSettings(
    {
      left: 100,
      top: 120,
      getScaledWidth: () => 200,
      getScaledHeight: () => 80,
      fontSize: 50,
      scaleY: 1,
      text: 'replace me',
      fill: 123,
      textAlign: 'invalid',
    },
    2,
    previous,
    false
  )

  expect(next.content).toBe('keep me')
  expect(next.color).toBe('#ffffff')
  expect(next.style?.align).toBe('center')
})
