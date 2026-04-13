'use client'

import { AiChatCard } from './AiChatCard'
import { UserChatCard } from './UserChatCard'
import { ChatInputBar } from './ChatInputBar'
import { useScrollToBottom } from './_hooks/useScrollToBottom'
import type { FollowUpChatbotViewModel } from '@/features/aiPlanning/types/chatbotViewModel'

interface Props {
  data: FollowUpChatbotViewModel
}

export function FollowUpChatbot({ data }: Props) {
  const scrollRef = useScrollToBottom([data.messages, data.currentQuestions])

  return (
    <div className="flex flex-col h-full">

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {data.messages.map((msg, i) =>
          msg.role === 'ai'
            ? <AiChatCard key={i} questions={[msg.text]} />
            : <UserChatCard key={i} answers={[msg.text]} />
        )}

        {/* AI가 연속으로 말을 걸었을 때 */}
        {!data.isSubmitting && data.currentQuestions.map((q, i) => (
          <AiChatCard key={`current-${i}`} questions={[q.question]} />
        ))}

        {data.isSubmitting && (
          <p className="px-10 py-8 text-xs text-black/30 animate-pulse">분석 중…</p>
        )}

        {data.isComplete && (
          <p className="px-10 py-8 text-xs text-black/30 text-center">
            충분한 정보를 확인했어요. 기획 결과를 확인해 보세요.
          </p>
        )}
      </div>

      {!data.isComplete && (
        <ChatInputBar
          questions={data.currentQuestions}
          answers={data.answers}
          onAnswerChange={data.onAnswerChange}
          onSubmit={data.onSubmit}
          isSubmitting={data.isSubmitting}
        />
      )}

    </div>
  )
}
