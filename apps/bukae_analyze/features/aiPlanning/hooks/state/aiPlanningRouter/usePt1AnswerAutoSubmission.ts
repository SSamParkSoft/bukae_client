'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/app/_hooks/useDebouncedValue'
import { resolveAppError, type ResolvedAppError } from '@/lib/errors/appError'
import { submitPt1SlotAnswer } from '@/lib/services/planning'
import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import {
  buildPt1AnswerRequests,
  getUnsavedPt1AnswerRequests,
  hasSavedAllPt1Answers,
  submitPt1AnswerRequests,
} from '../../../lib/pt1AnswerRequests'

const PT1_TEXT_ANSWER_DEBOUNCE_MS = 600

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UsePt1AnswerAutoSubmissionParams {
  projectId: string
  enabled?: boolean
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
  enabled = true,
  questions,
  selectedAnswers,
  customAnswers,
  fieldAnswers,
  readyForApproval,
  onSessionChange,
}: UsePt1AnswerAutoSubmissionParams) {
  const [saveStatusByQuestionId, setSaveStatusByQuestionId] = useState<Record<string, SaveStatus>>({})
  const [submittedSignatureByQuestionId, setSubmittedSignatureByQuestionId] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<ResolvedAppError | null>(null)
  const isSubmittingAnswersRef = useRef(false)

  const debouncedCustomAnswers = useDebouncedValue(customAnswers, PT1_TEXT_ANSWER_DEBOUNCE_MS)
  const debouncedFieldAnswers = useDebouncedValue(fieldAnswers, PT1_TEXT_ANSWER_DEBOUNCE_MS)

  const answerRequests = useMemo(() => {
    return buildPt1AnswerRequests(questions, {
      selectedAnswers,
      customAnswers: debouncedCustomAnswers,
      fieldAnswers: debouncedFieldAnswers,
    })
  }, [questions, selectedAnswers, debouncedCustomAnswers, debouncedFieldAnswers])

  const hasAnsweredAllQuestions =
    questions.length > 0 && answerRequests.length === questions.length
  const hasSavedAllAnswers =
    hasAnsweredAllQuestions &&
    hasSavedAllPt1Answers(answerRequests, submittedSignatureByQuestionId)
  const hasPendingSave = Object.values(saveStatusByQuestionId).some((status) => status === 'saving')
  const hasSaveError = Object.values(saveStatusByQuestionId).some((status) => status === 'error')

  useEffect(() => {
    if (!enabled) {
      return
    }

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
      setSaveError(null)

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
        onQuestionError: (questionId, error) => {
          setSaveStatusByQuestionId((prev) => ({ ...prev, [questionId]: 'error' }))
          setSaveError(resolveAppError(error, 'pt1_answer_save'))
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
    enabled,
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
    saveError,
  }
}
