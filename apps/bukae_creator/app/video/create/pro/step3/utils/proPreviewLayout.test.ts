import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAspectFittedSize } from './proPreviewLayout'

test('fits by height when container is wider than target aspect', () => {
  const fitted = calculateAspectFittedSize(1200, 1000, 9 / 16)
  assert.ok(fitted)
  assert.equal(fitted?.height, 1000)
  assert.equal(fitted?.width, 562.5)
})

test('fits by width when container is narrower than target aspect', () => {
  const fitted = calculateAspectFittedSize(500, 1200, 9 / 16)
  assert.ok(fitted)
  assert.equal(fitted?.width, 500)
  assert.equal(fitted?.height, 500 / (9 / 16))
})

test('returns null for invalid input', () => {
  assert.equal(calculateAspectFittedSize(0, 100, 9 / 16), null)
  assert.equal(calculateAspectFittedSize(100, 0, 9 / 16), null)
  assert.equal(calculateAspectFittedSize(100, 100, 0), null)
})
