'use client'

import { useEffect, useMemo, useState } from 'react'
import type { VideoAnalysisResult } from '@/lib/types/domain'
import { mapBenchmarkAnalysisResult } from '@/lib/services/mappers'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'
import { useProjectStore } from '@/store/useProjectStore'

const POLL_INTERVAL_MS = 2500
const COMPLETED_RESULT_RETRY_MS = 1000

export type AnalysisResourceStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AnalysisResourceState {
  status: AnalysisResourceStatus
  errorMessage: string | null
  result: VideoAnalysisResult | null
}

function getFailureMessage(params: {
  submissionStatus: string | null
  errorMessage: string | null
  hasStoredResult: boolean
}): string | null {
  const { submissionStatus, errorMessage, hasStoredResult } = params
  if (hasStoredResult) return null
  if (submissionStatus === 'FAILED') {
    return errorMessage ?? '분석에 실패했습니다. 다시 시도해주세요.'
  }
  return errorMessage
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

  const resolvedErrorMessage = getFailureMessage({
    submissionStatus,
    errorMessage,
    hasStoredResult,
  })

  return {
    status: getResourceStatus({
      projectId,
      hasStoredResult,
      errorMessage: resolvedErrorMessage,
    }),
    errorMessage: resolvedErrorMessage,
    result,
  }
}
