'use client'

import { useState } from 'react'
import { mapVideoAnalysisToViewModel } from '@/features/videoAnalysis/lib/mapVideoAnalysisToViewModel'
import type { VideoAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import type {
  AnalysisResourceErrorType,
  AnalysisResourceSnapshotState,
} from '@/features/analysisPage/lib/analysisResource'
import { useAnalysisResource } from './useAnalysisResource'

const TABS = [
  { id: 'thumbnail', label: 'Thumbnail 분석' },
  { id: 'hook', label: 'Hook 분석' },
  { id: 'structure', label: 'Video Structure 분석' },
] as const

export type AnalysisTabId = (typeof TABS)[number]['id']

export interface AnalysisPageState {
  activeTab: AnalysisTabId
  setActiveTab: (tab: AnalysisTabId) => void
  tabs: typeof TABS
  viewModel: VideoAnalysisViewModel | null
  referenceUrl: string
  videoSrc: string
  isReady: boolean
  isLoading: boolean
  isFailed: boolean
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
}

export function useAnalysisPage(
  projectId: string,
  initialSnapshot?: AnalysisResourceSnapshotState | null
): AnalysisPageState {
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('thumbnail')
  const { status, errorType, errorMessage, result } = useAnalysisResource(
    projectId,
    initialSnapshot
  )

  const viewModel = result?.videoAnalysis
    ? mapVideoAnalysisToViewModel(result.videoAnalysis)
    : null
  const isMissingReadyResult = status === 'ready' && !viewModel
  const resolvedErrorType = isMissingReadyResult ? 'missing_result' : errorType
  const resolvedErrorMessage = isMissingReadyResult
    ? '분석은 완료되었지만 화면에 표시할 결과 데이터가 없습니다.'
    : errorMessage

  return {
    activeTab,
    setActiveTab,
    tabs: TABS,
    viewModel,
    referenceUrl: result?.referenceUrl ?? '',
    videoSrc: result?.videoSrc ?? '',  // 빈 문자열 허용 — AnalysisVideoPanel에서 undefined 변환
    isReady: status === 'ready' && Boolean(viewModel),
    isLoading: status === 'loading',
    isFailed: status === 'error' || isMissingReadyResult,
    errorType: resolvedErrorType,
    errorMessage: resolvedErrorMessage,
  }
}
