import { test, expect } from 'vitest'
import { getPreviewLetterSpacing, getPreviewStrokeWidth } from './previewStroke'

test('stroke 보정은 +5px 고정값이다', () => {
  expect(getPreviewStrokeWidth(0)).toBe(0)
  expect(getPreviewStrokeWidth(5)).toBe(10)
  expect(getPreviewStrokeWidth(10)).toBe(15)
  expect(getPreviewStrokeWidth(15)).toBe(20)
  expect(getPreviewStrokeWidth(20)).toBe(25)
})

test('fontSize 옵션은 결과에 영향을 주지 않는다', () => {
  expect(getPreviewStrokeWidth(10, { fontSize: 40 })).toBe(15)
  expect(getPreviewStrokeWidth(10, { fontSize: 120 })).toBe(15)
})

test('letterSpacing 보정은 비활성화되어 항상 0이다', () => {
  expect(getPreviewLetterSpacing(10)).toBe(0)
  expect(getPreviewLetterSpacing(20)).toBe(0)
  expect(getPreviewLetterSpacing(50, { fontSize: 120 })).toBe(0)
})
