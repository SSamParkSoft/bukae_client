'use client'

import { useCallback } from 'react'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'
import type { ExtendedSceneScript } from '../../step2/utils/types'

/**
 * Pro step3 격자 선택 영역 변경 핸들러 훅
 * 
 * 씬의 selectionStartSeconds와 selectionEndSeconds를 업데이트하는 로직을 제공합니다.
 * 
 * @returns handleSelectionChange - (sceneIndex, startSeconds, endSeconds) => void
 */
export function useProStep3SelectionChange() {
  const storeScenes = useVideoCreateStore((state) => state.scenes)
  const setScenes = useVideoCreateStore((state) => state.setScenes)

  const handleSelectionChange = useCallback(
    (sceneIndex: number, startSeconds: number, endSeconds: number) => {
      // storeScenes가 배열인지 확인하고, 배열이 아니면 업데이트하지 않음
      const safeScenes = ensureSceneArray<SceneScript>(storeScenes)
      if (!isValidSceneArray(safeScenes)) {
        console.warn('[useProStep3SelectionChange] storeScenes가 배열이 아니거나 빈 배열입니다.', {
          storeScenes,
          sceneIndex,
        })
        return
      }

      // 배열 복사 후 업데이트
      const next = [...safeScenes]
      if (next[sceneIndex]) {
        const currentScene = next[sceneIndex]
        
        // 기존 씬의 모든 필드를 유지하면서 selection만 업데이트
        next[sceneIndex] = {
          ...currentScene,
          selectionStartSeconds: startSeconds,
          selectionEndSeconds: endSeconds,
        } as SceneScript
        
        setScenes(next)
      }
    },
    [storeScenes, setScenes]
  )

  return {
    handleSelectionChange,
  }
}
