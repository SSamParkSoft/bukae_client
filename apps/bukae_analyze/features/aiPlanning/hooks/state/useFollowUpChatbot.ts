'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { submitPt2FreeText } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  FOLLOW_UP_STAGE_MESSAGES,
  createReadyBriefViewModel,
  mapCurrentQuestion,
  type FollowUpStageMessage,
} from '../../lib/followUpChatbot/messages'
import {
  createAnswerChatMessage,
  createQuestionChatMessage,
} from '../../lib/followUpChatbot/chatHistoryStorage'
import {
  getUnresolvedNextQuestions,
  mapSessionQuestions,
  type ActiveFollowUpQuestion,
} from '../../lib/followUpChatbot/questions'
import {
  getErrorMessage,
  resolvePlanningRecovery,
} from '../../lib/followUpChatbot/recovery'
import { canFinalizePlanning } from '../../lib/planningPredicates'
import type { FinalizedProject } from '../../lib/planningWorkflow'
import type {
  FollowUpChatbotViewModel,
  ReadyBriefViewModel,
} from '../../types/chatbotViewModel'
import { createFollowUpQuestionWorkflow } from '../../lib/followUpChatbot/workflow'
import { useFollowUpChatHistory } from './followUpChatbot/useFollowUpChatHistory'
import {
  useFinalizePlanningWhenReady,
  useMountedRef,
  usePollNextFollowUpQuestion,
  useRefreshPlanningSessionOnChatbotEntry,
  useSyncInitialPlanningSession,
} from './followUpChatbot/useFollowUpPlanningEffects'

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

  const submitCurrentAnswer = useCallback(() => {
    const trimmedAnswer = answer.trim()
    const question = currentQuestion
    if (!enabled || !trimmedAnswer || !question || isSubmitting) return

    setAnswer('')
    setIsSubmitting(true)
    setErrorMessage(null)
    setStageMessage(FOLLOW_UP_STAGE_MESSAGES.reflectingAnswer)
    appendChatMessages([
      createQuestionChatMessage(question),
      createAnswerChatMessage({
        questionId: question.questionId,
        text: trimmedAnswer,
      }),
    ])

    void submitPt2FreeText(projectId, {
      questionId: question.questionId,
      questionTitle: question.title,
      question: question.question,
      referenceInsight: question.referenceInsight,
      reasonWhyAsked: question.reasonWhyAsked,
      slotKey: question.slotKey,
      message: trimmedAnswer,
    })
      .then((nextSession) => {
        applySession(nextSession)
        const unresolvedNextQuestions = getUnresolvedNextQuestions(nextSession, question)
        setQuestionQueue((prev) => (
          unresolvedNextQuestions.length > 0 ? unresolvedNextQuestions : prev.slice(1)
        ))
        setErrorMessage(null)
      })
      .catch((error) => {
        void resolvePlanningRecovery(
          projectId,
          error,
          '답변 전송에 실패했습니다.'
        ).then((recovery) => {
          if (recovery.finalizedProject) {
            applyFinalizedProject(recovery.finalizedProject)
            return
          }

          setErrorMessage(recovery.errorMessage)
        }).catch(() => {
          setErrorMessage(getErrorMessage(error, '답변 전송에 실패했습니다.'))
        })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }, [
    answer,
    appendChatMessages,
    applyFinalizedProject,
    applySession,
    currentQuestion,
    enabled,
    isSubmitting,
    projectId,
  ])

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
