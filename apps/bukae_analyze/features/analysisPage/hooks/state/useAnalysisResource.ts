'use client'

import { useEffect, useRef, useState } from 'react'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'
import { getProjectPollingState } from '@/lib/services/projects'
import {
  createAnalysisResourceSnapshot,
  deriveAnalysisResourceState,
  EMPTY_ANALYSIS_RESOURCE_SNAPSHOT,
  type AnalysisResourceState,
} from '@/features/analysisPage/lib/analysisResource'

const POLL_INTERVAL_MS = 2500
const COMPLETED_RESULT_RETRY_MS = 1000
const MAX_COMPLETED_RESULT_RETRIES = 10

export function useAnalysisResource(projectId: string): AnalysisResourceState {
  const [snapshot, setSnapshot] = useState(
    EMPTY_ANALYSIS_RESOURCE_SNAPSHOT
  )
  const latestResultRef = useRef(snapshot.result)

  useEffect(() => {
    latestResultRef.current = snapshot.result
  }, [snapshot.result])

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let completedRetryCount = 0

    async function syncAnalysisResult() {
      try {
        const [project, analysisSnapshot] = await Promise.all([
          getProjectPollingState(projectId),
          getBenchmarkAnalysis(projectId),
        ])
        if (cancelled) return
        const nextSnapshot = createAnalysisResourceSnapshot({
          project,
          snapshot: analysisSnapshot,
          previousResult: latestResultRef.current,
        })

        setSnapshot(nextSnapshot)

        const reachedCompletion = nextSnapshot.isCompleted
        const hasResult = nextSnapshot.result !== null

        if (nextSnapshot.errorMessage) {
          return
        }

        if (reachedCompletion && hasResult) return

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

  return deriveAnalysisResourceState(snapshot)
}
