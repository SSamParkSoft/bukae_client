'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAnalyzeWorkflowStore, type Pt1AnswerDraftCache } from '@/store/useAnalyzeWorkflowStore'

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

function hasDraftValues(draft: Pt1AnswerDraftValues): boolean {
  return (
    Object.keys(draft.selectedAnswers).length > 0 ||
    Object.keys(draft.customAnswers).length > 0 ||
    Object.keys(draft.fieldAnswers).length > 0
  )
}

export function usePt1AnswerDrafts(
  cacheKey: string | null = null,
  initialDraft: Pt1AnswerDraftCache | null = null
): Pt1AnswerDraftState {
  const getCachedPt1AnswerDraft = useAnalyzeWorkflowStore((state) => state.getCachedPt1AnswerDraft)
  const cachePt1AnswerDraft = useAnalyzeWorkflowStore((state) => state.cachePt1AnswerDraft)
  const cachedDraft = cacheKey ? getCachedPt1AnswerDraft(cacheKey) ?? initialDraft : initialDraft
  const [localDraft, setLocalDraft] = useState<LocalPt1AnswerDraftState>(() => (
    createLocalDraftState(cacheKey, cachedDraft)
  ))
  const currentDraft = (() => {
    if (localDraft.cacheKey !== cacheKey) {
      return createLocalDraftState(cacheKey, cachedDraft)
    }
    if (!hasDraftValues(localDraft) && initialDraft) {
      return createLocalDraftState(cacheKey, initialDraft)
    }

    return localDraft
  })()

  const updateCurrentDraft = useCallback((
    updater: (draft: LocalPt1AnswerDraftState) => LocalPt1AnswerDraftState
  ) => {
    setLocalDraft((prev) => {
      const baseDraft = (() => {
        if (prev.cacheKey !== cacheKey) {
          return createLocalDraftState(
            cacheKey,
            cacheKey ? getCachedPt1AnswerDraft(cacheKey) ?? initialDraft : initialDraft
          )
        }
        if (!hasDraftValues(prev) && initialDraft) {
          return createLocalDraftState(cacheKey, initialDraft)
        }

        return prev
      })()

      return updater(baseDraft)
    })
  }, [cacheKey, getCachedPt1AnswerDraft, initialDraft])

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
