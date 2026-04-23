import type { PlanningMessageRequestDto } from '@/lib/types/api'
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

export function buildSlotAnswerRequest(
  question: PlanningQuestion,
  draft: PlanningQuestionDraft
): PlanningMessageRequestDto | null {
  if (!isQuestionAnswered(question, draft)) {
    return null
  }

  if (question.fields.length > 0) {
    const normalizedFieldValues = getNormalizedFieldValues(draft)
    const summary = getDraftAnswerText(question, draft)

    return {
      message: summary,
      messageType: 'slot_answer',
      payload: {
        question_id: question.questionId,
        question_title: question.title,
        slot_key: question.slotKey,
        selected_option_id: '',
        selected_option_label: '',
        selected_option_value: '',
        custom_value: summary,
        answer_type: 'form',
        field_values: normalizedFieldValues,
        answer_source: 'planning_pt1',
      },
    }
  }

  if (draft.selectedValue === 'custom') {
    const value = trim(draft.customValue)

    return {
      message: value,
      messageType: 'slot_answer',
      payload: {
        question_id: question.questionId,
        question_title: question.title,
        slot_key: question.slotKey,
        selected_option_id: 'custom',
        selected_option_label: value,
        selected_option_value: value,
        custom_value: value,
        answer_type: 'single_select_with_custom',
        field_values: null,
        answer_source: 'planning_pt1',
      },
    }
  }

  const selectedOption = question.options.find((option) => {
    return option.value === draft.selectedValue || option.optionId === draft.selectedValue
  })

  if (!selectedOption) {
    return null
  }

  return {
    message: selectedOption.label,
    messageType: 'slot_answer',
    payload: {
      question_id: question.questionId,
      question_title: question.title,
      slot_key: question.slotKey,
      selected_option_id: selectedOption.optionId,
      selected_option_label: selectedOption.label,
      selected_option_value: selectedOption.value,
      custom_value: null,
      answer_type: 'single_select',
      field_values: null,
      answer_source: 'planning_pt1',
    },
  }
}
