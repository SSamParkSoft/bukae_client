import { Reply } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function ShootingEnvironmentPanel({ value, onChange }: Props) {
  return (
    <div
      id="shooting-environment-panel"
      role="region"
      aria-label="촬영 환경 입력"
      className="flex flex-col gap-[23px] mt-3 pl-12"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 size-12 rounded-[12px] backdrop-blur-[2px] flex items-center justify-center">
          <Reply className="size-6 text-white rotate-180" strokeWidth={1.5} aria-hidden />
        </div>
        <div className="flex flex-col">
          <span className="font-20-md text-white">촬영 환경 설정</span>
          <span className="font-16-md text-white/60">어느 환경에서 촬영을 하실 원하시나요?</span>
        </div>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="예: 집 거실 자연광, 카페 실내, 야외 공원 등"
        rows={4}
        className="w-full resize-none rounded-lg border border-white/40 bg-transparent px-6 py-4 font-16-rg text-white/80 placeholder:text-white/35 focus:border-white/60 focus:outline-none"
      />
    </div>
  )
}
