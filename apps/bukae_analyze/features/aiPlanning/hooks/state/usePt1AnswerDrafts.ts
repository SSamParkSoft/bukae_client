'use client'

import { useCallback, useState } from 'react'

export interface Pt1AnswerDraftState {
  selectedAnswers: Record<string, string>
  customAnswers: Record<string, string>
  fieldAnswers: Record<string, Record<string, string>>
  selectAnswer: (questionId: string, value: string) => void
  changeCustomAnswer: (questionId: string, value: string) => void
  changeFieldAnswer: (questionId: string, fieldKey: string, value: string) => void
}

export function usePt1AnswerDrafts(): Pt1AnswerDraftState {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [fieldAnswers, setFieldAnswers] = useState<Record<string, Record<string, string>>>({})

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

  return {
    selectedAnswers,
    customAnswers,
    fieldAnswers,
    selectAnswer,
    changeCustomAnswer,
    changeFieldAnswer,
  }
}
