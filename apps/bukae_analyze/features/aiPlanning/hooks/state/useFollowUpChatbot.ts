'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { submitPt2FreeText } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES,
  FOLLOW_UP_STAGE_MESSAGES,
  createReadyBriefViewModel,
  mapCurrentQuestion,
  type FollowUpStageMessage,
} from '../../lib/followUpChatbot/messages'
import {
  appendUniqueChatMessages,
  createAnswerChatMessage,
  createErrorChatMessage,
  createQuestionChatMessage,
  createReadyBriefChatMessage,
  createStatusChatMessage,
  getStoredFollowUpChatHistory,
  mergeChatMessages,
  storeFollowUpChatHistory,
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
  ChatMessage,
  FollowUpChatbotViewModel,
  ReadyBriefViewModel,
} from '../../types/chatbotViewModel'
import { createFollowUpQuestionWorkflow } from '../../lib/followUpChatbot/workflow'
import {
  useFinalizePlanningWhenReady,
  useMountedRef,
  usePollNextFollowUpQuestion,
  useRefreshPlanningSessionOnChatbotEntry,
  useSyncInitialPlanningSession,
} from './followUpChatbot/useFollowUpPlanningEffects'

const FINALIZE_PROGRESS_MESSAGE_INTERVAL_MS = 20_000

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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatHistoryProjectId, setChatHistoryProjectId] = useState<string | null>(null)

  const isPollingRef = useRef(false)
  const isFinalizingRef = useRef(false)
  const isInitialRefreshRef = useRef(false)
  const refreshedProjectIdRef = useRef<string | null>(null)
  const appliedSessionRef = useRef<PlanningSession | null>(null)
  const isMountedRef = useMountedRef()
  const isCurrentChatHistoryLoaded = chatHistoryProjectId === projectId

  const applySession = useCallback((nextSession: PlanningSession) => {
    appliedSessionRef.current = nextSession
    setSession(nextSession)
    onSessionChange?.(nextSession)
  }, [onSessionChange])

  const appendChatMessages = useCallback((messages: ChatMessage[]) => {
    setChatHistory((prev) => appendUniqueChatMessages(prev, messages))
  }, [])

  const appendStatusMessage = useCallback((text: string) => {
    setChatHistory((prev) => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.kind === 'status' && lastMessage.text === text) {
        return prev
      }

      return [...prev, createStatusChatMessage(text)]
    })
  }, [])

  const appendErrorMessage = useCallback((text: string) => {
    setChatHistory((prev) => [...prev, createErrorChatMessage(text)])
  }, [])

  const applyFinalizedProject = useCallback((finalizedProject: FinalizedProject) => {
    if (!isMountedRef.current) return

    const nextReadyBrief = createReadyBriefViewModel(finalizedProject)
    setQuestionQueue([])
    setErrorMessage(null)
    setReadyBrief(nextReadyBrief)
    setStageMessage(FOLLOW_UP_STAGE_MESSAGES.readyBrief)
    setIsComplete(true)
    appendChatMessages([createReadyBriefChatMessage(nextReadyBrief)])
  }, [appendChatMessages, isMountedRef])

  const locallyAnsweredQuestionIds = useMemo(() => (
    new Set(
      chatHistory
        .filter((message) => message.kind === 'answer' && message.questionId)
        .map((message) => message.questionId as string)
    )
  ), [chatHistory])
  const currentQuestion = useMemo(() => (
    questionQueue.find((question) => !locallyAnsweredQuestionIds.has(question.questionId)) ?? null
  ), [locallyAnsweredQuestionIds, questionQueue])
  const currentQuestions = useMemo(
    () => mapCurrentQuestion(currentQuestion),
    [currentQuestion]
  )
  const canFinalizeCurrentPlanning = canFinalizePlanning(session)
  const isReadyForApproval = Boolean(session?.readyForApproval)
  const isRevising = session?.planningMode === 'revise'
  const shouldAppendProgressMessages =
    enabled &&
    isCurrentChatHistoryLoaded &&
    isSubmitting &&
    !currentQuestion &&
    !readyBrief &&
    !errorMessage &&
    (
      stageMessage === FOLLOW_UP_STAGE_MESSAGES.waitingQuestion ||
      stageMessage === FOLLOW_UP_STAGE_MESSAGES.finalizing ||
      stageMessage === FOLLOW_UP_STAGE_MESSAGES.approving
    )

  const serverTranscriptMessages = useMemo(() => (
    createFollowUpQuestionWorkflow(session).transcriptMessages
  ), [session])

  useEffect(() => {
    setChatHistory(getStoredFollowUpChatHistory(projectId))
    setChatHistoryProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded) return

    setChatHistory((prev) => (
      mergeChatMessages(prev, serverTranscriptMessages)
    ))
  }, [enabled, isCurrentChatHistoryLoaded, serverTranscriptMessages])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded) return

    storeFollowUpChatHistory(projectId, chatHistory)
  }, [chatHistory, enabled, isCurrentChatHistoryLoaded, projectId])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded || !currentQuestion) return

    appendChatMessages([createQuestionChatMessage(currentQuestion)])
  }, [appendChatMessages, currentQuestion, enabled, isCurrentChatHistoryLoaded])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded || !isSubmitting || readyBrief || errorMessage) return
    if (stageMessage === FOLLOW_UP_STAGE_MESSAGES.approving) return
    if (stageMessage === FOLLOW_UP_STAGE_MESSAGES.reflectingAnswer) return

    appendStatusMessage(stageMessage)
  }, [
    appendStatusMessage,
    enabled,
    errorMessage,
    isCurrentChatHistoryLoaded,
    isSubmitting,
    readyBrief,
    stageMessage,
  ])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded || !errorMessage) return

    appendErrorMessage(`${FOLLOW_UP_STAGE_MESSAGES.error} ${errorMessage}`)
  }, [appendErrorMessage, enabled, errorMessage, isCurrentChatHistoryLoaded])

  useEffect(() => {
    if (!shouldAppendProgressMessages) return

    let nextIndex = 0
    const firstMessage =
      FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES[nextIndex] ??
      FOLLOW_UP_STAGE_MESSAGES.approving

    appendStatusMessage(firstMessage)
    nextIndex = (nextIndex + 1) % FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES.length

    const intervalId = window.setInterval(() => {
      const nextMessage =
        FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES[nextIndex] ??
        FOLLOW_UP_STAGE_MESSAGES.approving

      appendStatusMessage(nextMessage)
      nextIndex = (nextIndex + 1) % FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES.length
    }, FINALIZE_PROGRESS_MESSAGE_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [appendStatusMessage, shouldAppendProgressMessages])

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
    messages: chatHistory,
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
    chatHistory,
  ])
}
