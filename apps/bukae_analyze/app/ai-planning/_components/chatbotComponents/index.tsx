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
  const scrollRef = useScrollToBottom([data.exchanges, data.currentQuestions])

  return (
    <div className="flex flex-col h-full">

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {data.exchanges.map((ex, i) => (
          <div key={i} className="grid grid-cols-2 min-h-[160px]">
            <AiChatCard questions={ex.aiTexts} />
            <UserChatCard answers={ex.userAnswers} />
          </div>
        ))}

        {!data.isSubmitting && data.currentQuestions.length > 0 && (
          <div className="grid grid-cols-2 min-h-[180px]">
            <AiChatCard questions={data.currentQuestions.map(q => q.question)} />
            <UserChatCard answers={[]} />
          </div>
        )}

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
