'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { submitPt1SlotAnswer } from '@/lib/services/planning'
import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import {
  buildPt1AnswerRequests,
  getUnsavedPt1AnswerRequests,
  hasSavedAllPt1Answers,
  submitPt1AnswerRequests,
} from '../../lib/pt1AnswerRequests'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UsePt1AnswerAutoSubmissionParams {
  projectId: string
  questions: PlanningQuestion[]
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
  readyForApproval: boolean
  onSessionChange: (nextSession: PlanningSession) => void
}

function shouldReplacePlanningSessionAfterPt1Submission(
  session: PlanningSession
): boolean {
  return (
    session.clarifyingQuestions.length > 0 ||
    session.readyForApproval ||
    Boolean(session.failure)
  )
}

export function usePt1AnswerAutoSubmission({
  projectId,
  questions,
  selectedAnswers,
  customAnswers,
  fieldAnswers,
  readyForApproval,
  onSessionChange,
}: UsePt1AnswerAutoSubmissionParams) {
  const [saveStatusByQuestionId, setSaveStatusByQuestionId] = useState<Record<string, SaveStatus>>({})
  const [submittedSignatureByQuestionId, setSubmittedSignatureByQuestionId] = useState<Record<string, string>>({})
  const isSubmittingAnswersRef = useRef(false)

  const answerRequests = useMemo(() => {
    return buildPt1AnswerRequests(questions, {
      selectedAnswers,
      customAnswers,
      fieldAnswers,
    })
  }, [questions, selectedAnswers, customAnswers, fieldAnswers])

  const hasAnsweredAllQuestions =
    questions.length > 0 && answerRequests.length === questions.length
  const hasSavedAllAnswers =
    hasAnsweredAllQuestions &&
    hasSavedAllPt1Answers(answerRequests, submittedSignatureByQuestionId)
  const hasPendingSave = Object.values(saveStatusByQuestionId).some((status) => status === 'saving')
  const hasSaveError = Object.values(saveStatusByQuestionId).some((status) => status === 'error')

  useEffect(() => {
    if (!hasAnsweredAllQuestions || readyForApproval) {
      return
    }

    if (isSubmittingAnswersRef.current) {
      return
    }

    const unsavedRequests = getUnsavedPt1AnswerRequests(
      answerRequests,
      submittedSignatureByQuestionId
    )

    if (unsavedRequests.length === 0) {
      return
    }

    let cancelled = false
    isSubmittingAnswersRef.current = true

    async function submitAllAnswers() {
      const latestSession = await submitPt1AnswerRequests({
        projectId,
        requests: unsavedRequests,
        submitAnswer: submitPt1SlotAnswer,
        isCancelled: () => cancelled,
        onQuestionSaving: (questionId) => {
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'saving' }))
        },
        onQuestionSaved: (questionId, signature) => {
          setSubmittedSignatureByQuestionId((prev) => ({ ...prev, [questionId]: signature }))
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'saved' }))
        },
        onQuestionError: (questionId) => {
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'error' }))
        },
      })

      if (
        latestSession &&
        !cancelled &&
        shouldReplacePlanningSessionAfterPt1Submission(latestSession)
      ) {
        onSessionChange(latestSession)
      }
    }

    void submitAllAnswers().finally(() => {
      isSubmittingAnswersRef.current = false
    })

    return () => {
      cancelled = true
    }
  }, [
    answerRequests,
    hasAnsweredAllQuestions,
    onSessionChange,
    projectId,
    readyForApproval,
    submittedSignatureByQuestionId,
  ])

  return {
    hasSavedAllAnswers,
    hasPendingSave,
    hasSaveError,
  }
}
