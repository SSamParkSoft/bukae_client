'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'

export interface Pt1AnswerDraftState {
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
  selectAnswer: (questionId: string, value: string) => void
  changeCustomAnswer: (questionId: string, value: string) => void
  changeFieldAnswer: (questionId: string, fieldKey: string, value: string) => void
}

export function usePt1AnswerDrafts(cacheKey: string | null = null): Pt1AnswerDraftState {
  const getCachedPt1AnswerDraft = useAnalyzeWorkflowStore((state) => state.getCachedPt1AnswerDraft)
  const cachePt1AnswerDraft = useAnalyzeWorkflowStore((state) => state.cachePt1AnswerDraft)
  const cachedDraft = cacheKey ? getCachedPt1AnswerDraft(cacheKey) : null
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(() => cachedDraft?.selectedAnswers ?? {})
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>(() => cachedDraft?.customAnswers ?? {})
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, Record<string, string>>>(() => cachedDraft?.fieldAnswers ?? {})

  const selectAnswer = useCallback((questionId: string, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: value }))
    if (value !== 'custom') {
      setCustomAnswers((prev) => ({ ...prev, [questionId]: '' }))
    }
  }, [])

  const changeCustomAnswer = useCallback((questionId: string, value: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: 'custom' }))
    setCustomAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  const changeFieldAnswer = useCallback((
    questionId: string,
    fieldKey: string,
    value: string
  ) => {
    setFieldAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] ?? {}),
        [fieldKey]: value,
      },
    }))
  }, [])

  useEffect(() => {
    if (!cacheKey) return

    cachePt1AnswerDraft(cacheKey, {
      selectedAnswers,
      customAnswers,
      fieldAnswers,
    })
  }, [
    cacheKey,
    cachePt1AnswerDraft,
    customAnswers,
    fieldAnswers,
    selectedAnswers,
  ])

  return {
    selectedAnswers,
    customAnswers,
    fieldAnswers,
    selectAnswer,
    changeCustomAnswer,
    changeFieldAnswer,
  }
}
