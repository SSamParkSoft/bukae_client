'use client'

import type { PlanningQuestion } from '@/lib/types/domain'

function resolveInputPlaceholder(question: PlanningQuestion): string {
  if (question.fields.length > 0) {
    return '답변을 입력해 주세요.'
  }

  return '직접 입력해 주세요.'
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
      <div className="flex flex-col">
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
          {`Q${index + 1}`}
        </p>
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
          {question.title}
        </p>
        <p className="mt-1 font-medium tracking-[-0.04em] leading-[1.4] text-white/60" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
          {question.question}
        </p>
        {question.referenceInsight ? (
          <div className="backdrop-blur-[2px] border-b border-white/20 py-3 w-full">
            <p className="font-medium tracking-[-0.04em] text-white/80 leading-[1.4] line-clamp-2" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
              {question.referenceInsight}
            </p>
          </div>
        ) : null}
      </div>

      {question.fields.length > 0 ? (
        <div className="flex flex-col gap-3">
          {question.fields.map((field) => (
            <label key={field.fieldKey} className="flex flex-col gap-2">
              <span
                className="font-medium tracking-[-0.04em] text-white/80"
                style={{ fontSize: 'clamp(13px, 0.85vw, 15px)' }}
              >
                {field.label}
              </span>
              <input
                type="text"
                value={fieldValues[field.fieldKey] ?? ''}
                onChange={(event) => onFieldChange(field.fieldKey, event.target.value)}
                onBlur={() => onFieldBlur(field.fieldKey)}
                placeholder={field.placeholder || resolveInputPlaceholder(question)}
                className="w-full rounded-[8px] border border-white/20 bg-white/8 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {allOptions.map((option, optionIndex) => {
            const isSelected = selectedValue === option.value
            const letter = String.fromCharCode(97 + optionIndex)

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelect(option.value)}
                className={[
                  'backdrop-blur-[2px] flex items-center gap-4 px-6 py-3 rounded-[8px] transition-colors',
                  isSelected ? 'bg-white/32' : 'bg-white/08 hover:bg-white/15',
                ].join(' ')}
              >
                <span
                  style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}
                  className={[
                    'shrink-0 font-medium tracking-[-0.04em] leading-[1.4] whitespace-nowrap',
                    isSelected ? 'text-white' : 'text-white/40',
                  ].join(' ')}
                >
                  {letter}.
                </span>
                <span
                  style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}
                  className={[
                    'flex-1 min-w-0 font-medium tracking-[-0.04em] leading-[1.4] text-left',
                    isSelected ? 'text-white' : 'text-white/40',
                  ].join(' ')}
                >
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {question.allowCustom && selectedValue === 'custom' ? (
        <textarea
          value={customValue}
          onChange={(event) => onCustomChange(event.target.value)}
          onBlur={onCustomBlur}
          placeholder={resolveInputPlaceholder(question)}
          rows={2}
          className="w-full rounded-[8px] border border-white/40 bg-transparent px-6 py-3 text-white placeholder:text-white/35 focus:border-white/60 focus:outline-none"
        />
      ) : null}
    </div>
  )
}
