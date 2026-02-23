'use client'

import { useCallback } from 'react'
import type { SceneScript } from '@/store/useVideoCreateStore'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'

export function applySelectionRange<T>(
  scenes: T[],
  sceneIndex: number,
  startSeconds: number,
  endSeconds: number
): T[] {
  if (sceneIndex < 0 || sceneIndex >= scenes.length) {
    return scenes
  }

  return scenes.map((scene, index) =>
    index === sceneIndex
      ? ({
          ...scene,
          selectionStartSeconds: startSeconds,
          selectionEndSeconds: endSeconds,
        } as T)
      : scene
  )
}

export function applyOriginalVideoDuration<T extends Record<string, unknown>>(
  scenes: T[],
  sceneIndex: number,
  originalVideoDurationSeconds: number
): T[] {
  if (sceneIndex < 0 || sceneIndex >= scenes.length) {
    return scenes
  }
  return scenes.map((scene, index) =>
    index === sceneIndex ? { ...scene, originalVideoDurationSeconds } as T : scene
  )
}

export function useSceneSelectionUpdater() {
  const setScenes = useVideoCreateStore((state) => state.setScenes)

  const updateSelectionRange = useCallback(
    (sceneIndex: number, startSeconds: number, endSeconds: number) => {
      const storeScenes = useVideoCreateStore.getState().scenes
      const safeScenes = ensureSceneArray<SceneScript>(storeScenes)
      if (!isValidSceneArray(safeScenes)) {
        return
      }

      const next = applySelectionRange(safeScenes, sceneIndex, startSeconds, endSeconds)
      setScenes(next)
    },
    [setScenes]
  )

  const updateOriginalVideoDuration = useCallback(
    (sceneIndex: number, originalVideoDurationSeconds: number) => {
      const storeScenes = useVideoCreateStore.getState().scenes
      const safeScenes = ensureSceneArray<SceneScript>(storeScenes)
      if (!isValidSceneArray(safeScenes)) {
        return
      }
      const next = applyOriginalVideoDuration(safeScenes, sceneIndex, originalVideoDurationSeconds)
      setScenes(next)
    },
    [setScenes]
  )

  return {
    updateSelectionRange,
    updateOriginalVideoDuration,
  }
}
