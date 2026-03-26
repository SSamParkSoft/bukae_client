import { test, expect } from 'vitest'
import { reorderByIndexOrder } from '../reorderScenes'

test('reorderByIndexOrder reorders by source index order', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [2, 0, 1])
  expect(reordered).toEqual(['c', 'a', 'b'])
})

test('reorderByIndexOrder returns original array on invalid length', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [1, 0])
  expect(reordered).toBe(scenes)
})

test('reorderByIndexOrder returns original array on duplicate indices', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [0, 0, 1])
  expect(reordered).toBe(scenes)
})

test('reorderByIndexOrder returns original array on out-of-range indices', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [0, 1, 9])
  expect(reordered).toBe(scenes)
})
