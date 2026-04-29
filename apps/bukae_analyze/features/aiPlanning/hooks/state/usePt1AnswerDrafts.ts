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

interface Pt1AnswerDraftValues {
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
}

interface LocalPt1AnswerDraftState extends Pt1AnswerDraftValues {
  cacheKey: string | null
}

function createLocalDraftState(
  cacheKey: string | null,
  cachedDraft: Pt1AnswerDraftValues | null
): LocalPt1AnswerDraftState {
  return {
    cacheKey,
    selectedAnswers: cachedDraft?.selectedAnswers ?? {},
    customAnswers: cachedDraft?.customAnswers ?? {},
    fieldAnswers: cachedDraft?.fieldAnswers ?? {},
  }
}

export function usePt1AnswerDrafts(cacheKey: string | null = null): Pt1AnswerDraftState {
  const getCachedPt1AnswerDraft = useAnalyzeWorkflowStore((state) => state.getCachedPt1AnswerDraft)
  const cachePt1AnswerDraft = useAnalyzeWorkflowStore((state) => state.cachePt1AnswerDraft)
  const cachedDraft = cacheKey ? getCachedPt1AnswerDraft(cacheKey) : null
  const [localDraft, setLocalDraft] = useState<LocalPt1AnswerDraftState>(() => (
    createLocalDraftState(cacheKey, cachedDraft)
  ))
  const currentDraft = localDraft.cacheKey === cacheKey
    ? localDraft
    : createLocalDraftState(cacheKey, cachedDraft)

  const updateCurrentDraft = useCallback((
    updater: (draft: LocalPt1AnswerDraftState) => LocalPt1AnswerDraftState
  ) => {
    setLocalDraft((prev) => updater(
      prev.cacheKey === cacheKey
        ? prev
        : createLocalDraftState(
          cacheKey,
          cacheKey ? getCachedPt1AnswerDraft(cacheKey) : null
        )
    ))
  }, [cacheKey, getCachedPt1AnswerDraft])

  const selectAnswer = useCallback((questionId: string, value: string) => {
    updateCurrentDraft((prev) => ({
      ...prev,
      selectedAnswers: { ...prev.selectedAnswers, [questionId]: value },
      customAnswers: value !== 'custom'
        ? { ...prev.customAnswers, [questionId]: '' }
        : prev.customAnswers,
    }))
  }, [updateCurrentDraft])

  const changeCustomAnswer = useCallback((questionId: string, value: string) => {
    updateCurrentDraft((prev) => ({
      ...prev,
      selectedAnswers: { ...prev.selectedAnswers, [questionId]: 'custom' },
      customAnswers: { ...prev.customAnswers, [questionId]: value },
    }))
  }, [updateCurrentDraft])

  const changeFieldAnswer = useCallback((
    questionId: string,
    fieldKey: string,
    value: string
  ) => {
    updateCurrentDraft((prev) => ({
      ...prev,
      fieldAnswers: {
        ...prev.fieldAnswers,
        [questionId]: {
          ...(prev.fieldAnswers[questionId] ?? {}),
          [fieldKey]: value,
        },
      },
    }))
  }, [updateCurrentDraft])

  useEffect(() => {
    if (!cacheKey) return

    cachePt1AnswerDraft(cacheKey, {
      selectedAnswers: currentDraft.selectedAnswers,
      customAnswers: currentDraft.customAnswers,
      fieldAnswers: currentDraft.fieldAnswers,
    })
  }, [
    cacheKey,
    cachePt1AnswerDraft,
    currentDraft.customAnswers,
    currentDraft.fieldAnswers,
    currentDraft.selectedAnswers,
  ])

  return {
    selectedAnswers: currentDraft.selectedAnswers,
    customAnswers: currentDraft.customAnswers,
    fieldAnswers: currentDraft.fieldAnswers,
    selectAnswer,
    changeCustomAnswer,
    changeFieldAnswer,
  }
}
