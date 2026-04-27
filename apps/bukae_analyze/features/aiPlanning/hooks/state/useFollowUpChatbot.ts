'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listBriefs } from '@/lib/services/briefs'
import { getPlanningSession, postPlanningMessage } from '@/lib/services/planning'
import {
  formatWorkflowState,
  getProjectWorkflowState,
  isPlanningStep,
} from '@/lib/services/projectWorkflowState'
import type { Brief, PlanningConversationMessage, PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import type {
  ChatMessage,
  FollowUpChatbotViewModel,
  FollowUpQuestion,
  ReadyBriefViewModel,
} from '../../types/chatbotViewModel'

const HIDDEN_MESSAGE_TYPES = new Set([
  'planning_summary',
  'candidate_angles',
  'system_summary',
  'refresh_request',
  'planning_workspace_entered',
  'slot_answer',
])

const POLLING_INTERVAL_MS = 2000
const PLANNING_POLLING_LIMIT = 60
// const BRIEF_POLLING_LIMIT = 90

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function getPayloadString(
  payload: Record<string, unknown> | null,
  key: string
): string | null {
  const value = payload?.[key]
  return typeof value === 'string' ? value : null
}

function isTruthyRecordValue(
  record: Record<string, unknown> | null,
  key: string
): boolean {
  return record?.[key] === true
}

function getNestedRecord(
  record: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const value = record?.[key]
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function isPt2PlanningQuestion(question: PlanningQuestion): boolean {
  const eventType = question.eventType ?? getPayloadString(question.payload, 'event_type')
  const answerSource = question.answerSource ?? getPayloadString(question.payload, 'answer_source')

  return eventType === 'pt2_question' || answerSource === 'planning_pt2'
}

function getPt2PlanningQuestions(session: PlanningSession | null): PlanningQuestion[] {
  return session?.clarifyingQuestions.filter(isPt2PlanningQuestion) ?? []
}

function hasPt2FinalizableContext(session: PlanningSession | null): boolean {
  if (!session) return false
  if (session.planningMode === 'finalize' || session.planningMode === 'revise') return true
  if (getPt2PlanningQuestions(session).length > 0) return true

  return session.messages.some((message) => {
    const eventType = getPayloadString(message.payload, 'event_type')
    const answerSource = getPayloadString(message.payload, 'answer_source')
    return (
      eventType === 'pt2_question' ||
      eventType === 'pt2_answer' ||
      answerSource === 'planning_pt2'
    )
  })
}

function canFinalizePlanning(session: PlanningSession | null): boolean {
  if (!session || getPt2PlanningQuestions(session).length > 0) return false
  if (!hasPt2FinalizableContext(session)) return false

  const surface = session.planningSurface
  const artifacts = session.planningArtifacts
  const surfaceDetailGapState = surface?.detailGapState ?? null
  const artifactDetailGapState = getNestedRecord(artifacts, 'detail_gap_state')

  return (
    surface?.readyToFinalize === true ||
    isTruthyRecordValue(artifacts, 'ready_to_finalize') ||
    isTruthyRecordValue(surfaceDetailGapState, 'is_sufficient') ||
    isTruthyRecordValue(artifactDetailGapState, 'is_sufficient')
  )
}

function mapQuestion(question: ActiveQuestion | null | undefined): FollowUpQuestion[] {
  if (!question) return []

  return [{
    questionId: question.questionId,
    question: question.question,
  }]
}

function getQuestionTextFromMessage(message: PlanningConversationMessage): string {
  const qPayload = message.payload?.question
  if (qPayload && typeof qPayload === 'object' && !Array.isArray(qPayload)) {
    const q = qPayload as Record<string, unknown>
    if (typeof q.question === 'string' && q.question.trim()) return q.question.trim()
  }
  return message.message
}

function mapTranscript(
  session: PlanningSession | null,
  currentQuestionId: string | null
): ChatMessage[] {
  if (!session) {
    return [{
      role: 'ai',
      text: 'AI가 PT1 답변을 바탕으로 다음 질문을 준비 중입니다.',
    }]
  }

  const sortedMessages = [...session.messages].sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0
    const bTime = b.createdAt?.getTime() ?? 0
    return aTime - bTime
  })

  // questionId별로 최신 clarifying_question 인덱스·messageId와 최신 답변 인덱스를 사전 계산
  const latestQuestionIndexByQId = new Map<string, number>()
  const latestQuestionMessageIdByQId = new Map<string, string | null>()
  const latestAnswerIndexByQId = new Map<string, number>()

  sortedMessages.forEach((message, index) => {
    if (message.messageType === 'clarifying_question') {
      const questionId = getPayloadString(message.payload, 'question_id')
      if (questionId) {
        latestQuestionIndexByQId.set(questionId, index)
        latestQuestionMessageIdByQId.set(questionId, message.messageId)
      }
    }

    const questionId = getPayloadString(message.payload, 'question_id')
    if (
      questionId &&
      (message.messageType === 'slot_answer' ||
        message.messageType === 'free_text' ||
        message.messageType === 'revision_note')
    ) {
      const prev = latestAnswerIndexByQId.get(questionId) ?? -1
      if (index > prev) latestAnswerIndexByQId.set(questionId, index)
    }
  })

  // 답변이 완료된 질문 ID 세트 (lastAnswer > lastQuestion)
  const answeredQuestionIds = new Set<string>()
  latestQuestionIndexByQId.forEach((qIndex, questionId) => {
    const aIndex = latestAnswerIndexByQId.get(questionId) ?? -1
    if (aIndex > qIndex) answeredQuestionIds.add(questionId)
  })

  const seenUserAnswerKeys = new Set<string>()

  return sortedMessages
    .map((message): ChatMessage | null => {
      const messageType = message.messageType ?? ''
      if (HIDDEN_MESSAGE_TYPES.has(messageType)) return null

      if (messageType === 'clarifying_question' || message.role === 'assistant') {
        const questionId = getPayloadString(message.payload, 'question_id')
        const eventType = getPayloadString(message.payload, 'event_type')

        if (messageType === 'clarifying_question' && eventType !== 'pt2_question') {
          return null
        }

        if (questionId) {
          // 같은 questionId의 최신 버전만 표시 (서버 재생성 중복 제거)
          const latestMessageId = latestQuestionMessageIdByQId.get(questionId)
          if (message.messageId !== latestMessageId) return null

          // 아직 답변하지 않은 질문은 트랜스크립트에 표시하지 않음
          // (미래 질문이 미리 렌더링되는 것 방지)
          if (!answeredQuestionIds.has(questionId)) return null

          // 현재 활성 질문은 별도 렌더링하므로 트랜스크립트에서 제외
          if (questionId === currentQuestionId) return null
        }

        return {
          role: 'ai',
          text: getQuestionTextFromMessage(message),
        }
      }

      if (
        (messageType === 'free_text' || messageType === 'revision_note' || message.role === 'user') &&
        getPayloadString(message.payload, 'answer_source') === 'planning_pt2'
      ) {
        const answerText = getPayloadString(message.payload, 'raw_answer') ?? message.message
        const questionId = getPayloadString(message.payload, 'question_id')
        const slotKey = getPayloadString(message.payload, 'slot_key')
        const dedupeScope = questionId ?? slotKey

        if (dedupeScope) {
          const answerKey = `${dedupeScope}:${answerText.trim()}`
          if (seenUserAnswerKeys.has(answerKey)) {
            return null
          }
          seenUserAnswerKeys.add(answerKey)
        }

        return {
          role: 'user',
          text: answerText,
        }
      }

      return null
    })
    .filter((message): message is ChatMessage => message !== null && message.text.trim().length > 0)
}

function pickLatestGenerationBrief(briefs: Brief[]): Brief | null {
  const candidates = briefs
    .filter((brief) => brief.status === 'REVIEW_READY' || brief.status === 'APPROVED')
    .sort((a, b) => {
      const aTime = a.createdAt?.getTime() ?? 0
      const bTime = b.createdAt?.getTime() ?? 0
      return bTime - aTime
    })

  return candidates[0] ?? null
}

async function getStepMismatchMessage(projectId: string): Promise<string | null> {
  const workflowState = await getProjectWorkflowState(projectId).catch(() => null)
  if (!workflowState || isPlanningStep(workflowState)) return null

  return `현재 프로젝트 단계가 기획 단계가 아닙니다. (${formatWorkflowState(workflowState)})`
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

interface ActiveQuestion {
  questionId: string
  title: string
  question: string
  referenceInsight: string | null
  reasonWhyAsked: string | null
  slotKey: string
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

function mapSessionQuestions(session: PlanningSession | null): ActiveQuestion[] {
  if (!session) return []

  return getPt2PlanningQuestions(session).map(mapPlanningQuestion)
}

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
  // 제출 직후 서버 응답 전까지 optimistic하게 보여줄 Q&A
  const [pendingQA, setPendingQA] = useState<ChatMessage[]>([])
  const isPollingRef = useRef(false)
  const isFinalizingRef = useRef(false)
  const appliedSessionRef = useRef<PlanningSession | null>(null)

  const applySession = useCallback((nextSession: PlanningSession) => {
    appliedSessionRef.current = nextSession
    setSession(nextSession)
    onSessionChange?.(nextSession)
  }, [onSessionChange])

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

  useEffect(() => {
    if (!enabled) return
    if (initialSession && appliedSessionRef.current === initialSession) return

    setSession(initialSession)
    setQuestionQueue(mapSessionQuestions(initialSession))
  }, [enabled, initialSession])

  useEffect(() => {
    if (!enabled) return
    if (currentQuestion || isComplete || isFinalizingRef.current) return
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
    }
  }, [applySession, canFinalizeCurrentPlanning, currentQuestion, enabled, isComplete, isReadyForApproval, projectId])

  useEffect(() => {
    if (!enabled) return
    if (!session) return
    if (currentQuestion || isComplete || isFinalizingRef.current) return
    if (!canFinalizeCurrentPlanning && !isReadyForApproval) return

    let cancelled = false
    isFinalizingRef.current = true

    async function finalizeAndGenerate() {
      const activeSession = session
      if (!activeSession) return

      try {
        setIsSubmitting(true)

        let latestSession = activeSession
        if (!latestSession.readyForApproval) {
          setStageMessage(STAGE_MESSAGES.finalizing)
          try {
            latestSession = await postPlanningMessage(projectId, {
              message: '수집된 PT1/PT2 정보를 바탕으로 최종 기획안 생성을 시작합니다.',
              messageType: 'finalize_planning',
              payload: {
                event_type: 'finalize_planning',
                planning_session_id: activeSession.planningSessionId,
              },
            })
            applySession(latestSession)
          } catch (error) {
            const stepMismatchMessage = await getStepMismatchMessage(projectId)
            throw new Error(
              stepMismatchMessage ??
              (error instanceof Error ? error.message : '최종 기획안 생성 요청에 실패했습니다.')
            )
          }
        }

        setStageMessage(STAGE_MESSAGES.approving)
        let selectedBrief: Brief | null = null

        while (!selectedBrief) {
          if (cancelled) return

          const briefs = await listBriefs(projectId)
          selectedBrief = pickLatestGenerationBrief(briefs)

          if (!selectedBrief) {
            await sleep(POLLING_INTERVAL_MS)
          }
        }

        setReadyBrief({
          briefVersionId: selectedBrief.briefVersionId,
          title: selectedBrief.title ?? '최종 기획안 요약',
          planningSummary: selectedBrief.planningSummary ?? '',
          status: selectedBrief.status,
        })
        setStageMessage(STAGE_MESSAGES.readyBrief)
        setIsComplete(true)
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : '촬영가이드 생성에 실패했습니다.'
        )
      } finally {
        setIsSubmitting(false)
        isFinalizingRef.current = false
      }
    }

    void finalizeAndGenerate()

    return () => {
      cancelled = true
    }
  }, [
    canFinalizeCurrentPlanning,
    currentQuestion,
    enabled,
    isComplete,
    isReadyForApproval,
    applySession,
    projectId,
    session,
  ])

  const visibleMessages = useMemo(() => {
    // 서버 응답 전 optimistic Q&A를 기존 트랜스크립트 뒤에 붙임
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
      // 제출 즉시 채팅에 Q&A를 추가 (서버 응답 전 optimistic UI)
      setPendingQA([
        { role: 'ai', text: question.question },
        { role: 'user', text: trimmedAnswer },
      ])

      void postPlanningMessage(projectId, {
        message: trimmedAnswer,
        messageType: 'free_text',
        payload: {
          event_type: 'pt2_answer',
          answer_source: 'planning_pt2',
          planning_session_id: session?.planningSessionId,
          question_id: question.questionId,
          question_title: question.title,
          question_text: question.question,
          reference_insight: question.referenceInsight,
          reason_why_asked: question.reasonWhyAsked,
          slot_key: question.slotKey,
          raw_answer: trimmedAnswer,
        },
      })
        .then((nextSession) => {
          applySession(nextSession)
          // 서버 응답의 PT2 질문을 우선하고, 비어 있으면 로컬 큐의 다음 질문으로 진행
          const nextQuestions = mapSessionQuestions(nextSession)
          const unresolvedNextQuestions = nextQuestions.filter((nextQuestion) => (
            nextQuestion.questionId !== question.questionId ||
            nextQuestion.question !== question.question
          ))
          setQuestionQueue((prev) => (
            unresolvedNextQuestions.length > 0 ? unresolvedNextQuestions : prev.slice(1)
          ))
          // 서버 세션에 실제 Q&A가 반영됐으므로 optimistic 데이터 제거
          setPendingQA([])
          setErrorMessage(null)
        })
        .catch((error) => {
          setPendingQA([])
          void getStepMismatchMessage(projectId).then((stepMismatchMessage) => {
            setErrorMessage(
              stepMismatchMessage ??
              (error instanceof Error ? error.message : '답변 전송에 실패했습니다.')
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
    applySession,
    projectId,
    readyBrief,
    session?.planningSessionId,
    visibleMessages,
  ])
}
