'use client'

import { useEffect } from 'react'
import type { PlanningSession } from '@/lib/types/domain'
import {
  mapSessionQuestions,
  type ActiveFollowUpQuestion,
} from '../../../lib/followUpChatbot/questions'
import type { RefState, StateSetter } from './planningEffectTypes'

/** prop으로 전달된 initialSession이 교체되면 로컬 session 상태를 동기화한다. */
export function useSyncInitialPlanningSession(params: {
  enabled: boolean
  initialSession: PlanningSession | null
  appliedSessionRef: RefState<PlanningSession | null>  // 이미 적용된 세션 — 동일 세션 재적용 방지
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
