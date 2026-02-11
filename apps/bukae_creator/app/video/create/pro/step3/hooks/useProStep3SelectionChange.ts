'use client'

import { useCallback } from 'react'
import { useSceneSelectionUpdater } from '@/app/video/create/step3/shared/hooks'

/**
 * Pro step3 격자 선택 영역 변경 핸들러 훅
 * 
 * 씬의 selectionStartSeconds와 selectionEndSeconds를 업데이트하는 로직을 제공합니다.
 * 
 * @returns handleSelectionChange - (sceneIndex, startSeconds, endSeconds) => void
 */
export function useProStep3SelectionChange() {
  const { updateSelectionRange } = useSceneSelectionUpdater()

  const handleSelectionChange = useCallback(
    (sceneIndex: number, startSeconds: number, endSeconds: number) => {
      updateSelectionRange(sceneIndex, startSeconds, endSeconds)
    },
    [updateSelectionRange]
  )

  return {
    handleSelectionChange,
  }
}
