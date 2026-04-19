import { MonitorIcon } from 'lucide-react'

interface Props {
  questions: string[]
}

export function AiChatCard({ questions }: Props) {
  return (
    <div
      className="flex gap-4 items-start w-full"
      style={{ paddingRight: 'clamp(120px, 12.5vw, 240px)' }}
    >
      <div className="shrink-0 size-[60px] rounded-full bg-white/[0.04] backdrop-blur-[2px] flex items-center justify-center">
        <MonitorIcon size={32} className="text-white/80" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-6 px-8 py-4 rounded-bl-[16px] rounded-br-[16px] rounded-tl-[2px] rounded-tr-[16px]">
        {questions.map((q, i) => (
          <p key={i} className="font-16-rg text-white/80 whitespace-pre-line">{q}</p>
        ))}
      </div>
    </div>
  )
}
