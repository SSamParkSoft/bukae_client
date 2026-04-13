'use client'

import { ChatInterface } from './ChatInterface/index'
import { ChatInputBar } from './ChatInputBar/index'
import { useScrollToBottom } from './_hooks/useScrollToBottom'
import type { FollowUpChatbotViewModel } from '@/features/aiPlanning/types/chatbotViewModel'

interface Props {
  data: FollowUpChatbotViewModel
}

export function FollowUpChatbot({ data }: Props) {
  const scrollRef = useScrollToBottom([data.messages, data.currentQuestions])

  return (
    <div className="flex flex-col h-full">
      <ChatInterface
        messages={data.messages}
        currentQuestions={data.currentQuestions}
        isSubmitting={data.isSubmitting}
        isComplete={data.isComplete}
        scrollRef={scrollRef}
      />
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
