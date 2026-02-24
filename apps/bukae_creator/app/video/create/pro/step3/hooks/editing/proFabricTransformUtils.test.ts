import test from 'node:test'
import assert from 'node:assert/strict'
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

  assert.equal(result.x, 100)
  assert.equal(result.y, 150)
  assert.equal(result.width, 200)
  assert.equal(result.height, 250)
  assert.equal(result.scaleX, 1)
  assert.equal(result.scaleY, 1)
  assert.ok(Math.abs(result.rotation - Math.PI / 2) < 1e-9)
})

test('buildDefaultTextSettings returns required text defaults', () => {
  const settings = buildDefaultTextSettings('hello')

  assert.equal(settings.content, 'hello')
  assert.equal(settings.font, 'pretendard')
  assert.equal(settings.color, '#ffffff')
  assert.equal(settings.fontSize, 80)
  assert.equal(settings.style?.align, 'center')
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

  assert.equal(next.content, 'new content')
  assert.equal(next.color, '#00ff00')
  assert.equal(next.style?.align, 'right')
  assert.ok(next.transform)
  assert.equal(next.transform?.x, 90)
  assert.equal(next.transform?.y, 120)
  assert.equal(next.transform?.width, 150)
  assert.equal(next.transform?.height, 60)
  assert.ok(Math.abs((next.transform?.rotation ?? 0) - Math.PI / 4) < 1e-9)
  assert.equal(next.fontSize, 48)
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

  assert.equal(next.content, 'keep me')
  assert.equal(next.color, '#ffffff')
  assert.equal(next.style?.align, 'center')
})
