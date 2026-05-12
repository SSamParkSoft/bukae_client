'use client'

// 다음 질문이 준비될 때까지 서버를 반복 조회한다. 답변 제출 후 질문 큐가 비었을 때 동작한다.
import { useEffect } from 'react'
import { getPlanningSession } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  FOLLOW_UP_STAGE_MESSAGES,
  type FollowUpStageMessage,
} from '../../../lib/followUpChatbot/messages'
import {
  mapSessionQuestions,
  type ActiveFollowUpQuestion,
} from '../../../lib/followUpChatbot/questions'
import { resolvePlanningRecovery } from '../../../lib/followUpChatbot/recovery'
import { canFinalizePlanning } from '../../../lib/planningPredicates'
import type { FinalizedProject } from '../../../lib/planningWorkflow'
import type { RefState, StateSetter } from './planningEffectTypes'
import {
  getPlanningDebugSnapshot,
  PLANNING_POLLING_LIMIT,
  POLLING_INTERVAL_MS,
  sleep,
} from './planningEffectUtils'

export function usePollNextFollowUpQuestion(params: {
  enabled: boolean
  projectId: string
  currentQuestion: ActiveFollowUpQuestion | null
  canFinalizeCurrentPlanning: boolean
  isComplete: boolean
  isReadyForApproval: boolean
  isRevising: boolean
  isInitialRefreshRef: RefState<boolean>  // entry refresh 진행 중 플래그 — refresh 완료 전 폴링 차단
  isPollingRef: RefState<boolean>         // 폴링 중복 실행 방지
  isFinalizingRef: RefState<boolean>      // finalize 진행 중 플래그 — finalize와 폴링이 동시에 실행되지 않도록 막음
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
