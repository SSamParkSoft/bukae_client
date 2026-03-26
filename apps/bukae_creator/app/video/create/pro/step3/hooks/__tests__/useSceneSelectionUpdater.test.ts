import { test, expect } from 'vitest'
import { applySelectionRange } from '../useSceneSelectionUpdater'

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
  expect(updated).not.toBe(scenes)
  expect(updated[0]).toBe(scenes[0])
  expect(updated[1]?.id).toBe('s2')
  expect(updated[1]?.script).toBe('b')
  expect(updated[1]?.extra).toBe('y')
  expect(updated[1]?.selectionStartSeconds).toBe(3)
  expect(updated[1]?.selectionEndSeconds).toBe(6)
})

test('applySelectionRange returns original array when index is out of range', () => {
  const scenes: TestScene[] = [
    { id: 's1', script: 'a', extra: 'x', selectionStartSeconds: 0, selectionEndSeconds: 1 },
  ]
  const updated = applySelectionRange(scenes, 10, 2, 4)
  expect(updated).toBe(scenes)
})
