import { ChatInput } from './ChatInput'
import { ChatInputAttachButton } from './ChatInputAttachButton'
import { ChatInputSubmitButton } from './ChatInputSubmitButton'
import type { FollowUpQuestion } from '@/features/aiPlanning/types/chatbotViewModel'

interface Props {
  answer: string
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  hasQuestions: boolean  // AI 질문이 도착했을 때만 인풋 활성화
  question: FollowUpQuestion | null
}

function isCustomOption(label: string, value: string): boolean {
  return label.includes('직접 입력') || value.includes('직접 입력')
}

export function ChatInputBar({
  answer,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  hasQuestions,
  question,
}: Props) {
  const canInput = hasQuestions && !isSubmitting
  const canSubmit = canInput && answer.trim() !== ''
  const options = question?.options ?? []
  const hasOptions = options.length > 0
  const placeholder = question?.customPlaceholder ?? '입력'

  return (
    <div className="shrink-0 px-6 pb-[60px] pt-5 flex flex-col gap-3">
      {hasOptions ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const optionValue = option.value || option.label
            const isSelected = answer === optionValue
            const customOption = question?.allowCustom && isCustomOption(option.label, optionValue)

            return (
              <button
                key={option.optionId || optionValue}
                type="button"
                onClick={() => onAnswerChange(customOption ? '' : optionValue)}
                disabled={!canInput}
                className={[
                  'rounded-lg border px-4 py-2 font-14-md transition-colors',
                  isSelected
                    ? 'border-white/40 bg-white/20 text-white'
                    : 'border-white/15 bg-white/8 text-white/60 hover:bg-white/15 hover:text-white',
                  !canInput ? 'cursor-not-allowed opacity-40' : '',
                ].join(' ')}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div
        className="flex items-center gap-4 w-full rounded-[64px] bg-white/10 backdrop-blur-[5px]"
        style={{ paddingLeft: 'clamp(20px, 2.5vw, 48px)', paddingRight: 'clamp(20px, 2.5vw, 48px)', paddingTop: '16px', paddingBottom: '16px' }}
      >
        <ChatInput
          value={answer}
          onChange={onAnswerChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
          disabled={!canInput}
        />
        <div className="flex items-center gap-4 shrink-0">
          <ChatInputAttachButton disabled={!canInput} />
          <ChatInputSubmitButton
            onClick={onSubmit}
            disabled={!canSubmit}
          />
        </div>
      </div>
    </div>
  )
}
