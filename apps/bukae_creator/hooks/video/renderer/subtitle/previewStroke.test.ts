import test from 'node:test'
import assert from 'node:assert/strict'
import { getPreviewLetterSpacing, getPreviewStrokeWidth } from './previewStroke'

test('stroke 보정은 +5px 고정값이다', () => {
  assert.equal(getPreviewStrokeWidth(0), 0)
  assert.equal(getPreviewStrokeWidth(5), 10)
  assert.equal(getPreviewStrokeWidth(10), 15)
  assert.equal(getPreviewStrokeWidth(15), 20)
  assert.equal(getPreviewStrokeWidth(20), 25)
})

test('fontSize 옵션은 결과에 영향을 주지 않는다', () => {
  assert.equal(getPreviewStrokeWidth(10, { fontSize: 40 }), 15)
  assert.equal(getPreviewStrokeWidth(10, { fontSize: 120 }), 15)
})

test('letterSpacing 보정은 비활성화되어 항상 0이다', () => {
  assert.equal(getPreviewLetterSpacing(10), 0)
  assert.equal(getPreviewLetterSpacing(20), 0)
  assert.equal(getPreviewLetterSpacing(50, { fontSize: 120 }), 0)
})
