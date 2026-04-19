import { useMemo } from 'react'
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
  // 전 문항 비어 있지 않을 때만 전송 가능
  const allAnswered = useMemo(
    () => questions.every(q => (answers[q.questionId] ?? '').trim() !== ''),
    [questions, answers],
  )

  return (
    <div className="shrink-0 px-6 py-5 flex flex-col gap-3 border-t border-white/20">
      {/* 질문마다 한 행 */}
      {questions.map((q, i) => (
        <div key={q.questionId} className="flex items-end gap-3 px-5 py-3 rounded-[12px] bg-white/[0.04] backdrop-blur-[2px] border border-white/10">
          {/* 2문항 이상일 때만 Q1, Q2 */}
          {questions.length > 1 && (
            <span className="font-12-rg text-white/35 mb-[3px] shrink-0">Q{i + 1}</span>
          )}
          <ChatInput
            value={answers[q.questionId] ?? ''}
            onChange={value => onAnswerChange(q.questionId, value)}
          />
          {/* 마지막 행에만 버튼 배치(한 번에 전체 제출)*/}
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
