'use client'

import { ChatInterface } from './ChatInterface/index'
import { ChatInputBar } from './ChatInputBar/index'
import { useScrollToBottom } from './_hooks/useScrollToBottom'
import type { FollowUpChatbotViewModel } from '@/features/aiPlanning/types/chatbotViewModel'

interface Props {
  data: FollowUpChatbotViewModel
  topContent?: React.ReactNode
}

export function FollowUpChatbot({ data, topContent }: Props) {
  const scrollRef = useScrollToBottom([data.messages, data.currentQuestions])
  const shouldShowInput = !data.isComplete && data.currentQuestions.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* 타이틀 섹션 */}
      <div className="shrink-0 px-6 flex flex-col gap-2" style={{ paddingTop: 'clamp(24px, 2.08vw, 40px)' }}>
        <p
          className="font-medium tracking-[-0.04em] leading-[1.4] text-white"
          style={{ fontSize: 'clamp(20px, 1.46vw, 28px)' }}
        >
          AI 기획 - Chatbot
        </p>
        <p
          className="font-normal tracking-[-0.04em] leading-[1.4] text-white/60"
          style={{ fontSize: 'clamp(12px, 0.83vw, 16px)' }}
        >
          레퍼런스 영상분석을 바탕으로 질문에 답해주세요. AI가 다음 영상의 기획 방향을 제안해 드릴게요.
        </p>
      </div>
      <div className="mx-6 h-px bg-white/40 shrink-0" style={{ marginTop: 'clamp(16px, 1.25vw, 24px)' }} />
      {topContent ? (
        <div className="shrink-0 px-6 pt-6">
          {topContent}
        </div>
      ) : null}

      <ChatInterface
        messages={data.messages}
        scrollRef={scrollRef}
      />
      <div className="shrink-0 min-h-[156px]">
        {shouldShowInput ? (
          <ChatInputBar
            answer={data.answer}
            onAnswerChange={data.onAnswerChange}
            onSubmit={data.onSubmit}
            isSubmitting={data.isSubmitting}
            hasQuestions
            question={data.currentQuestions[0] ?? null}
          />
        ) : null}
      </div>
    </div>
  )
}
