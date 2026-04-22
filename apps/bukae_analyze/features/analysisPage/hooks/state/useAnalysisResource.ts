'use client'

import { useEffect, useMemo, useState } from 'react'
import type { VideoAnalysisResult } from '@/lib/types/domain'
import { mapBenchmarkAnalysisResult } from '@/lib/services/mappers'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'
import { useProjectStore } from '@/store/useProjectStore'

const POLL_INTERVAL_MS = 2500
const COMPLETED_RESULT_RETRY_MS = 1000
const MAX_COMPLETED_RESULT_RETRIES = 10

export type AnalysisResourceStatus = 'idle' | 'loading' | 'ready' | 'error'
export type AnalysisResourceErrorType = 'failed' | 'missing_result' | 'unknown'

interface AnalysisResourceState {
  status: AnalysisResourceStatus
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
  result: VideoAnalysisResult | null
}

function getErrorState(params: {
  submissionStatus: string | null
  errorMessage: string | null
  hasStoredResult: boolean
}): { errorType: AnalysisResourceErrorType | null; errorMessage: string | null } {
  const { submissionStatus, errorMessage, hasStoredResult } = params
  if (hasStoredResult) return { errorType: null, errorMessage: null }
  if (submissionStatus === 'FAILED') {
    return {
      errorType: 'failed',
      errorMessage: errorMessage ?? '분석에 실패했습니다. 다시 시도해주세요.',
    }
  }
  if (!errorMessage) return { errorType: null, errorMessage: null }
  return {
    errorType:
      submissionStatus === 'COMPLETED'
        ? 'missing_result'
        : 'unknown',
    errorMessage,
  }
}

function getResourceStatus(params: {
  projectId: string | null
  hasStoredResult: boolean
  errorMessage: string | null
}): AnalysisResourceStatus {
  const { projectId, hasStoredResult, errorMessage } = params
  if (!projectId) return 'idle'
  if (hasStoredResult) return 'ready'
  if (errorMessage) return 'error'
  return 'loading'
}

export function useAnalysisResource(): AnalysisResourceState {
  const projectId = useProjectStore((s) => s.projectId)
  const submissionStatus = useProjectStore((s) => s.submissionStatus)
  const videoAnalysis = useProjectStore((s) => s.videoAnalysis)
  const videoSrc = useProjectStore((s) => s.videoSrc)
  const referenceUrl = useProjectStore((s) => s.referenceUrl)
  const setSubmissionStatus = useProjectStore((s) => s.setSubmissionStatus)
  const setAnalysisResult = useProjectStore((s) => s.setAnalysisResult)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const hasStoredResult = videoAnalysis !== null
  const result = useMemo<VideoAnalysisResult | null>(() => {
    if (!videoAnalysis) return null
    return {
      videoAnalysis,
      videoSrc: videoSrc ?? '',
      referenceUrl: referenceUrl ?? '',
    }
  }, [videoAnalysis, videoSrc, referenceUrl])

  useEffect(() => {
    if (!projectId) return
    const currentProjectId = projectId
    if (submissionStatus === 'FAILED') return
    if (submissionStatus === 'COMPLETED' && hasStoredResult) return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let completedRetryCount = 0

    async function syncAnalysisResult() {
      try {
        const data = await getBenchmarkAnalysis(currentProjectId)
        if (cancelled) return

        setSubmissionStatus(data.submissionStatus)

        if (data.submissionStatus === 'FAILED') {
          setErrorMessage(
            data.failure?.summary ??
            data.failure?.message ??
            data.lastErrorMessage ??
            '분석에 실패했습니다. 다시 시도해주세요.'
          )
          return
        }

        if (data.normalized_analysis_tabs) {
          setErrorMessage(null)
          setAnalysisResult(mapBenchmarkAnalysisResult(data))
          return
        }

        if (data.submissionStatus === 'COMPLETED') {
          completedRetryCount += 1

          if (completedRetryCount >= MAX_COMPLETED_RESULT_RETRIES) {
            setErrorMessage('분석은 완료되었지만 결과 데이터를 불러오지 못했습니다.')
            return
          }
        } else {
          completedRetryCount = 0
        }

        const nextDelay =
          data.submissionStatus === 'COMPLETED'
            ? COMPLETED_RESULT_RETRY_MS
            : POLL_INTERVAL_MS

        timeoutId = setTimeout(syncAnalysisResult, nextDelay)
      } catch {
        if (!cancelled) {
          setErrorMessage('분석 상태 확인 중 오류가 발생했습니다.')
        }
      }
    }

    syncAnalysisResult()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [projectId, submissionStatus, hasStoredResult, setSubmissionStatus, setAnalysisResult])

  const errorState = getErrorState({
    submissionStatus,
    errorMessage,
    hasStoredResult,
  })

  return {
    status: getResourceStatus({
      projectId,
      hasStoredResult,
      errorMessage: errorState.errorMessage,
    }),
    errorType: errorState.errorType,
    errorMessage: errorState.errorMessage,
    result,
  }
}
