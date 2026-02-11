import test from 'node:test'
import assert from 'node:assert/strict'
import { reorderByIndexOrder } from './reorderScenes'

test('reorderByIndexOrder reorders by source index order', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [2, 0, 1])
  assert.deepEqual(reordered, ['c', 'a', 'b'])
})

test('reorderByIndexOrder returns original array on invalid length', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [1, 0])
  assert.equal(reordered, scenes)
})

test('reorderByIndexOrder returns original array on duplicate indices', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [0, 0, 1])
  assert.equal(reordered, scenes)
})

test('reorderByIndexOrder returns original array on out-of-range indices', () => {
  const scenes = ['a', 'b', 'c']
  const reordered = reorderByIndexOrder(scenes, [0, 1, 9])
  assert.equal(reordered, scenes)
})
