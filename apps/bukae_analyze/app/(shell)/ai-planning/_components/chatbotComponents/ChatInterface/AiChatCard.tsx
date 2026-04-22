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
      <div
        className="shrink-0 rounded-full bg-white/4 backdrop-blur-[2px] flex items-center justify-center"
        style={{ width: 'clamp(44px, 3.125vw, 60px)', height: 'clamp(44px, 3.125vw, 60px)' }}
      >
        <MonitorIcon
          className="text-white/80"
          strokeWidth={1.5}
          style={{ width: 'clamp(22px, 1.67vw, 32px)', height: 'clamp(22px, 1.67vw, 32px)' }}
        />
      </div>
      <div
        className="flex flex-col gap-6 py-4 rounded-bl-[16px] rounded-br-[16px] rounded-tl-[2px] rounded-tr-[16px]"
        style={{ paddingLeft: 'clamp(16px, 1.67vw, 32px)', paddingRight: 'clamp(16px, 1.67vw, 32px)' }}
      >
        {questions.map((q, i) => (
          <p
            key={i}
            className="font-normal tracking-[-0.04em] leading-[1.4] text-white/80 whitespace-pre-line"
            style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}
          >
            {q}
          </p>
        ))}
      </div>
    </div>
  )
}
