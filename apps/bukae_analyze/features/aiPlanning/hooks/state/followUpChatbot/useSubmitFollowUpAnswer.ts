'use client'

import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { submitPt2FreeText } from '@/lib/services/planning'
import type { PlanningSession } from '@/lib/types/domain'
import {
  createAnswerChatMessage,
  createQuestionChatMessage,
} from '../../../lib/followUpChatbot/chatHistoryStorage'
import {
  FOLLOW_UP_STAGE_MESSAGES,
  type FollowUpStageMessage,
} from '../../../lib/followUpChatbot/messages'
import {
  getUnresolvedNextQuestions,
  type ActiveFollowUpQuestion,
} from '../../../lib/followUpChatbot/questions'
import {
  getErrorMessage,
  resolvePlanningRecovery,
} from '../../../lib/followUpChatbot/recovery'
import type { FinalizedProject } from '../../../lib/planningWorkflow'
import type { ChatMessage } from '../../../types/chatbotViewModel'

interface UseSubmitFollowUpAnswerParams {
  projectId: string
  enabled: boolean
  answer: string
  currentQuestion: ActiveFollowUpQuestion | null
  isSubmitting: boolean
  appendChatMessages: (messages: ChatMessage[]) => void
  applySession: (nextSession: PlanningSession) => void
  applyFinalizedProject: (finalizedProject: FinalizedProject) => void
  setAnswer: Dispatch<SetStateAction<string>>
  setQuestionQueue: Dispatch<SetStateAction<ActiveFollowUpQuestion[]>>
  setIsSubmitting: Dispatch<SetStateAction<boolean>>
  setStageMessage: Dispatch<SetStateAction<FollowUpStageMessage>>
  setErrorMessage: Dispatch<SetStateAction<string | null>>
}

/** 현재 질문에 대한 답변 제출 콜백을 반환한다. API 호출·세션 업데이트·실패 복구를 담당한다. */
export function useSubmitFollowUpAnswer({
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
}: UseSubmitFollowUpAnswerParams) {
  return useCallback(() => {
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
        return resolvePlanningRecovery(
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
    setAnswer,
    setErrorMessage,
    setIsSubmitting,
    setQuestionQueue,
    setStageMessage,
  ])
}
