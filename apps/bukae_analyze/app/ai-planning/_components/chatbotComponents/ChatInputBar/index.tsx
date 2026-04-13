import { ChatInput } from './ChatInput'
// import { ChatInputAttachButton } from './ChatInputAttachButton'
import { ChatInputSubmitButton } from './ChatInputSubmitButton'
import type { FollowUpQuestion } from '@/features/aiPlanning/types/chatbotViewModel'

interface Props {
  questions: FollowUpQuestion[]
  answers: Record<string, string>
  onAnswerChange: (questionId: string, value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function ChatInputBar({ questions, answers, onAnswerChange, onSubmit, isSubmitting }: Props) {
  const allAnswered = questions.every(q => (answers[q.questionId] ?? '').trim() !== '')

  return (
    <div className="border-t border-black/8 px-10 py-5 flex flex-col gap-3">
      {questions.map((q, i) => (
        <div key={q.questionId} className="flex items-end gap-3">
          {questions.length > 1 && (
            <span className="text-[11px] text-black/30 mb-[3px] shrink-0">Q{i + 1}</span>
          )}
          <ChatInput
            value={answers[q.questionId] ?? ''}
            onChange={value => onAnswerChange(q.questionId, value)}
          />
          {i === questions.length - 1 && (
            <div className="flex items-center gap-2 shrink-0">
              {/* <ChatInputAttachButton /> */}
              <ChatInputSubmitButton
                onClick={onSubmit}
                disabled={!allAnswered || isSubmitting}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
