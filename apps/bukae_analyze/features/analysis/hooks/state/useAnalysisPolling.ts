'use client'

import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'

const POLL_INTERVAL_MS = 2500
const TERMINAL_STATUSES = ['COMPLETED', 'FAILED']

interface PollingState {
  isCompleted: boolean
  isFailed: boolean
  isLoading: boolean
  errorMessage: string | null
}

export function useAnalysisPolling(): PollingState {
  const projectId = useProjectStore((s) => s.projectId)
  const storedStatus = useProjectStore((s) => s.submissionStatus)
  const setSubmissionStatus = useProjectStore((s) => s.setSubmissionStatus)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    if (storedStatus && TERMINAL_STATUSES.includes(storedStatus)) return

    let cancelled = false

    async function poll() {
      try {
        const data = await getBenchmarkAnalysis(projectId!)
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

        if (TERMINAL_STATUSES.includes(data.submissionStatus)) return

        setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        if (!cancelled) {
          setErrorMessage('분석 상태 확인 중 오류가 발생했습니다.')
        }
      }
    }

    poll()
    return () => { cancelled = true }
  }, [projectId, storedStatus, setSubmissionStatus])

  const isCompleted = storedStatus === 'COMPLETED'
  const isFailed = storedStatus === 'FAILED' || errorMessage !== null
  const isLoading = !isCompleted && !isFailed

  return { isCompleted, isFailed, isLoading, errorMessage }
}
