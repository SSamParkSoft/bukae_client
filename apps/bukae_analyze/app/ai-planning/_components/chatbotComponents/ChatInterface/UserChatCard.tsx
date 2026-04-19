import { UserIcon } from 'lucide-react'

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
        <div className="flex flex-col gap-4 px-8 py-4 rounded-bl-[16px] rounded-br-[16px] rounded-tl-[16px] rounded-tr-[2px] bg-white/[0.04] backdrop-blur-[5px] shadow-[0px_0px_4px_0px_rgba(255,255,255,0.1)]">
          {answers.map((answer, i) => (
            <p key={i} className="font-16-rg text-white whitespace-pre-line">{answer}</p>
          ))}
        </div>
      </div>
      <div className="shrink-0 size-[60px] rounded-full bg-white/[0.04] backdrop-blur-[2px] flex items-center justify-center">
        <UserIcon size={32} className="text-white/80" strokeWidth={1.5} />
      </div>
    </div>
  )
}
