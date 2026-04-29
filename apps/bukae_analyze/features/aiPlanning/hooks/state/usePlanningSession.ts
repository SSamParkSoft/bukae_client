'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPlanningSession } from '@/lib/services/planning'
import {
  formatWorkflowState,
  getProjectWorkflowState,
  isPlanningStep,
} from '@/lib/services/projectWorkflowState'
import type { PlanningSession } from '@/lib/types/domain'

const POLLING_INTERVAL_MS = 5000
const MAX_POLLING_ATTEMPTS = 40

export interface PlanningSessionState {
  session: PlanningSession | null
  isLoading: boolean
  errorMessage: string | null
  replaceSession: (nextSession: PlanningSession) => void
}

interface LocalPlanningSessionState {
  projectId: string
  enabled: boolean
  initialSession: PlanningSession | null
  session: PlanningSession | null
  isLoading: boolean
  errorMessage: string | null
}

function createLocalPlanningSessionState(
  projectId: string,
  initialSession: PlanningSession | null,
  enabled: boolean
): LocalPlanningSessionState {
  return {
    projectId,
    enabled,
    initialSession,
    session: initialSession,
    isLoading: enabled && shouldKeepPolling(initialSession),
    errorMessage: getFailureMessage(initialSession),
  }
}

function isCurrentPlanningSessionState(
  state: LocalPlanningSessionState,
  projectId: string,
  initialSession: PlanningSession | null,
  enabled: boolean
): boolean {
  return (
    state.projectId === projectId &&
    state.initialSession === initialSession &&
    state.enabled === enabled
  )
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
  initialSession: PlanningSession | null = null,
  enabled = true
): PlanningSessionState {
  const [localState, setLocalState] = useState<LocalPlanningSessionState>(() => (
    createLocalPlanningSessionState(projectId, initialSession, enabled)
  ))
  const currentState = isCurrentPlanningSessionState(localState, projectId, initialSession, enabled)
    ? localState
    : createLocalPlanningSessionState(projectId, initialSession, enabled)
  const attemptsRef = useRef(0)
  const updateCurrentState = useCallback((
    updater: (state: LocalPlanningSessionState) => LocalPlanningSessionState
  ) => {
    setLocalState((prev) => updater(
      isCurrentPlanningSessionState(prev, projectId, initialSession, enabled)
        ? prev
        : createLocalPlanningSessionState(projectId, initialSession, enabled)
    ))
  }, [enabled, initialSession, projectId])
  const replaceSession = useCallback((nextSession: PlanningSession) => {
    updateCurrentState((prev) => ({ ...prev, session: nextSession }))
  }, [updateCurrentState])

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | null = null

    attemptsRef.current = 0

    if (!enabled || !shouldKeepPolling(initialSession)) {
      return
    }

    async function poll(): Promise<void> {
      try {
        const nextSession = await getPlanningSession(projectId)

        if (cancelled) return

        updateCurrentState((prev) => ({ ...prev, session: nextSession }))

        const failureMessage = getFailureMessage(nextSession)
        if (failureMessage) {
          updateCurrentState((prev) => ({
            ...prev,
            errorMessage: failureMessage,
            isLoading: false,
          }))
          return
        }

        if (!shouldKeepPolling(nextSession)) {
          updateCurrentState((prev) => ({
            ...prev,
            errorMessage: null,
            isLoading: false,
          }))
          return
        }

        attemptsRef.current += 1
        if (attemptsRef.current >= MAX_POLLING_ATTEMPTS) {
          updateCurrentState((prev) => ({
            ...prev,
            errorMessage: 'PT1 질문 생성 시간이 초과되었습니다.',
            isLoading: false,
          }))
          return
        }

        timeoutId = window.setTimeout(() => {
          void poll()
        }, POLLING_INTERVAL_MS)
      } catch (error) {
        if (cancelled) return

        const workflowState = await getProjectWorkflowState(projectId).catch(() => null)
        if (workflowState && !isPlanningStep(workflowState)) {
          updateCurrentState((prev) => ({
            ...prev,
            errorMessage: `현재 프로젝트 단계가 기획 단계가 아닙니다. (${formatWorkflowState(workflowState)})`,
            isLoading: false,
          }))
          return
        }

        updateCurrentState((prev) => ({
          ...prev,
          errorMessage: error instanceof Error
            ? error.message
            : '기획 질문을 불러오지 못했습니다.',
          isLoading: false,
        }))
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [enabled, initialSession, projectId, updateCurrentState])

  return useMemo(() => ({
    session: currentState.session,
    isLoading: currentState.isLoading,
    errorMessage: currentState.errorMessage,
    replaceSession,
  }), [currentState.errorMessage, currentState.isLoading, currentState.session, replaceSession])
}
