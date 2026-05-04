'use client'

import { useEffect, useRef, useState } from 'react'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'
import { getProjectPollingState } from '@/lib/services/projects'
import {
  createAnalysisResourceSnapshot,
  deriveAnalysisResourceState,
  EMPTY_ANALYSIS_RESOURCE_SNAPSHOT,
  isAnalysisReadySnapshot,
  isAnalysisTerminalFailure,
  type AnalysisResourceSnapshotState,
  type AnalysisResourceState,
} from '@/features/analysisPage/lib/analysisResource'

const POLL_INTERVAL_MS = 2500
const COMPLETED_RESULT_RETRY_MS = 1000
const MAX_COMPLETED_RESULT_RETRIES = 10

interface LocalAnalysisResourceSnapshot {
  projectId: string
  initialSnapshot: AnalysisResourceSnapshotState
  snapshot: AnalysisResourceSnapshotState
}

function createLocalAnalysisResourceSnapshot(
  projectId: string,
  initialSnapshot: AnalysisResourceSnapshotState,
  snapshot: AnalysisResourceSnapshotState = initialSnapshot
): LocalAnalysisResourceSnapshot {
  return {
    projectId,
    initialSnapshot,
    snapshot,
  }
}

function isCurrentAnalysisResourceSnapshot(
  state: LocalAnalysisResourceSnapshot,
  projectId: string,
  initialSnapshot: AnalysisResourceSnapshotState
): boolean {
  return (
    state.projectId === projectId &&
    state.initialSnapshot === initialSnapshot
  )
}

export function useAnalysisResource(
  projectId: string,
  initialSnapshot?: AnalysisResourceSnapshotState | null
): AnalysisResourceState {
  const initialSnapshotState = initialSnapshot ?? EMPTY_ANALYSIS_RESOURCE_SNAPSHOT
  const [localSnapshot, setLocalSnapshot] = useState<LocalAnalysisResourceSnapshot>(() => (
    createLocalAnalysisResourceSnapshot(projectId, initialSnapshotState)
  ))
  const snapshot = isCurrentAnalysisResourceSnapshot(
    localSnapshot,
    projectId,
    initialSnapshotState
  )
    ? localSnapshot.snapshot
    : initialSnapshotState
  const latestResultRef = useRef(snapshot.result)

  useEffect(() => {
    latestResultRef.current = snapshot.result
  }, [snapshot.result])

  useEffect(() => {
    if (initialSnapshot && (
      isAnalysisReadySnapshot(initialSnapshot) ||
      isAnalysisTerminalFailure(initialSnapshot)
    )) {
      return
    }

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

        setLocalSnapshot(createLocalAnalysisResourceSnapshot(
          projectId,
          initialSnapshotState,
          nextSnapshot
        ))

        const reachedCompletion = nextSnapshot.isCompleted
        const hasResult = nextSnapshot.result !== null

        if (nextSnapshot.errorMessage) {
          return
        }

        if (reachedCompletion && hasResult) return

        if (reachedCompletion) {
          completedRetryCount += 1

          if (process.env.NODE_ENV !== 'production') {
            console.warn('[analysis-resource] completed but mapped result is missing', {
              projectId,
              retry: completedRetryCount,
              maxRetries: MAX_COMPLETED_RESULT_RETRIES,
              project: {
                projectStatus: project.projectStatus,
                currentStep: project.currentStep,
                workflow: project.workflow,
              },
              polling: analysisSnapshot.polling,
              snapshot: {
                projectStatus: nextSnapshot.projectStatus,
                submissionStatus: nextSnapshot.submissionStatus,
                analysisStatus: nextSnapshot.analysisStatus,
                isCompleted: nextSnapshot.isCompleted,
                isProjectFailed: nextSnapshot.isProjectFailed,
                hasResult,
              },
            })
          }

          if (completedRetryCount >= MAX_COMPLETED_RESULT_RETRIES) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[analysis-resource] giving up after completed-result retries', {
                projectId,
                retries: completedRetryCount,
                polling: analysisSnapshot.polling,
              })
            }

            setLocalSnapshot((prev) => {
              const current = isCurrentAnalysisResourceSnapshot(
                prev,
                projectId,
                initialSnapshotState
              )
                ? prev.snapshot
                : initialSnapshotState

              return createLocalAnalysisResourceSnapshot(
                projectId,
                initialSnapshotState,
                {
                  ...current,
                  errorMessage: '분석은 완료되었지만 결과 데이터를 불러오지 못했습니다.',
                }
              )
            })
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
        setLocalSnapshot((prev) => {
          const current = isCurrentAnalysisResourceSnapshot(
            prev,
            projectId,
            initialSnapshotState
          )
            ? prev.snapshot
            : initialSnapshotState

          return createLocalAnalysisResourceSnapshot(
            projectId,
            initialSnapshotState,
            {
              ...current,
              errorMessage: '분석 상태 확인 중 오류가 발생했습니다.',
            }
          )
        })
        timeoutId = setTimeout(syncAnalysisResult, POLL_INTERVAL_MS)
      }
    }

    syncAnalysisResult()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [initialSnapshot, initialSnapshotState, projectId])

  return deriveAnalysisResourceState(snapshot)
}
