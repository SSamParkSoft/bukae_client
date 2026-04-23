'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getPlanningSession } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'

const POLLING_INTERVAL_MS = 2000
const MAX_POLLING_ATTEMPTS = 40

export interface PlanningSessionState {
  session: PlanningSession | null
  isLoading: boolean
  errorMessage: string | null
  replaceSession: (nextSession: PlanningSession) => void
}

function getFailureMessage(session: PlanningSession | null): string | null {
  if (!session?.failure) return null

  return (
    session.failure.summary ??
    session.failure.message ??
    '기획 질문을 불러오는 중 문제가 발생했습니다.'
  )
}

function shouldKeepPolling(session: PlanningSession | null): boolean {
  if (!session) return true
  if (getFailureMessage(session)) return false
  if (session.readyForApproval) return false
  return session.clarifyingQuestions.length === 0
}

export function usePlanningSession(
  projectId: string,
  initialSession: PlanningSession | null = null
): PlanningSessionState {
  const [session, setSession] = useState<PlanningSession | null>(initialSession)
  const [isLoading, setIsLoading] = useState<boolean>(() => shouldKeepPolling(initialSession))
  const [errorMessage, setErrorMessage] = useState<string | null>(() => getFailureMessage(initialSession))
  const attemptsRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    attemptsRef.current = 0

    if (!shouldKeepPolling(initialSession)) {
      return
    }

    async function poll(): Promise<void> {
      try {
        const nextSession = await getPlanningSession(projectId)

        if (cancelled) return

        setSession(nextSession)

        const failureMessage = getFailureMessage(nextSession)
        if (failureMessage) {
          setErrorMessage(failureMessage)
          setIsLoading(false)
          return
        }

        if (!shouldKeepPolling(nextSession)) {
          setErrorMessage(null)
          setIsLoading(false)
          return
        }

        attemptsRef.current += 1
        if (attemptsRef.current >= MAX_POLLING_ATTEMPTS) {
          setErrorMessage('PT1 질문 생성 시간이 초과되었습니다.')
          setIsLoading(false)
          return
        }

        window.setTimeout(() => {
          void poll()
        }, POLLING_INTERVAL_MS)
      } catch (error) {
        if (cancelled) return

        setErrorMessage(
          error instanceof Error
            ? error.message
            : '기획 질문을 불러오지 못했습니다.'
        )
        setIsLoading(false)
      }
    }

    void poll()

    return () => {
      cancelled = true
    }
  }, [initialSession, projectId])

  return useMemo(() => ({
    session,
    isLoading,
    errorMessage,
    replaceSession: setSession,
  }), [session, isLoading, errorMessage])
}
