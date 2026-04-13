import { MonitorIcon } from 'lucide-react'

interface Props {
  questions: string[]
}

export function AiChatCard({ questions }: Props) {
  return (
    <div className="px-10 py-8">
      <div className="w-7 h-7 rounded border border-black/12 flex items-center justify-center text-black/40">
        <MonitorIcon size={13} />
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {questions.map((q, i) => (
          <p key={i} className="text-sm leading-relaxed text-black/70 whitespace-pre-line">{q}</p>
        ))}
      </div>
    </div>
  )
}
