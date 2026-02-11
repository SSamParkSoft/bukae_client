import test from 'node:test'
import assert from 'node:assert/strict'
import { applySelectionRange } from './useSceneSelectionUpdater'

interface TestScene {
  id: string
  script: string
  extra: string
  selectionStartSeconds?: number
  selectionEndSeconds?: number
}

test('applySelectionRange updates only target scene and keeps other fields', () => {
  const scenes: TestScene[] = [
    { id: 's1', script: 'a', extra: 'x', selectionStartSeconds: 0, selectionEndSeconds: 1 },
    { id: 's2', script: 'b', extra: 'y', selectionStartSeconds: 1, selectionEndSeconds: 2 },
  ]

  const updated = applySelectionRange(scenes, 1, 3, 6)
  assert.notEqual(updated, scenes)
  assert.equal(updated[0], scenes[0])
  assert.equal(updated[1]?.id, 's2')
  assert.equal(updated[1]?.script, 'b')
  assert.equal(updated[1]?.extra, 'y')
  assert.equal(updated[1]?.selectionStartSeconds, 3)
  assert.equal(updated[1]?.selectionEndSeconds, 6)
})

test('applySelectionRange returns original array when index is out of range', () => {
  const scenes: TestScene[] = [
    { id: 's1', script: 'a', extra: 'x', selectionStartSeconds: 0, selectionEndSeconds: 1 },
  ]
  const updated = applySelectionRange(scenes, 10, 2, 4)
  assert.equal(updated, scenes)
})
