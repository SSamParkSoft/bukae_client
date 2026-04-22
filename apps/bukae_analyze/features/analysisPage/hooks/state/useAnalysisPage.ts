'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/useProjectStore'
import { useAnalysisPolling } from './useAnalysisPolling'
import { usePageError } from '@/lib/hooks/usePageError'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { useVideoAnalysisViewModel } from '@/features/videoAnalysis/hooks/viewmodel/useVideoAnalysisViewModel'

const TABS = [
  { id: 'thumbnail', label: 'Thumbnail 분석' },
  { id: 'hook', label: 'Hook 분석' },
  { id: 'structure', label: 'Video Structure 분석' },
] as const

export type AnalysisTabId = (typeof TABS)[number]['id']

export interface AnalysisPageState {
  hasProject: boolean
  activeTab: AnalysisTabId
  setActiveTab: (tab: AnalysisTabId) => void
  tabs: typeof TABS
  viewModel: ReturnType<typeof useVideoAnalysisViewModel>
  referenceUrl: string
  videoSrc: string
  isReady: boolean
  isLoading: boolean
  isFailed: boolean
  errorMessage: string | null
}

export function useAnalysisPage(): AnalysisPageState {
  const router = useRouter()
  const projectId = useProjectStore((s) => s.projectId)
  const videoAnalysis = useProjectStore((s) => s.videoAnalysis)
  const storedVideoSrc = useProjectStore((s) => s.videoSrc)
  const storedReferenceUrl = useProjectStore((s) => s.referenceUrl)
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('thumbnail')
  const { message: errorMessage, setError, clearError } = usePageError()
  const { isCompleted, isLoading, isFailed, errorMessage: pollingError } = useAnalysisPolling()

  // videoAnalysis가 없는 동안은 mock 데이터로 대체 (isReady가 false이므로 렌더되지 않음)
  const viewModel = useVideoAnalysisViewModel(videoAnalysis ?? MOCK_VIDEO_ANALYSIS)

  useEffect(() => {
    if (!projectId) router.replace('/')
  }, [projectId, router])

  useEffect(() => {
    if (pollingError) {
      setError(pollingError)
      return
    }

    clearError()
  }, [pollingError, setError, clearError])

  return {
    hasProject: Boolean(projectId),
    activeTab,
    setActiveTab,
    tabs: TABS,
    viewModel,
    referenceUrl: storedReferenceUrl ?? '',
    videoSrc: storedVideoSrc ?? '',  // 빈 문자열 허용 — AnalysisVideoPanel에서 undefined 변환
    isReady: isCompleted,
    isLoading,
    isFailed: !isCompleted && isFailed,
    errorMessage: isCompleted ? null : errorMessage,
  }
}
