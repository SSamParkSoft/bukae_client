'use client'

import { useCallback } from 'react'
import { useSceneSelectionUpdater } from '@/app/video/create/step3/shared/hooks'

/**
 * Pro step3 격자 선택 영역 변경 핸들러 훅
 *
 * 씬의 selectionStartSeconds, selectionEndSeconds, originalVideoDurationSeconds를 업데이트하는 로직을 제공합니다.
 */
export function useProStep3SelectionChange() {
  const { updateSelectionRange, updateOriginalVideoDuration } = useSceneSelectionUpdater()

  const handleSelectionChange = useCallback(
    (sceneIndex: number, startSeconds: number, endSeconds: number) => {
      updateSelectionRange(sceneIndex, startSeconds, endSeconds)
    },
    [updateSelectionRange]
  )

  const handleOriginalVideoDurationLoaded = useCallback(
    (sceneIndex: number, originalVideoDurationSeconds: number) => {
      updateOriginalVideoDuration(sceneIndex, originalVideoDurationSeconds)
    },
    [updateOriginalVideoDuration]
  )

  return {
    handleSelectionChange,
    handleOriginalVideoDurationLoaded,
  }
}
