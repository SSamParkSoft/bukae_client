'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { submitPt2FreeText } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  FOLLOW_UP_STAGE_MESSAGES,
  createChatbotMessages,
  createReadyBriefViewModel,
  createVisibleMessages,
  mapCurrentQuestion,
  type FollowUpStageMessage,
} from '../../lib/followUpChatbot/messages'
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
  ChatMessage,
  FollowUpChatbotViewModel,
  ReadyBriefViewModel,
} from '../../types/chatbotViewModel'
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
  const [pendingQA, setPendingQA] = useState<ChatMessage[]>([])

  const isPollingRef = useRef(false)
  const isFinalizingRef = useRef(false)
  const isInitialRefreshRef = useRef(false)
  const refreshedProjectIdRef = useRef<string | null>(null)
  const appliedSessionRef = useRef<PlanningSession | null>(null)
  const isMountedRef = useMountedRef()

  const applySession = useCallback((nextSession: PlanningSession) => {
    appliedSessionRef.current = nextSession
    setSession(nextSession)
    onSessionChange?.(nextSession)
  }, [onSessionChange])

  const applyFinalizedProject = useCallback((finalizedProject: FinalizedProject) => {
    if (!isMountedRef.current) return

    setQuestionQueue([])
    setPendingQA([])
    setErrorMessage(null)
    setReadyBrief(createReadyBriefViewModel(finalizedProject))
    setStageMessage(FOLLOW_UP_STAGE_MESSAGES.readyBrief)
    setIsComplete(true)
  }, [isMountedRef])

  const currentQuestion = questionQueue[0] ?? null
  const currentQuestions = useMemo(
    () => mapCurrentQuestion(currentQuestion),
    [currentQuestion]
  )
  const canFinalizeCurrentPlanning = canFinalizePlanning(session)
  const isReadyForApproval = Boolean(session?.readyForApproval)

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

  const messages = useMemo(() => createChatbotMessages({
    session,
    currentQuestionId: currentQuestion?.questionId ?? null,
    errorMessage,
    readyBrief,
  }), [currentQuestion?.questionId, errorMessage, readyBrief, session])

  const visibleMessages = useMemo(() => createVisibleMessages({
    messages,
    pendingQA,
    readyBrief,
    currentQuestions,
    isSubmitting,
    canFinalizeCurrentPlanning,
    isReadyForApproval,
    stageMessage,
  }), [
    canFinalizeCurrentPlanning,
    currentQuestions,
    isReadyForApproval,
    isSubmitting,
    messages,
    pendingQA,
    readyBrief,
    stageMessage,
  ])

  const submitCurrentAnswer = useCallback(() => {
    const trimmedAnswer = answer.trim()
    const question = currentQuestion
    if (!enabled || !trimmedAnswer || !question || isSubmitting) return

    setAnswer('')
    setIsSubmitting(true)
    setErrorMessage(null)
    setStageMessage(FOLLOW_UP_STAGE_MESSAGES.reflectingAnswer)
    setPendingQA([
      { role: 'ai', text: question.question },
      { role: 'user', text: trimmedAnswer },
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
        setPendingQA([])
        setErrorMessage(null)
      })
      .catch((error) => {
        setPendingQA([])
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
    applyFinalizedProject,
    applySession,
    currentQuestion,
    enabled,
    isSubmitting,
    projectId,
  ])

  return useMemo((): FollowUpChatbotViewModel => ({
    messages: visibleMessages,
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
    readyBrief,
    submitCurrentAnswer,
    visibleMessages,
  ])
}
