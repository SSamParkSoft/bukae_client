import { ChatInput } from './ChatInput'
import { ChatInputAttachButton } from './ChatInputAttachButton'
import { ChatInputSubmitButton } from './ChatInputSubmitButton'

interface Props {
  answer: string
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  hasQuestions: boolean  // AI 질문이 도착했을 때만 인풋 활성화
}

export function ChatInputBar({ answer, onAnswerChange, onSubmit, isSubmitting, hasQuestions }: Props) {
  const canInput = hasQuestions && !isSubmitting
  const canSubmit = canInput && answer.trim() !== ''

  return (
    <div className="shrink-0 px-6 pb-[60px] pt-5 flex flex-col gap-3">
      <div
        className="flex items-center gap-4 w-full rounded-[64px] bg-white/10 backdrop-blur-[5px]"
        style={{ paddingLeft: 'clamp(20px, 2.5vw, 48px)', paddingRight: 'clamp(20px, 2.5vw, 48px)', paddingTop: '16px', paddingBottom: '16px' }}
      >
        <ChatInput
          value={answer}
          onChange={onAnswerChange}
          onSubmit={onSubmit}
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
