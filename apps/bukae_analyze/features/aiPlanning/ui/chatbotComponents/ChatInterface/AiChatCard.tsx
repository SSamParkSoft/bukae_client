import { MonitorIcon } from 'lucide-react'
import { ChatAvatar, ChatBubble } from './ChatCardPrimitives'

interface Props {
  questions: string[]
}

export function AiChatCard({ questions }: Props) {
  return (
    <div
      className="flex gap-4 items-start w-full"
      style={{ paddingRight: 'clamp(120px, 12.5vw, 240px)' }}
    >
      <ChatAvatar icon={
        <MonitorIcon
          className="text-white/80"
          strokeWidth={1.5}
          style={{ width: 'clamp(22px, 1.67vw, 32px)', height: 'clamp(22px, 1.67vw, 32px)' }}
        />
      } />
      <ChatBubble messages={questions} variant="ai" />
    </div>
  )
}
