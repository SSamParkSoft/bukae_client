'use client'

import { useEffect } from 'react'
import { finalizePlanning } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  FOLLOW_UP_STAGE_MESSAGES,
  type FollowUpStageMessage,
} from '../../../lib/followUpChatbot/messages'
import type { ActiveFollowUpQuestion } from '../../../lib/followUpChatbot/questions'
import {
  getErrorMessage,
  resolvePlanningRecovery,
} from '../../../lib/followUpChatbot/recovery'
import { hasFinalizePlanningStarted } from '../../../lib/planningPredicates'
import { waitFinalizedProject, type FinalizedProject } from '../../../lib/planningWorkflow'
import type { RefState, StateSetter } from './planningEffectTypes'

/** 질문 큐가 소진되고 finalize 조건이 충족되면 최종 기획안을 생성·대기한다. */
export function useFinalizePlanningWhenReady(params: {
  enabled: boolean
  projectId: string
  session: PlanningSession | null
  currentQuestion: ActiveFollowUpQuestion | null
  canFinalizeCurrentPlanning: boolean
  isComplete: boolean
  isReadyForApproval: boolean
  isFinalizingRef: RefState<boolean>  // finalize 중복 실행 방지
  isMountedRef: RefState<boolean>     // unmount 후 setState 방지
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
