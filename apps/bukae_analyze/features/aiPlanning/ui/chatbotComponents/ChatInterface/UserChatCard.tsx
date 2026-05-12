import { UserIcon } from 'lucide-react'
import { ChatAvatar, ChatBubble } from './ChatCardPrimitives'

interface Props {
  answers: string[]
}

export function UserChatCard({ answers }: Props) {
  if (answers.length === 0) return null

  return (
    <div
      className="flex gap-4 items-start justify-end w-full"
      style={{ paddingLeft: 'clamp(120px, 12.5vw, 240px)' }}
    >
      <div className="flex-1 flex flex-col items-end min-w-0">
        <ChatBubble messages={answers} variant="user" />
      </div>
      <ChatAvatar icon={
        <UserIcon
          className="text-white/80"
          strokeWidth={1.5}
          style={{ width: 'clamp(22px, 1.67vw, 32px)', height: 'clamp(22px, 1.67vw, 32px)' }}
        />
      } />
    </div>
  )
}
