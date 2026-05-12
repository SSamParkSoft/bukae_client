import type { PlanningQuestion } from '@/lib/types/domain'
import {
  PlanningQuestionHeader,
  ReferenceInsightBox,
  FieldInputSection,
  OptionGrid,
  PlanningCustomTextarea,
} from './AiPlanningQuestionPrimitives'

function resolveCustomPlaceholder(question: PlanningQuestion): string {
  return question.fields.length > 0 ? '답변을 입력해 주세요.' : '직접 입력해 주세요.'
}

export function PlanningQuestionCard({
  question,
  index,
  selectedValue,
  customValue,
  fieldValues,
  onSelect,
  onCustomChange,
  onFieldChange,
  onCustomBlur,
  onFieldBlur,
}: {
  question: PlanningQuestion
  index: number
  selectedValue: string | null
  customValue: string
  fieldValues: Record<string, string>
  onSelect: (value: string) => void
  onCustomChange: (value: string) => void
  onFieldChange: (fieldKey: string, value: string) => void
  onCustomBlur: () => void
  onFieldBlur: (fieldKey: string) => void
}) {
  const allOptions = [
    ...question.options.map((option) => ({
      value: option.value || option.optionId,
      label: option.label,
    })),
    ...(question.allowCustom ? [{ value: 'custom', label: '직접 입력' }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <PlanningQuestionHeader index={index} title={question.title} question={question.question} />
      {question.referenceInsight && <ReferenceInsightBox text={question.referenceInsight} />}
      {question.fields.length > 0 ? (
        <FieldInputSection
          fields={question.fields}
          fieldValues={fieldValues}
          onFieldChange={onFieldChange}
          onFieldBlur={onFieldBlur}
        />
      ) : (
        <OptionGrid options={allOptions} selectedValue={selectedValue} onSelect={onSelect} />
      )}
      {question.allowCustom && selectedValue === 'custom' && (
        <PlanningCustomTextarea
          value={customValue}
          onChange={onCustomChange}
          onBlur={onCustomBlur}
          placeholder={resolveCustomPlaceholder(question)}
        />
      )}
    </div>
  )
}
