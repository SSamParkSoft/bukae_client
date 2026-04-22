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
      <div className="flex flex-col px-6" style={{ gap: 'clamp(20px, 2.08vw, 40px)', paddingTop: 'clamp(20px, 2.08vw, 40px)', paddingBottom: 'clamp(20px, 2.08vw, 40px)' }}>
        {/* TODO: key={i} 안티패턴 — API 연동 시 ChatMessage에 id 필드 추가 후 key={msg.id}로 교체 */}
        {messages.map((msg, i) =>
          msg.role === 'ai'
            ? <AiChatCard key={i} questions={[msg.text]} />
            : <UserChatCard key={i} answers={[msg.text]} />
        )}

        {!isSubmitting && currentQuestions.map((q, i) => (
          <AiChatCard key={`current-${i}`} questions={[q.question]} />
        ))}

        {isSubmitting && (
          <p className="font-12-rg text-white/35 animate-pulse">분석 중…</p>
        )}

        {isComplete && (
          <p className="font-12-rg text-white/35 text-center">
            충분한 정보를 확인했어요. 기획 결과를 확인해 보세요.
          </p>
        )}
      </div>
    </div>
  )
}
