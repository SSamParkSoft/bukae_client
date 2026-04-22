import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'

interface HookCategoryItemProps {
  label: string
  value: string
  isLarge?: boolean
}

function HookCategoryItem({ label, value, isLarge }: HookCategoryItemProps) {
  return (
    <div className="flex-1 h-[clamp(160px, 1.04vw, 180px)] p-6 flex flex-col gap-4 min-w-0">
      <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white/60 shrink-0" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>{label}</p>
      <div className="flex items-center py-4 rounded-lg overflow-hidden">
        <p
          style={{ fontSize: 'clamp(20px, 1.25vw, 24px)' }}
          className={`min-w-0 text-white/80 ${
            isLarge
              ? 'font-semibold leading-[1.4] tracking-[-0.04em] text-center w-full'
              : 'font-semibold leading-[1.4] tracking-[-0.04em] text-center w-full'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export function HookOptionalFields({ data }: { data: HookAnalysisViewModel }) {
  return (
    <div className="flex backdrop-blur-[2px]">
      <HookCategoryItem label="훅 구간" value={data.durationLabel} isLarge />
      <HookCategoryItem label="오프닝 유형" value={data.openingType || '—'} />
      <HookCategoryItem label="감정 자극" value={data.emotionTrigger || '—'} />
      <HookCategoryItem label="페이싱" value={data.pacingLabel} />
    </div>
  )
}
