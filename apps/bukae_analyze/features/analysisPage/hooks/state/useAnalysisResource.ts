'use client'

import { useEffect, useMemo, useState } from 'react'
import type { VideoAnalysisResult } from '@/lib/types/domain'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'
import { getProjectPollingState } from '@/lib/services/projects'
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
  projectStatus: string | null
  isCompleted: boolean
  errorMessage: string | null
  hasStoredResult: boolean
}): { errorType: AnalysisResourceErrorType | null; errorMessage: string | null } {
  const { submissionStatus, projectStatus, isCompleted, errorMessage, hasStoredResult } = params

  if (hasStoredResult && isCompleted) return { errorType: null, errorMessage: null }

  if (
    submissionStatus === 'FAILED' ||
    projectStatus === 'FAILED' ||
    projectStatus === 'CANCELLED'
  ) {
    return {
      errorType: 'failed',
      errorMessage: errorMessage ?? '분석에 실패했습니다. 다시 시도해주세요.',
    }
  }

  if (!errorMessage) return { errorType: null, errorMessage: null }

  return {
    errorType: isCompleted ? 'missing_result' : 'unknown',
    errorMessage,
  }
}

function getResourceStatus(params: {
  projectId: string | null
  isCompleted: boolean
  hasStoredResult: boolean
  errorMessage: string | null
}): AnalysisResourceStatus {
  const { projectId, isCompleted, hasStoredResult, errorMessage } = params
  if (!projectId) return 'idle'
  if (isCompleted && hasStoredResult) return 'ready'
  if (errorMessage) return 'error'
  return 'loading'
}

export function useAnalysisResource(): AnalysisResourceState {
  const projectId = useProjectStore((s) => s.projectId)
  const projectStatus = useProjectStore((s) => s.projectStatus)
  const submissionStatus = useProjectStore((s) => s.submissionStatus)
  const videoAnalysis = useProjectStore((s) => s.videoAnalysis)
  const videoSrc = useProjectStore((s) => s.videoSrc)
  const referenceUrl = useProjectStore((s) => s.referenceUrl)
  const setProjectProgress = useProjectStore((s) => s.setProjectProgress)
  const setSubmissionStatus = useProjectStore((s) => s.setSubmissionStatus)
  const setAnalysisResult = useProjectStore((s) => s.setAnalysisResult)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

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

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let completedRetryCount = 0

    async function syncAnalysisResult() {
      try {
        const [project, snapshot] = await Promise.all([
          getProjectPollingState(currentProjectId),
          getBenchmarkAnalysis(currentProjectId),
        ])
        if (cancelled) return
        const { polling, result } = snapshot

        setProjectProgress({
          projectStatus: project.projectStatus,
          currentStep: project.currentStep,
        })
        setSubmissionStatus(polling.submissionStatus)

        const isFailed =
          project.projectStatus === 'FAILED' ||
          project.projectStatus === 'CANCELLED' ||
          polling.submissionStatus === 'FAILED' ||
          polling.analysisStatus === 'FAILED'

        if (isFailed) {
          setErrorMessage(
            project.errorMessage ??
              polling.errorMessage ??
              '분석에 실패했습니다. 다시 시도해주세요.'
          )
          return
        }

        const reachedCompletion =
          polling.analysisStatus === 'COMPLETED' ||
          polling.readyForCategorySelection ||
          (
            project.projectStatus === 'INTAKE_READY' &&
            project.currentStep === 'CATEGORY_SELECTION'
          )

        setIsCompleted(reachedCompletion)

        if (result) {
          setAnalysisResult(result)
        }

        if (reachedCompletion && result) {
          setErrorMessage(null)
          return
        }

        if (reachedCompletion) {
          completedRetryCount += 1

          if (completedRetryCount >= MAX_COMPLETED_RESULT_RETRIES) {
            setErrorMessage('분석은 완료되었지만 결과 데이터를 불러오지 못했습니다.')
            return
          }
        } else {
          completedRetryCount = 0
        }

        const nextDelay =
          reachedCompletion
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
  }, [projectId, setProjectProgress, setSubmissionStatus, setAnalysisResult])

  const errorState = getErrorState({
    submissionStatus,
    projectStatus,
    isCompleted,
    errorMessage,
    hasStoredResult,
  })

  return {
    status: getResourceStatus({
      projectId,
      isCompleted,
      hasStoredResult,
      errorMessage: errorState.errorMessage,
    }),
    errorType: errorState.errorType,
    errorMessage: errorState.errorMessage,
    result,
  }
}
