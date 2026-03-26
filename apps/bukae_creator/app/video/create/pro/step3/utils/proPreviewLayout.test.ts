import { test, expect } from 'vitest'
import { calculateAspectFittedSize } from './proPreviewLayout'

test('fits by height when container is wider than target aspect', () => {
  const fitted = calculateAspectFittedSize(1200, 1000, 9 / 16)
  expect(fitted).toBeTruthy()
  expect(fitted?.height).toBe(1000)
  expect(fitted?.width).toBe(562.5)
})

test('fits by width when container is narrower than target aspect', () => {
  const fitted = calculateAspectFittedSize(500, 1200, 9 / 16)
  expect(fitted).toBeTruthy()
  expect(fitted?.width).toBe(500)
  expect(fitted?.height).toBe(500 / (9 / 16))
})

test('returns null for invalid input', () => {
  expect(calculateAspectFittedSize(0, 100, 9 / 16)).toBeNull()
  expect(calculateAspectFittedSize(100, 0, 9 / 16)).toBeNull()
  expect(calculateAspectFittedSize(100, 100, 0)).toBeNull()
})
