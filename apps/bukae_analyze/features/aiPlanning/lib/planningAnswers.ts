import type { Pt1SlotAnswerCommand } from '@/lib/types/domain'
import type { PlanningQuestion } from '@/lib/types/domain'

export interface PlanningQuestionDraft {
  selectedValue: string | null
  customValue: string
  fieldValues: Record<string, string>
}

function trim(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function getNormalizedFieldValues(
  draft: PlanningQuestionDraft
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(draft.fieldValues).map(([key, value]) => [key, trim(value)])
  )
}

export function isQuestionAnswered(
  question: PlanningQuestion,
  draft: PlanningQuestionDraft
): boolean {
  if (question.fields.length > 0) {
    const normalizedFieldValues = getNormalizedFieldValues(draft)
    return question.fields.every((field) => {
      if (!field.required) return true
      return trim(normalizedFieldValues[field.fieldKey]).length > 0
    })
  }

  if (draft.selectedValue === 'custom') {
    return trim(draft.customValue).length > 0
  }

  return trim(draft.selectedValue).length > 0
}

export function getDraftAnswerText(
  question: PlanningQuestion,
  draft: PlanningQuestionDraft
): string {
  if (question.fields.length > 0) {
    const normalizedFieldValues = getNormalizedFieldValues(draft)
    return question.fields
      .map((field) => {
        const value = normalizedFieldValues[field.fieldKey]
        return value ? `${field.label}: ${value}` : null
      })
      .filter((value): value is string => value !== null)
      .join(' / ')
  }

  if (draft.selectedValue === 'custom') {
    return trim(draft.customValue)
  }

  const selectedOption = question.options.find((option) => {
    return option.value === draft.selectedValue || option.optionId === draft.selectedValue
  })

  return trim(selectedOption?.label ?? draft.selectedValue)
}

export function buildPt1SlotAnswerCommand(
  question: PlanningQuestion,
  draft: PlanningQuestionDraft
): Pt1SlotAnswerCommand | null {
  if (!isQuestionAnswered(question, draft)) {
    return null
  }

  if (question.fields.length > 0) {
    const normalizedFieldValues = getNormalizedFieldValues(draft)
    const summary = getDraftAnswerText(question, draft)

    return {
      questionId: question.questionId,
      questionTitle: question.title,
      slotKey: question.slotKey,
      answerType: 'form',
      message: summary,
      selectedOptionId: '',
      selectedOptionLabel: '',
      selectedOptionValue: '',
      customValue: summary,
      fieldValues: normalizedFieldValues,
    }
  }

  if (draft.selectedValue === 'custom') {
    const value = trim(draft.customValue)

    return {
      questionId: question.questionId,
      questionTitle: question.title,
      slotKey: question.slotKey,
      answerType: 'single_select_with_custom',
      message: value,
      selectedOptionId: 'custom',
      selectedOptionLabel: value,
      selectedOptionValue: value,
      customValue: value,
      fieldValues: null,
    }
  }

  const selectedOption = question.options.find((option) => {
    return option.value === draft.selectedValue || option.optionId === draft.selectedValue
  })

  if (!selectedOption) {
    return null
  }

  return {
    questionId: question.questionId,
    questionTitle: question.title,
    slotKey: question.slotKey,
    answerType: 'single_select',
    message: selectedOption.label,
    selectedOptionId: selectedOption.optionId,
    selectedOptionLabel: selectedOption.label,
    selectedOptionValue: selectedOption.value,
    customValue: null,
    fieldValues: null,
  }
}
