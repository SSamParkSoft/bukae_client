'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/useProjectStore'
import { useAnalysisPolling } from './useAnalysisPolling'
import { usePageError } from '@/lib/hooks/usePageError'
import { MOCK_REFERENCE_VIDEO_URL, MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
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
  isFailed: boolean
  errorMessage: string | null
}

export function useAnalysisPage(): AnalysisPageState {
  const router = useRouter()
  const projectId = useProjectStore((s) => s.projectId)
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('thumbnail')
  const { message: errorMessage, setError } = usePageError()
  const { isCompleted, isFailed, errorMessage: pollingError } = useAnalysisPolling()
  const viewModel = useVideoAnalysisViewModel(MOCK_VIDEO_ANALYSIS)

  useEffect(() => {
    if (!projectId) router.replace('/')
  }, [projectId, router])

  useEffect(() => {
    if (pollingError) setError(pollingError)
  }, [pollingError, setError])

  return {
    hasProject: Boolean(projectId),
    activeTab,
    setActiveTab,
    tabs: TABS,
    viewModel,
    referenceUrl: 'youtube.com/shorts/contentruckai',
    videoSrc: MOCK_REFERENCE_VIDEO_URL,
    isReady: isCompleted,
    isFailed,
    errorMessage,
  }
}
