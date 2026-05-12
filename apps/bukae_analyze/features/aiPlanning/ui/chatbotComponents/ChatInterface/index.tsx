import { AnimatePresence, motion } from 'framer-motion'
import { AiChatCard } from './AiChatCard'
import { UserChatCard } from './UserChatCard'
import type { ChatMessage } from '@/features/aiPlanning/types/chatbotViewModel'

interface Props {
  messages: ChatMessage[]
  scrollRef: React.RefObject<HTMLDivElement | null>
}

export function ChatInterface({ messages, scrollRef }: Props) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="flex flex-col px-6" style={{ gap: 'clamp(20px, 2.08vw, 40px)', paddingTop: 'clamp(20px, 2.08vw, 40px)', paddingBottom: 'clamp(20px, 2.08vw, 40px)' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {msg.role === 'ai'
                ? <AiChatCard questions={[msg.text]} />
                : <UserChatCard answers={[msg.text]} />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
