'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjectStore } from '@/store/useProjectStore'
import { useAnalysisResource, type AnalysisResourceErrorType } from './useAnalysisResource'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { mapVideoAnalysisToViewModel } from '@/features/videoAnalysis/hooks/viewmodel/useVideoAnalysisViewModel'
import type { VideoAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'

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
  viewModel: VideoAnalysisViewModel
  referenceUrl: string
  videoSrc: string
  isReady: boolean
  isLoading: boolean
  isFailed: boolean
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
}

export function useAnalysisPage(initialProjectId: string | null): AnalysisPageState {
  const router = useRouter()
  const storedProjectId = useProjectStore((s) => s.projectId)
  const clearProject = useProjectStore((s) => s.clearProject)
  const projectId = initialProjectId ?? storedProjectId
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('thumbnail')
  const { status, errorType, errorMessage, result } = useAnalysisResource(projectId)

  useEffect(() => {
    if (initialProjectId && storedProjectId && storedProjectId !== initialProjectId) {
      clearProject()
    }
  }, [initialProjectId, storedProjectId, clearProject])

  // videoAnalysis가 없는 동안은 mock 데이터로 대체 (isReady가 false이므로 렌더되지 않음)
  const viewModel = mapVideoAnalysisToViewModel(result?.videoAnalysis ?? MOCK_VIDEO_ANALYSIS)

  useEffect(() => {
    if (!projectId) router.replace('/')
  }, [projectId, router])

  return {
    hasProject: Boolean(projectId),
    activeTab,
    setActiveTab,
    tabs: TABS,
    viewModel,
    referenceUrl: result?.referenceUrl ?? '',
    videoSrc: result?.videoSrc ?? '',  // 빈 문자열 허용 — AnalysisVideoPanel에서 undefined 변환
    isReady: status === 'ready',
    isLoading: status === 'loading',
    isFailed: status === 'error',
    errorType,
    errorMessage,
  }
}
