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
      {/* 타이틀 섹션 */}
      <div className="shrink-0 px-6 pt-10 flex flex-col gap-2">
        <p className="font-28-md text-white">AI 기획 - Chatbot</p>
        <p className="font-16-rg text-white/60">
          레퍼런스 영상분석을 바탕으로 질문에 답해주세요. AI가 다음 영상의 기획 방향을 제안해 드릴게요.
        </p>
      </div>
      <div className="mx-6 mt-6 h-px bg-white/40 shrink-0" />

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
