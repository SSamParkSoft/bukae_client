'use client'

// 챗봇 진입 시 서버에서 최신 세션을 한 번 조회해 로컬 상태와 동기화한다.
import { useEffect } from 'react'
import { getPlanningSession } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  mapSessionQuestions,
  type ActiveFollowUpQuestion,
} from '../../../lib/followUpChatbot/questions'
import { resolvePlanningRecovery } from '../../../lib/followUpChatbot/recovery'
import type { FinalizedProject } from '../../../lib/planningWorkflow'
import type { RefState, StateSetter } from './planningEffectTypes'
import { getPlanningDebugSnapshot } from './planningEffectUtils'

export function useRefreshPlanningSessionOnChatbotEntry(params: {
  enabled: boolean
  projectId: string
  refreshedProjectIdRef: RefState<string | null>  // 이미 refresh한 projectId — 같은 프로젝트 중복 진입 방지
  isInitialRefreshRef: RefState<boolean>           // refresh 진행 중 플래그 — 폴링이 refresh와 겹치지 않도록 막음
  isMountedRef: RefState<boolean>                  // unmount 후 setState 방지
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
