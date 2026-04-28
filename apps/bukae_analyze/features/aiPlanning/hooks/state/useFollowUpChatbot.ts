'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getPlanningSession, submitPt2FreeText, finalizePlanning } from '@/lib/services/planning'
import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import { canFinalizePlanning, getActivePlanningQuestions, hasFinalizePlanningStarted } from '../../lib/planningPredicates'
import { mapTranscript } from '../../lib/planningTranscript'
import {
  getFinalizedProject,
  getStepMismatchMessage,
  waitFinalizedProject,
  type FinalizedProject,
} from '../../lib/planningWorkflow'
import type {
  FollowUpChatbotViewModel,
  FollowUpQuestion,
  ReadyBriefViewModel,
} from '../../types/chatbotViewModel'

const POLLING_INTERVAL_MS = 2000
const PLANNING_POLLING_LIMIT = 60

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

// --- Helpers ---

function mapQuestion(question: ActiveQuestion | null | undefined): FollowUpQuestion[] {
  if (!question) return []

  return [{
    questionId: question.questionId,
    question: question.question,
  }]
}

function mapSessionQuestions(session: PlanningSession | null): ActiveQuestion[] {
  return getActivePlanningQuestions(session).map(mapPlanningQuestion)
}

function mapPlanningQuestion(question: PlanningQuestion): ActiveQuestion {
  return {
    questionId: question.questionId,
    title: question.title,
    question: question.question,
    referenceInsight: question.referenceInsight,
    reasonWhyAsked: question.reasonWhyAsked,
    slotKey: question.slotKey,
  }
}

// --- Types ---

interface ActiveQuestion {
  questionId: string
  title: string
  question: string
  referenceInsight: string | null
  reasonWhyAsked: string | null
  slotKey: string
}

interface UseFollowUpChatbotParams {
  projectId: string
  initialSession: PlanningSession | null
  enabled: boolean
  onSessionChange?: (nextSession: PlanningSession) => void
}

const STAGE_MESSAGES = {
  waitingQuestion: 'AI가 PT1 답변을 바탕으로 다음 질문을 준비 중입니다.',
  reflectingAnswer: '답변을 반영하고 있습니다.',
  finalizing: '충분한 정보가 모였습니다. 최종 기획안을 정리 중입니다.',
  approving: '촬영가이드와 스크립트 생성을 준비 중입니다.',
  readyBrief: '최종 기획안 요약이 준비되었습니다. 다음 단계로 진행하면 촬영가이드와 스크립트를 생성합니다.',
  error: '진행 중 문제가 발생했습니다.',
} as const

type StageMessage = typeof STAGE_MESSAGES[keyof typeof STAGE_MESSAGES]

// --- Hook ---

export function useFollowUpChatbot({
  projectId,
  initialSession,
  enabled,
  onSessionChange,
}: UseFollowUpChatbotParams): FollowUpChatbotViewModel {
  const [session, setSession] = useState<PlanningSession | null>(initialSession)
  const [questionQueue, setQuestionQueue] = useState<ActiveQuestion[]>(() => mapSessionQuestions(initialSession))
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [readyBrief, setReadyBrief] = useState<ReadyBriefViewModel | null>(null)
  const [stageMessage, setStageMessage] = useState<StageMessage>(STAGE_MESSAGES.waitingQuestion)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingQA, setPendingQA] = useState<{ role: 'ai' | 'user'; text: string }[]>([])
  const isPollingRef = useRef(false)
  const isFinalizingRef = useRef(false)
  const isInitialRefreshRef = useRef(false)
  const refreshedProjectIdRef = useRef<string | null>(null)
  const appliedSessionRef = useRef<PlanningSession | null>(null)
  const isMountedRef = useRef(false)
  const applyFinalizedProjectRef = useRef<(finalizedProject: FinalizedProject) => void>(() => undefined)

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
    setReadyBrief({
      briefVersionId: finalizedProject.briefVersionId,
      title: finalizedProject.title,
      planningSummary: finalizedProject.planningSummary,
      status: finalizedProject.status,
    })
    setStageMessage(STAGE_MESSAGES.readyBrief)
    setIsComplete(true)
  }, [])
  applyFinalizedProjectRef.current = applyFinalizedProject

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const currentQuestion = questionQueue[0] ?? null
  const currentQuestions = useMemo(
    () => mapQuestion(currentQuestion),
    [currentQuestion]
  )
  const canFinalizeCurrentPlanning = canFinalizePlanning(session)
  const isReadyForApproval = Boolean(session?.readyForApproval)

  const messages = useMemo(() => {
    if (errorMessage) {
      return [
        ...mapTranscript(session, currentQuestion?.questionId ?? null),
        { role: 'ai' as const, text: `${STAGE_MESSAGES.error} ${errorMessage}` },
      ]
    }

    const transcript = mapTranscript(session, currentQuestion?.questionId ?? null)
    if (readyBrief) {
      return [
        ...transcript,
        {
          role: 'ai' as const,
          text: [
            readyBrief.title,
            readyBrief.planningSummary,
            STAGE_MESSAGES.readyBrief,
          ].filter(Boolean).join('\n\n'),
        },
      ]
    }

    return transcript
  }, [currentQuestion?.questionId, errorMessage, readyBrief, session])

  // --- Initial refresh ---
  useEffect(() => {
    if (!enabled) return
    if (initialSession && appliedSessionRef.current === initialSession) return

    setSession(initialSession)
    setQuestionQueue(mapSessionQuestions(initialSession))
  }, [enabled, initialSession])

  useEffect(() => {
    if (!enabled) return
    if (refreshedProjectIdRef.current === projectId) return

    refreshedProjectIdRef.current = projectId
    isInitialRefreshRef.current = true

    async function refreshPlanning() {
      try {
        const nextSession = await getPlanningSession(projectId)
        if (!isMountedRef.current) return

        applySession(nextSession)
        setQuestionQueue(mapSessionQuestions(nextSession))
        setErrorMessage(null)
      } catch (error) {
        if (!isMountedRef.current) return

        const finalizedProject = await getFinalizedProject(projectId).catch(() => null)
        if (finalizedProject) {
          applyFinalizedProjectRef.current(finalizedProject)
          return
        }

        const stepMismatchMessage = await getStepMismatchMessage(projectId)
        setErrorMessage(
          stepMismatchMessage ??
          (error instanceof Error ? error.message : '기획 상태 조회에 실패했습니다.')
        )
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
  }, [applyFinalizedProjectRef, applySession, enabled, projectId])

  // --- Polling for next question ---
  useEffect(() => {
    if (!enabled) return
    if (isInitialRefreshRef.current) return
    if ((currentQuestion && !canFinalizeCurrentPlanning) || isComplete || isFinalizingRef.current) return
    if (canFinalizeCurrentPlanning || isReadyForApproval) return
    if (isPollingRef.current) return

    let cancelled = false
    isPollingRef.current = true

    async function pollPlanning() {
      setIsSubmitting(true)
      setStageMessage(STAGE_MESSAGES.waitingQuestion)

      for (let i = 0; i < PLANNING_POLLING_LIMIT; i += 1) {
        if (cancelled) return

        try {
          const nextSession = await getPlanningSession(projectId)
          applySession(nextSession)
          const nextQuestions = mapSessionQuestions(nextSession)
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
          const finalizedProject = await getFinalizedProject(projectId).catch(() => null)
          if (finalizedProject) {
            applyFinalizedProjectRef.current(finalizedProject)
            setIsSubmitting(false)
            return
          }

          const stepMismatchMessage = await getStepMismatchMessage(projectId)
          if (stepMismatchMessage) {
            setErrorMessage(stepMismatchMessage)
            setIsSubmitting(false)
            return
          }

          setErrorMessage(error instanceof Error ? error.message : '기획 상태 조회에 실패했습니다.')
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
    applyFinalizedProjectRef,
    applySession,
    canFinalizeCurrentPlanning,
    currentQuestion,
    enabled,
    isComplete,
    isReadyForApproval,
    projectId,
  ])

  // --- Finalize ---
  useEffect(() => {
    if (!enabled) return
    if (!session) return
    if ((currentQuestion && !canFinalizeCurrentPlanning) || isComplete || isFinalizingRef.current) return
    if (!canFinalizeCurrentPlanning && !isReadyForApproval) return

    isFinalizingRef.current = true

    async function finalizeAndGenerate() {
      const activeSession = session
      if (!activeSession) return

      try {
        setIsSubmitting(true)

        if (!activeSession.readyForApproval && !hasFinalizePlanningStarted(activeSession)) {
          setStageMessage(STAGE_MESSAGES.finalizing)
          try {
            await finalizePlanning(projectId, {
              planningSessionId: activeSession.planningSessionId ?? '',
            })
          } catch (error) {
            const finalizedProject = await getFinalizedProject(projectId).catch(() => null)
            if (finalizedProject) {
              applyFinalizedProjectRef.current(finalizedProject)
              return
            }

            const stepMismatchMessage = await getStepMismatchMessage(projectId)
            throw new Error(
              stepMismatchMessage ??
              (error instanceof Error ? error.message : '최종 기획안 생성 요청에 실패했습니다.')
            )
          }
        }

        setStageMessage(STAGE_MESSAGES.approving)
        const finalizedProject = await waitFinalizedProject(projectId)

        applyFinalizedProjectRef.current(finalizedProject)
      } catch (error) {
        if (!isMountedRef.current) return
        setErrorMessage(
          error instanceof Error ? error.message : '촬영가이드 생성에 실패했습니다.'
        )
      } finally {
        if (isMountedRef.current) {
          setIsSubmitting(false)
        }
        isFinalizingRef.current = false
      }
    }

    void finalizeAndGenerate()
  }, [
    applyFinalizedProjectRef,
    canFinalizeCurrentPlanning,
    currentQuestion,
    enabled,
    isComplete,
    isReadyForApproval,
    applySession,
    projectId,
    session,
  ])

  // --- Visible messages ---
  const visibleMessages = useMemo(() => {
    const allMessages = pendingQA.length > 0 ? [...messages, ...pendingQA] : messages

    const shouldAppendStageMessage =
      !readyBrief &&
      pendingQA.length === 0 &&
      currentQuestions.length === 0 &&
      (isSubmitting || canFinalizeCurrentPlanning || isReadyForApproval)

    if (allMessages.length > 0 && shouldAppendStageMessage) {
      return [...allMessages, { role: 'ai' as const, text: stageMessage }]
    }
    if (allMessages.length > 0) return allMessages
    return [{ role: 'ai' as const, text: stageMessage }]
  }, [
    canFinalizeCurrentPlanning,
    currentQuestions.length,
    isReadyForApproval,
    isSubmitting,
    messages,
    pendingQA,
    readyBrief,
    stageMessage,
  ])

  return useMemo((): FollowUpChatbotViewModel => ({
    messages: visibleMessages,
    currentQuestions,
    readyBrief,
    answer,
    isSubmitting,
    isComplete,
    onAnswerChange: (value: string) => setAnswer(value),
    onSubmit: () => {
      const trimmedAnswer = answer.trim()
      const question = currentQuestion
      if (!enabled || !trimmedAnswer || !question || isSubmitting) return

      setAnswer('')
      setIsSubmitting(true)
      setStageMessage(STAGE_MESSAGES.reflectingAnswer)
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
          const nextQuestions = mapSessionQuestions(nextSession)
          const unresolvedNextQuestions = nextQuestions.filter((nextQuestion) => (
            nextQuestion.questionId !== question.questionId ||
            nextQuestion.question !== question.question
          ))
          setQuestionQueue((prev) => (
            unresolvedNextQuestions.length > 0 ? unresolvedNextQuestions : prev.slice(1)
          ))
          setPendingQA([])
          setErrorMessage(null)
        })
        .catch((error) => {
          setPendingQA([])
          void getFinalizedProject(projectId).then((finalizedProject) => {
            if (finalizedProject) {
              applyFinalizedProjectRef.current(finalizedProject)
              return
            }

            void getStepMismatchMessage(projectId).then((stepMismatchMessage) => {
              setErrorMessage(
                stepMismatchMessage ??
                (error instanceof Error ? error.message : '답변 전송에 실패했습니다.')
              )
            })
          }).catch(() => {
            setErrorMessage(
              error instanceof Error ? error.message : '답변 전송에 실패했습니다.'
            )
          })
        })
        .finally(() => {
          setIsSubmitting(false)
        })
    },
  }), [
    answer,
    currentQuestion,
    currentQuestions,
    enabled,
    isComplete,
    isSubmitting,
    applyFinalizedProjectRef,
    applySession,
    projectId,
    readyBrief,
    visibleMessages,
  ])
}
