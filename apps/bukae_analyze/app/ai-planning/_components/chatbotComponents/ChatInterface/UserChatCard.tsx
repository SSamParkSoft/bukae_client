import { UserIcon } from 'lucide-react'

interface Props {
  answers: string[]
}

export function UserChatCard({ answers }: Props) {
  if (answers.length === 0) return null

  return (
    <div className="px-10 py-8 flex flex-col items-end">
      <div className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-white/45">
        <UserIcon size={13} />
      </div>
      <div className="mt-4 flex flex-col gap-4 items-end">
        {answers.map((answer, i) => (
          <p key={i} className="text-sm leading-relaxed text-white/55 text-right whitespace-pre-line">{answer}</p>
        ))}
      </div>
    </div>
  )
}
