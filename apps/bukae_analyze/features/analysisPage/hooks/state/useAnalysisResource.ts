'use client'

import { useEffect, useState } from 'react'
import type { VideoAnalysisResult } from '@/lib/types/domain'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'
import { getProjectPollingState } from '@/lib/services/projects'

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

interface AnalysisResourceSnapshot {
  projectStatus: string | null
  submissionStatus: string | null
  result: VideoAnalysisResult | null
  errorMessage: string | null
  isCompleted: boolean
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
  isCompleted: boolean
  hasResult: boolean
  errorMessage: string | null
}): AnalysisResourceStatus {
  const { isCompleted, hasResult, errorMessage } = params
  if (isCompleted && hasResult) return 'ready'
  if (errorMessage) return 'error'
  return 'loading'
}

const INITIAL_ANALYSIS_RESOURCE_SNAPSHOT: AnalysisResourceSnapshot = {
  projectStatus: null,
  submissionStatus: null,
  result: null,
  errorMessage: null,
  isCompleted: false,
}

export function useAnalysisResource(projectId: string): AnalysisResourceState {
  const [snapshot, setSnapshot] = useState<AnalysisResourceSnapshot>(
    INITIAL_ANALYSIS_RESOURCE_SNAPSHOT
  )

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let completedRetryCount = 0

    async function syncAnalysisResult() {
      try {
        const [project, snapshot] = await Promise.all([
          getProjectPollingState(projectId),
          getBenchmarkAnalysis(projectId),
        ])
        if (cancelled) return
        const { polling, result } = snapshot

        setSnapshot((prev) => ({
          ...prev,
          projectStatus: project.projectStatus,
          submissionStatus: polling.submissionStatus,
        }))

        const isFailed =
          project.projectStatus === 'FAILED' ||
          project.projectStatus === 'CANCELLED' ||
          polling.submissionStatus === 'FAILED' ||
          polling.analysisStatus === 'FAILED'

        if (isFailed) {
          setSnapshot((prev) => ({
            ...prev,
            isCompleted: false,
            errorMessage:
              project.errorMessage ??
              polling.errorMessage ??
              '분석에 실패했습니다. 다시 시도해주세요.',
          }))
          return
        }

        const reachedCompletion =
          polling.analysisStatus === 'COMPLETED' ||
          polling.readyForCategorySelection ||
          (
            project.projectStatus === 'INTAKE_READY' &&
            project.currentStep === 'CATEGORY_SELECTION'
          )

        setSnapshot((prev) => ({
          ...prev,
          isCompleted: reachedCompletion,
          result: result ?? prev.result,
        }))

        if (reachedCompletion && result) {
          setSnapshot((prev) => ({
            ...prev,
            errorMessage: null,
          }))
          return
        }

        if (reachedCompletion) {
          completedRetryCount += 1

          if (completedRetryCount >= MAX_COMPLETED_RESULT_RETRIES) {
            setSnapshot((prev) => ({
              ...prev,
              errorMessage: '분석은 완료되었지만 결과 데이터를 불러오지 못했습니다.',
            }))
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
      } catch (err) {
        if (cancelled) return
        console.error('[useAnalysisResource] poll failed:', err)
        setSnapshot((prev) => ({
          ...prev,
          errorMessage: '분석 상태 확인 중 오류가 발생했습니다.',
        }))
        timeoutId = setTimeout(syncAnalysisResult, POLL_INTERVAL_MS)
      }
    }

    syncAnalysisResult()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [projectId])

  const errorState = getErrorState({
    submissionStatus: snapshot.submissionStatus,
    projectStatus: snapshot.projectStatus,
    isCompleted: snapshot.isCompleted,
    errorMessage: snapshot.errorMessage,
    hasStoredResult: snapshot.result !== null,
  })

  return {
    status: getResourceStatus({
      isCompleted: snapshot.isCompleted,
      hasResult: snapshot.result !== null,
      errorMessage: errorState.errorMessage,
    }),
    errorType: errorState.errorType,
    errorMessage: errorState.errorMessage,
    result: snapshot.result,
  }
}
