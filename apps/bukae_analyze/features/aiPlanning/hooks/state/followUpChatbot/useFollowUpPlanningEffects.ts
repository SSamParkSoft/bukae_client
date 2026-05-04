'use client'

import { useEffect, useRef } from 'react'
import { getPlanningSession, finalizePlanning } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  FOLLOW_UP_STAGE_MESSAGES,
  type FollowUpStageMessage,
} from '../../../lib/followUpChatbot/messages'
import {
  type ActiveFollowUpQuestion,
  mapSessionQuestions,
} from '../../../lib/followUpChatbot/questions'
import {
  getErrorMessage,
  resolvePlanningRecovery,
} from '../../../lib/followUpChatbot/recovery'
import {
  canFinalizePlanning,
  hasFinalizePlanningStarted,
} from '../../../lib/planningPredicates'
import { waitFinalizedProject, type FinalizedProject } from '../../../lib/planningWorkflow'
import { createFollowUpQuestionWorkflow } from '../../../lib/followUpChatbot/workflow'

const POLLING_INTERVAL_MS = 2000
const PLANNING_POLLING_LIMIT = 120

export type RefState<T> = { current: T }
export type StateSetter<T> = (value: T | ((prev: T) => T)) => void

function getPlanningDebugSnapshot(session: PlanningSession | null) {
  return {
    planningSessionId: session?.planningSessionId ?? null,
    planningMode: session?.planningMode ?? null,
    planningStatus: session?.planningStatus ?? null,
    readyForApproval: Boolean(session?.readyForApproval),
    readyToFinalize: canFinalizePlanning(session),
    clarifyingQuestionCount: session?.clarifyingQuestions.length ?? 0,
    answeredQuestionCount: createFollowUpQuestionWorkflow(session).answeredQuestionCount,
    firstQuestionId: session?.clarifyingQuestions[0]?.questionId ?? null,
    failureMessage: session?.failure?.summary ?? session?.failure?.message ?? null,
    projectStatus: session?.projectStatus ?? null,
    currentStep: session?.currentStep ?? null,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function useMountedRef(): RefState<boolean> {
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  return isMountedRef
}

export function useSyncInitialPlanningSession(params: {
  enabled: boolean
  initialSession: PlanningSession | null
  appliedSessionRef: RefState<PlanningSession | null>
  setSession: StateSetter<PlanningSession | null>
  setQuestionQueue: StateSetter<ActiveFollowUpQuestion[]>
}) {
  const {
    enabled,
    initialSession,
    appliedSessionRef,
    setSession,
    setQuestionQueue,
  } = params

  useEffect(() => {
    if (!enabled) return
    if (initialSession && appliedSessionRef.current === initialSession) return

    setSession(initialSession)
    setQuestionQueue(mapSessionQuestions(initialSession))
  }, [appliedSessionRef, enabled, initialSession, setQuestionQueue, setSession])
}

export function useRefreshPlanningSessionOnChatbotEntry(params: {
  enabled: boolean
  projectId: string
  refreshedProjectIdRef: RefState<string | null>
  isInitialRefreshRef: RefState<boolean>
  isMountedRef: RefState<boolean>
  applySession: (nextSession: PlanningSession) => void
  applyFinalizedProject: (finalizedProject: FinalizedProject) => void
  setQuestionQueue: StateSetter<ActiveFollowUpQuestion[]>
  setErrorMessage: StateSetter<string | null>
}) {
  const {
    enabled,
    projectId,
    refreshedProjectIdRef,
    isInitialRefreshRef,
    isMountedRef,
    applySession,
    applyFinalizedProject,
    setQuestionQueue,
    setErrorMessage,
  } = params

  useEffect(() => {
    if (!enabled) return
    if (refreshedProjectIdRef.current === projectId) return

    refreshedProjectIdRef.current = projectId
    isInitialRefreshRef.current = true

    async function refreshPlanning() {
      try {
        const nextSession = await getPlanningSession(projectId)
        if (!isMountedRef.current) return

        console.warn('[followUpChatbot] entry refresh resolved', {
          projectId,
          session: getPlanningDebugSnapshot(nextSession),
          mappedQuestionCount: mapSessionQuestions(nextSession).length,
        })
        applySession(nextSession)
        setQuestionQueue(mapSessionQuestions(nextSession))
        setErrorMessage(null)
      } catch (error) {
        if (!isMountedRef.current) return

        console.warn('[followUpChatbot] entry refresh failed', {
          projectId,
          error,
        })
        const recovery = await resolvePlanningRecovery(
          projectId,
          error,
          '기획 상태 조회에 실패했습니다.'
        )
        if (recovery.finalizedProject) {
          applyFinalizedProject(recovery.finalizedProject)
          return
        }

        setErrorMessage(recovery.errorMessage)
      } finally {
        if (isMountedRef.current) {
          isInitialRefreshRef.current = false
        }
      }
    }

    void refreshPlanning()

    return () => {
      isInitialRefreshRef.current = false
    }
  }, [
    applyFinalizedProject,
    applySession,
    enabled,
    isInitialRefreshRef,
    isMountedRef,
    projectId,
    refreshedProjectIdRef,
    setErrorMessage,
    setQuestionQueue,
  ])
}

export function usePollNextFollowUpQuestion(params: {
  enabled: boolean
  projectId: string
  currentQuestion: ActiveFollowUpQuestion | null
  canFinalizeCurrentPlanning: boolean
  isComplete: boolean
  isReadyForApproval: boolean
  isRevising: boolean
  isInitialRefreshRef: RefState<boolean>
  isPollingRef: RefState<boolean>
  isFinalizingRef: RefState<boolean>
  applySession: (nextSession: PlanningSession) => void
  applyFinalizedProject: (finalizedProject: FinalizedProject) => void
  setQuestionQueue: StateSetter<ActiveFollowUpQuestion[]>
  setIsSubmitting: StateSetter<boolean>
  setStageMessage: StateSetter<FollowUpStageMessage>
  setErrorMessage: StateSetter<string | null>
}) {
  const {
    enabled,
    projectId,
    currentQuestion,
    canFinalizeCurrentPlanning,
    isComplete,
    isReadyForApproval,
    isRevising,
    isInitialRefreshRef,
    isPollingRef,
    isFinalizingRef,
    applySession,
    applyFinalizedProject,
    setQuestionQueue,
    setIsSubmitting,
    setStageMessage,
    setErrorMessage,
  } = params

  useEffect(() => {
    const guardSnapshot = {
      projectId,
      enabled,
      initialRefreshing: isInitialRefreshRef.current,
      currentQuestionId: currentQuestion?.questionId ?? null,
      canFinalizeCurrentPlanning,
      isComplete,
      isFinalizing: isFinalizingRef.current,
      isReadyForApproval,
      isPolling: isPollingRef.current,
    }

    if (!enabled) {
      console.warn('[followUpChatbot] poll skipped: disabled', guardSnapshot)
      return
    }
    if (isInitialRefreshRef.current) {
      console.warn('[followUpChatbot] poll skipped: entry refresh in progress', guardSnapshot)
      return
    }
    if (currentQuestion && !canFinalizeCurrentPlanning) {
      console.warn('[followUpChatbot] poll skipped: current question is active', guardSnapshot)
      return
    }
    if (isComplete) {
      console.warn('[followUpChatbot] poll skipped: complete', guardSnapshot)
      return
    }
    if (isFinalizingRef.current) {
      console.warn('[followUpChatbot] poll skipped: finalizing', guardSnapshot)
      return
    }
    if (canFinalizeCurrentPlanning) {
      console.warn('[followUpChatbot] poll skipped: ready to finalize', guardSnapshot)
      return
    }
    if (isReadyForApproval) {
      console.warn('[followUpChatbot] poll skipped: ready for approval', guardSnapshot)
      return
    }
    if (isPollingRef.current) {
      console.warn('[followUpChatbot] poll skipped: already polling', guardSnapshot)
      return
    }

    let cancelled = false
    isPollingRef.current = true
    console.warn('[followUpChatbot] poll started', guardSnapshot)

    async function pollPlanning() {
      setIsSubmitting(true)
      setStageMessage(isRevising ? FOLLOW_UP_STAGE_MESSAGES.finalizing : FOLLOW_UP_STAGE_MESSAGES.waitingQuestion)

      for (let i = 0; i < PLANNING_POLLING_LIMIT; i += 1) {
        if (cancelled) return

        try {
          const nextSession = await getPlanningSession(projectId)
          applySession(nextSession)
          const nextQuestions = mapSessionQuestions(nextSession)
          console.warn('[followUpChatbot] poll tick resolved', {
            projectId,
            attempt: i + 1,
            session: getPlanningDebugSnapshot(nextSession),
            mappedQuestionCount: nextQuestions.length,
          })
          if (nextQuestions.length > 0) {
            setQuestionQueue(nextQuestions)
          }

          if (nextSession.failure) {
            throw new Error(
              nextSession.failure.summary ??
              nextSession.failure.message ??
              '기획 상태 조회에 실패했습니다.'
            )
          }

          if (nextQuestions.length > 0) {
            setIsSubmitting(false)
            return
          }

          if (canFinalizePlanning(nextSession) || nextSession.readyForApproval) {
            setIsSubmitting(false)
            return
          }

          await sleep(POLLING_INTERVAL_MS)
        } catch (error) {
          console.warn('[followUpChatbot] poll tick failed', {
            projectId,
            error,
          })
          const recovery = await resolvePlanningRecovery(
            projectId,
            error,
            '기획 상태 조회에 실패했습니다.'
          )
          if (recovery.finalizedProject) {
            applyFinalizedProject(recovery.finalizedProject)
            setIsSubmitting(false)
            return
          }

          setErrorMessage(recovery.errorMessage)
          setIsSubmitting(false)
          return
        }
      }

      setErrorMessage('PT2 질문 준비 시간이 초과되었습니다.')
      setIsSubmitting(false)
    }

    void pollPlanning().finally(() => {
      isPollingRef.current = false
    })

    return () => {
      cancelled = true
      isPollingRef.current = false
    }
  }, [
    applyFinalizedProject,
    applySession,
    canFinalizeCurrentPlanning,
    currentQuestion,
    enabled,
    isComplete,
    isFinalizingRef,
    isInitialRefreshRef,
    isPollingRef,
    isReadyForApproval,
    isRevising,
    projectId,
    setErrorMessage,
    setIsSubmitting,
    setQuestionQueue,
    setStageMessage,
  ])
}

export function useFinalizePlanningWhenReady(params: {
  enabled: boolean
  projectId: string
  session: PlanningSession | null
  currentQuestion: ActiveFollowUpQuestion | null
  canFinalizeCurrentPlanning: boolean
  isComplete: boolean
  isReadyForApproval: boolean
  isFinalizingRef: RefState<boolean>
  isMountedRef: RefState<boolean>
  applyFinalizedProject: (finalizedProject: FinalizedProject) => void
  setIsSubmitting: StateSetter<boolean>
  setStageMessage: StateSetter<FollowUpStageMessage>
  setErrorMessage: StateSetter<string | null>
}) {
  const {
    enabled,
    projectId,
    session,
    currentQuestion,
    canFinalizeCurrentPlanning,
    isComplete,
    isReadyForApproval,
    isFinalizingRef,
    isMountedRef,
    applyFinalizedProject,
    setIsSubmitting,
    setStageMessage,
    setErrorMessage,
  } = params

  useEffect(() => {
    if (!enabled) return
    if (!session) return
    if (currentQuestion || isComplete || isFinalizingRef.current) return
    if (!canFinalizeCurrentPlanning && !isReadyForApproval) return

    isFinalizingRef.current = true

    async function finalizeAndGenerate() {
      const activeSession = session
      if (!activeSession) return

      try {
        setIsSubmitting(true)

        if (!activeSession.readyForApproval && !hasFinalizePlanningStarted(activeSession)) {
          setStageMessage(FOLLOW_UP_STAGE_MESSAGES.finalizing)
          try {
            await finalizePlanning(projectId, {
              planningSessionId: activeSession.planningSessionId ?? '',
            })
          } catch (error) {
            const recovery = await resolvePlanningRecovery(
              projectId,
              error,
              '최종 기획안 생성 요청에 실패했습니다.'
            )
            if (recovery.finalizedProject) {
              applyFinalizedProject(recovery.finalizedProject)
              return
            }

            throw new Error(recovery.errorMessage ?? '최종 기획안 생성 요청에 실패했습니다.')
          }
        }

        const recommendedAngle = activeSession.candidateAngles.find(
          (angle) => angle['recommended'] === true
        )
        if (recommendedAngle) {
          applyFinalizedProject({
            briefVersionId: '',
            title: typeof recommendedAngle['title'] === 'string'
              ? recommendedAngle['title']
              : '최종 기획안 준비 완료',
            planningSummary: typeof recommendedAngle['summary'] === 'string'
              ? recommendedAngle['summary']
              : '',
            status: activeSession.planningStatus ?? '',
          })
          return
        }

        setStageMessage(FOLLOW_UP_STAGE_MESSAGES.approving)
        const finalizedProject = await waitFinalizedProject(projectId)

        applyFinalizedProject(finalizedProject)
      } catch (error) {
        if (!isMountedRef.current) return
        setErrorMessage(getErrorMessage(error, '촬영가이드 생성에 실패했습니다.'))
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false)
        }
        isFinalizingRef.current = false
      }
    }

    void finalizeAndGenerate()
  }, [
    applyFinalizedProject,
    canFinalizeCurrentPlanning,
    currentQuestion,
    enabled,
    isComplete,
    isFinalizingRef,
    isMountedRef,
    isReadyForApproval,
    projectId,
    session,
    setErrorMessage,
    setIsSubmitting,
    setStageMessage,
  ])
}
