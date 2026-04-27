'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { approveBrief, listBriefs } from '@/lib/services/briefs'
import { getGeneration, startGeneration } from '@/lib/services/generations'
import { getPlanningSession, postPlanningMessage } from '@/lib/services/planning'
import {
  formatWorkflowState,
  getProjectWorkflowState,
  isPlanningStep,
} from '@/lib/services/projectWorkflowState'
import type { Brief, PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import type { FollowUpQuestion, ChatMessage, FollowUpChatbotViewModel } from '../../types/chatbotViewModel'

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
const BRIEF_POLLING_LIMIT = 90
const GENERATION_POLLING_LIMIT = 120

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

function canFinalizePlanning(session: PlanningSession | null): boolean {
  if (!session || session.clarifyingQuestions.length > 0) return false

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

function mapQuestion(question: PlanningQuestion | null | undefined): FollowUpQuestion[] {
  if (!question) return []

  return [{
    questionId: question.questionId,
    question: question.question,
  }]
}

function mapTranscript(session: PlanningSession | null): ChatMessage[] {
  if (!session) {
    return [{
      role: 'ai',
      text: 'AI가 PT1 답변을 바탕으로 다음 질문을 준비 중입니다.',
    }]
  }

  const messages = [...session.messages].sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0
    const bTime = b.createdAt?.getTime() ?? 0
    return aTime - bTime
  })

  return messages
    .map((message): ChatMessage | null => {
      const messageType = message.messageType ?? ''
      if (HIDDEN_MESSAGE_TYPES.has(messageType)) return null

      if (messageType === 'clarifying_question' || message.role === 'assistant') {
        return {
          role: 'ai',
          text: message.message,
        }
      }

      if (
        (messageType === 'free_text' || messageType === 'revision_note' || message.role === 'user') &&
        getPayloadString(message.payload, 'answer_source') === 'planning_pt2'
      ) {
        return {
          role: 'user',
          text: message.message,
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
  onGenerationCompleted: (generationRequestId: string) => void
  enabled: boolean
}

const STAGE_MESSAGES = {
  waitingQuestion: 'AI가 PT1 답변을 바탕으로 다음 질문을 준비 중입니다.',
  reflectingAnswer: '답변을 반영하고 있습니다.',
  finalizing: '충분한 정보가 모였습니다. 최종 기획안을 정리 중입니다.',
  approving: '촬영가이드와 스크립트 생성을 준비 중입니다.',
  generating: '촬영가이드와 스크립트를 생성 중입니다.',
  error: '진행 중 문제가 발생했습니다.',
} as const

type StageMessage = typeof STAGE_MESSAGES[keyof typeof STAGE_MESSAGES]

export function useFollowUpChatbot({
  projectId,
  initialSession,
  onGenerationCompleted,
  enabled,
}: UseFollowUpChatbotParams): FollowUpChatbotViewModel {
  const [session, setSession] = useState<PlanningSession | null>(initialSession)
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [stageMessage, setStageMessage] = useState<StageMessage>(STAGE_MESSAGES.waitingQuestion)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isPollingRef = useRef(false)
  const isFinalizingRef = useRef(false)

  const currentQuestion = session?.clarifyingQuestions[0] ?? null
  const currentQuestions = useMemo(
    () => mapQuestion(currentQuestion),
    [currentQuestion]
  )

  const messages = useMemo(() => {
    if (errorMessage) {
      return [
        ...mapTranscript(session),
        { role: 'ai' as const, text: `${STAGE_MESSAGES.error} ${errorMessage}` },
      ]
    }

    return mapTranscript(session)
  }, [errorMessage, session])

  useEffect(() => {
    if (!enabled) return
    setSession(initialSession)
  }, [enabled, initialSession])

  useEffect(() => {
    if (!enabled) return
    if (currentQuestion || isComplete || isFinalizingRef.current) return
    if (canFinalizePlanning(session) || session?.readyForApproval) return
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
          setSession(nextSession)

          if (nextSession.failure) {
            throw new Error(
              nextSession.failure.summary ??
              nextSession.failure.message ??
              '기획 상태 조회에 실패했습니다.'
            )
          }

          if (nextSession.clarifyingQuestions.length > 0) {
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
  }, [currentQuestion, enabled, isComplete, projectId, session])

  useEffect(() => {
    if (!enabled) return
    if (!session) return
    if (currentQuestion || isComplete || isFinalizingRef.current) return
    if (!canFinalizePlanning(session) && !session.readyForApproval) return

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
          latestSession = await postPlanningMessage(projectId, {
            message: '수집된 PT1/PT2 정보를 바탕으로 최종 기획안 생성을 시작합니다.',
            messageType: 'finalize_planning',
            payload: {
              event_type: 'finalize_planning',
              planning_session_id: activeSession.planningSessionId,
            },
          })
          setSession(latestSession)
        }

        setStageMessage(STAGE_MESSAGES.approving)
        let selectedBrief: Brief | null = null

        for (let i = 0; i < BRIEF_POLLING_LIMIT; i += 1) {
          if (cancelled) return

          const briefs = await listBriefs(projectId)
          selectedBrief = pickLatestGenerationBrief(briefs)

          if (selectedBrief) {
            break
          }

          await sleep(POLLING_INTERVAL_MS)
        }

        if (!selectedBrief) {
          throw new Error('최종 기획안 생성 시간이 초과되었습니다.')
        }

        const approvedBrief = selectedBrief.status === 'APPROVED'
          ? selectedBrief
          : await approveBrief(projectId, selectedBrief.briefVersionId)

        setStageMessage(STAGE_MESSAGES.generating)
        const startedGeneration = await startGeneration(projectId, {
          briefVersionId: approvedBrief.briefVersionId,
          generationMode: 'single',
          variantCount: 1,
        })

        let latestGeneration = startedGeneration
        for (let i = 0; i < GENERATION_POLLING_LIMIT; i += 1) {
          if (cancelled) return

          const hasFailed =
            latestGeneration.failure ||
            latestGeneration.generationStatus === 'FAILED' ||
            latestGeneration.lastErrorCode ||
            latestGeneration.lastErrorMessage

          if (hasFailed) {
            throw new Error(
              latestGeneration.failure?.summary ??
              latestGeneration.lastErrorMessage ??
              '촬영가이드 생성에 실패했습니다.'
            )
          }

          if (
            latestGeneration.generationStatus === 'COMPLETED' ||
            latestGeneration.projectStatus === 'GENERATION_COMPLETED'
          ) {
            setIsComplete(true)
            onGenerationCompleted(latestGeneration.generationRequestId)
            return
          }

          await sleep(3000)
          latestGeneration = await getGeneration(projectId, latestGeneration.generationRequestId)
        }

        throw new Error('촬영가이드/스크립트 생성 시간이 초과되었습니다.')
      } catch (error) {
        const stepMismatchMessage = await getStepMismatchMessage(projectId)
        setErrorMessage(
          stepMismatchMessage ??
          (error instanceof Error ? error.message : '촬영가이드 생성에 실패했습니다.')
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
  }, [currentQuestion, enabled, isComplete, onGenerationCompleted, projectId, session])

  const visibleMessages = useMemo(() => {
    if (messages.length > 0) return messages
    return [{ role: 'ai' as const, text: stageMessage }]
  }, [messages, stageMessage])

  return useMemo((): FollowUpChatbotViewModel => ({
    messages: visibleMessages,
    currentQuestions,
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
          setSession(nextSession)
          setErrorMessage(null)
        })
        .catch((error) => {
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
    projectId,
    session?.planningSessionId,
    visibleMessages,
  ])
}
