import { AiChatCard } from './AiChatCard'
import { UserChatCard } from './UserChatCard'
import type { ChatMessage, FollowUpQuestion } from '@/features/aiPlanning/types/chatbotViewModel'

interface Props {
  messages: ChatMessage[]
  currentQuestions: FollowUpQuestion[]
  isSubmitting: boolean
  isComplete: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
}

export function ChatInterface({ messages, currentQuestions, isSubmitting, isComplete, scrollRef }: Props) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {messages.map((msg, i) =>
        msg.role === 'ai'
          ? <AiChatCard key={i} questions={[msg.text]} />
          : <UserChatCard key={i} answers={[msg.text]} />
      )}

      {!isSubmitting && currentQuestions.map((q, i) => (
        <AiChatCard key={`current-${i}`} questions={[q.question]} />
      ))}

      {isSubmitting && (
        <p className="px-10 py-8 text-xs text-black/30 animate-pulse">분석 중…</p>
      )}

      {isComplete && (
        <p className="px-10 py-8 text-xs text-black/30 text-center">
          충분한 정보를 확인했어요. 기획 결과를 확인해 보세요.
        </p>
      )}
    </div>
  )
}
