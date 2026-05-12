'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { PlanningSession } from '@/lib/types/domain'
import {
  FOLLOW_UP_STAGE_MESSAGES,
  createReadyBriefViewModel,
  mapCurrentQuestion,
  type FollowUpStageMessage,
} from '../../lib/followUpChatbot/messages'
import {
  mapSessionQuestions,
  type ActiveFollowUpQuestion,
} from '../../lib/followUpChatbot/questions'
import { canFinalizePlanning } from '../../lib/planningPredicates'
import type { FinalizedProject } from '../../lib/planningWorkflow'
import type {
  FollowUpChatbotViewModel,
  ReadyBriefViewModel,
} from '../../types/chatbotViewModel'
import { createFollowUpQuestionWorkflow } from '../../lib/followUpChatbot/workflow'
import { useFinalizePlanningWhenReady } from './followUpChatbot/useFinalizePlanningWhenReady'
import { useFollowUpChatHistory } from './followUpChatbot/useFollowUpChatHistory'
import { useMountedRef } from './followUpChatbot/useMountedRef'
import { usePollNextFollowUpQuestion } from './followUpChatbot/usePollNextFollowUpQuestion'
import { useRefreshPlanningSessionOnChatbotEntry } from './followUpChatbot/useRefreshPlanningSessionOnChatbotEntry'
import { useSubmitFollowUpAnswer } from './followUpChatbot/useSubmitFollowUpAnswer'
import { useSyncInitialPlanningSession } from './followUpChatbot/useSyncInitialPlanningSession'

interface UseFollowUpChatbotParams {
  projectId: string
  initialSession: PlanningSession | null
  enabled: boolean
  onSessionChange?: (nextSession: PlanningSession) => void
}

export function useFollowUpChatbot({
  projectId,
  initialSession,
  enabled,
  onSessionChange,
}: UseFollowUpChatbotParams): FollowUpChatbotViewModel {
  const [session, setSession] = useState<PlanningSession | null>(initialSession)
  const [questionQueue, setQuestionQueue] = useState<ActiveFollowUpQuestion[]>(() => mapSessionQuestions(initialSession))
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [readyBrief, setReadyBrief] = useState<ReadyBriefViewModel | null>(null)
  const [stageMessage, setStageMessage] = useState<FollowUpStageMessage>(FOLLOW_UP_STAGE_MESSAGES.waitingQuestion)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isPollingRef = useRef(false)
  const isFinalizingRef = useRef(false)
  const isInitialRefreshRef = useRef(false)
  const refreshedProjectIdRef = useRef<string | null>(null)
  const appliedSessionRef = useRef<PlanningSession | null>(null)
  const isMountedRef = useMountedRef()

  const currentQuestion = useMemo(() => (
    questionQueue[0] ?? null
  ), [questionQueue])
  const currentQuestions = useMemo(
    () => mapCurrentQuestion(currentQuestion),
    [currentQuestion]
  )
  const canFinalizeCurrentPlanning = canFinalizePlanning(session)
  const isReadyForApproval = Boolean(session?.readyForApproval)
  const isRevising = session?.planningMode === 'revise'

  const serverTranscriptMessages = useMemo(() => (
    createFollowUpQuestionWorkflow(session).transcriptMessages
  ), [session])

  const {
    chatHistory,
    isCurrentChatHistoryLoaded,
    appendChatMessages,
    appendReadyBriefMessage,
    removeReadyBriefMessages,
  } = useFollowUpChatHistory({
    projectId,
    enabled,
    serverTranscriptMessages,
    currentQuestion,
    isSubmitting,
    readyBrief,
    errorMessage,
    stageMessage,
  })

  const applySession = useCallback((nextSession: PlanningSession) => {
    const nextQuestions = mapSessionQuestions(nextSession)

    appliedSessionRef.current = nextSession
    setSession(nextSession)
    if (nextQuestions.length > 0) {
      setIsComplete(false)
      setReadyBrief(null)
      removeReadyBriefMessages()
    }
    onSessionChange?.(nextSession)
  }, [onSessionChange, removeReadyBriefMessages])

  const applyFinalizedProject = useCallback((finalizedProject: FinalizedProject) => {
    if (!isMountedRef.current) return

    const nextReadyBrief = createReadyBriefViewModel(finalizedProject)
    setQuestionQueue([])
    setErrorMessage(null)
    setReadyBrief(nextReadyBrief)
    setStageMessage(FOLLOW_UP_STAGE_MESSAGES.readyBrief)
    setIsComplete(true)
    appendReadyBriefMessage(nextReadyBrief)
  }, [appendReadyBriefMessage, isMountedRef])

  const submitCurrentAnswer = useSubmitFollowUpAnswer({
    projectId,
    enabled,
    answer,
    currentQuestion,
    isSubmitting,
    appendChatMessages,
    applySession,
    applyFinalizedProject,
    setAnswer,
    setQuestionQueue,
    setIsSubmitting,
    setStageMessage,
    setErrorMessage,
  })

  useSyncInitialPlanningSession({
    enabled,
    initialSession,
    appliedSessionRef,
    setSession,
    setQuestionQueue,
  })

  useRefreshPlanningSessionOnChatbotEntry({
    enabled,
    projectId,
    refreshedProjectIdRef,
    isInitialRefreshRef,
    isMountedRef,
    applySession,
    applyFinalizedProject,
    setQuestionQueue,
    setErrorMessage,
  })

  usePollNextFollowUpQuestion({
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
  })

  useFinalizePlanningWhenReady({
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
  })

  return useMemo((): FollowUpChatbotViewModel => ({
    messages: isCurrentChatHistoryLoaded ? chatHistory : [],
    currentQuestions,
    readyBrief,
    answer,
    isSubmitting,
    isComplete,
    onAnswerChange: (value: string) => setAnswer(value),
    onSubmit: submitCurrentAnswer,
  }), [
    answer,
    currentQuestions,
    isComplete,
    isSubmitting,
    isCurrentChatHistoryLoaded,
    readyBrief,
    submitCurrentAnswer,
    chatHistory,
  ])
}
