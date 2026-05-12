'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveAppError, type ResolvedAppError } from '@/lib/errors/appError'
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
} from '@/lib/utils/analysisResource'

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
  initialSnapshot?: AnalysisResourceSnapshotState | null,
  initialError?: ResolvedAppError | null
): AnalysisResourceState {
  const initialSnapshotState = useMemo(() => (
    initialSnapshot ?? {
      ...EMPTY_ANALYSIS_RESOURCE_SNAPSHOT,
      errorMessage: initialError?.message ?? null,
      appError: initialError ?? null,
    }
  ), [initialError, initialSnapshot])
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

          if (completedRetryCount >= MAX_COMPLETED_RESULT_RETRIES) {
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
                  appError: null,
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
      } catch (error) {
        if (cancelled) return
        console.error('[useAnalysisResource] poll failed:', error)
        const appError = resolveAppError(error, 'analysis_polling')
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
              errorMessage: appError.message,
              appError,
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
