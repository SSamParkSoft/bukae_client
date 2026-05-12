'use client'

import { useEffect } from 'react'
import type { PlanningSession } from '@/lib/types/domain'
import {
  mapSessionQuestions,
  type ActiveFollowUpQuestion,
} from '../../../lib/followUpChatbot/questions'
import type { RefState, StateSetter } from './planningEffectTypes'

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
