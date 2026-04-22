'use client'

import { useEffect, useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { getBenchmarkAnalysis } from '@/lib/services/benchmarkAnalysis'
import {
  mapBenchmarkAnalysisToVideoAnalysis,
  extractVideoSrc,
  extractReferenceUrl,
} from '@/lib/services/mappers'
import type { BenchmarkAnalysisResponseDto } from '@/lib/types/api/benchmarkAnalysis'

const POLL_INTERVAL_MS = 2500
const TERMINAL_STATUSES = ['COMPLETED', 'FAILED']
const COMPLETED_RESULT_RETRY_MS = 1000
const MAX_COMPLETED_RESULT_RETRIES = 30

interface PollingState {
  isCompleted: boolean
  isFailed: boolean
  isLoading: boolean
  errorMessage: string | null
}

function getResolvedTabs(data: BenchmarkAnalysisResponseDto) {
  return data.normalized_analysis_tabs ?? data.analysisRawPayload?.normalized_analysis_tabs
}

export function useAnalysisPolling(): PollingState {
  const projectId = useProjectStore((s) => s.projectId)
  const storedStatus = useProjectStore((s) => s.submissionStatus)
  const videoAnalysis = useProjectStore((s) => s.videoAnalysis)
  const setSubmissionStatus = useProjectStore((s) => s.setSubmissionStatus)
  const setAnalysisResult = useProjectStore((s) => s.setAnalysisResult)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    const currentProjectId = projectId

    // FAILED는 항상 조기 종료
    if (storedStatus === 'FAILED') return

    // COMPLETED이고 분석 데이터도 있으면 완료
    if (storedStatus === 'COMPLETED' && videoAnalysis !== null) return

    // COMPLETED이지만 분석 데이터가 없는 경우 (페이지 새로고침 등) — 결과 탭이 붙을 때까지 짧게 재시도
    if (storedStatus === 'COMPLETED' && videoAnalysis === null) {
      let cancelled = false
      let retryCount = 0
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      async function fetchCompletedResult() {
        try {
          const data = await getBenchmarkAnalysis(currentProjectId)
          if (cancelled) return
          const resolvedTabs = getResolvedTabs(data)

          if (resolvedTabs) {
            setErrorMessage(null)
            setAnalysisResult({
              videoAnalysis: mapBenchmarkAnalysisToVideoAnalysis(data),
              videoSrc: extractVideoSrc(data),
              referenceUrl: extractReferenceUrl(data),
            })
            return
          }

          if (retryCount < MAX_COMPLETED_RESULT_RETRIES) {
            retryCount += 1
            timeoutId = setTimeout(fetchCompletedResult, COMPLETED_RESULT_RETRY_MS)
            return
          }

          setErrorMessage('분석은 완료되었지만 결과 데이터를 불러오지 못했습니다.')
        } catch {
          if (!cancelled) {
            setErrorMessage('분석 결과 로드 중 오류가 발생했습니다.')
          }
        }
      }

      fetchCompletedResult()

      return () => {
        cancelled = true
        if (timeoutId) clearTimeout(timeoutId)
      }
      return
    }

    // 미완료 상태 — 폴링 시작
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const data = await getBenchmarkAnalysis(currentProjectId)
        if (cancelled) return
        const resolvedTabs = getResolvedTabs(data)

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

        if (data.submissionStatus === 'COMPLETED') {
          if (resolvedTabs) {
            setErrorMessage(null)
            setAnalysisResult({
              videoAnalysis: mapBenchmarkAnalysisToVideoAnalysis(data),
              videoSrc: extractVideoSrc(data),
              referenceUrl: extractReferenceUrl(data),
            })
            return
          }

          timeoutId = setTimeout(poll, COMPLETED_RESULT_RETRY_MS)
          return
        }

        if (!TERMINAL_STATUSES.includes(data.submissionStatus)) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch (err) {
        console.error('[useAnalysisPolling] poll error:', err)
        if (!cancelled) {
          setErrorMessage('분석 상태 확인 중 오류가 발생했습니다.')
        }
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [projectId, storedStatus, videoAnalysis, setSubmissionStatus, setAnalysisResult])

  const isCompleted = storedStatus === 'COMPLETED' && videoAnalysis !== null
  const isFailed = storedStatus === 'FAILED' || errorMessage !== null
  const isLoading = Boolean(projectId) && !isCompleted && !isFailed

  return { isCompleted, isFailed, isLoading, errorMessage }
}
