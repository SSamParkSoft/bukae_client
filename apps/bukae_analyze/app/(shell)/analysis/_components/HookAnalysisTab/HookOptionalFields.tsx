import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'

interface HookCategoryItemProps {
  label: string
  value: string
}

function HookCategoryItem({ label, value }: HookCategoryItemProps) {
  return (
    <div className="flex-1 h-[clamp(160px, 1.04vw, 180px)] px-4 py-6 flex flex-col gap-4 min-w-0">
      <p className="font-fluid-20-md text-white/60 shrink-0">{label}</p>
      <div className="flex items-center py-4 overflow-hidden">
        <p className="min-w-0 font-fluid-24-sm text-white/80 text-center w-full">
          {value}
        </p>
      </div>
    </div>
  )
}

export function HookOptionalFields({ data }: { data: HookAnalysisViewModel }) {
  return (
    <div className="flex backdrop-glass-soft">
      <HookCategoryItem label="훅 구간" value={data.durationLabel} />
      <HookCategoryItem label="오프닝 유형" value={data.openingType || '—'} />
      <HookCategoryItem label="감정 자극" value={data.emotionTrigger || '—'} />
      <HookCategoryItem label="페이싱" value={data.pacingLabel} />
    </div>
  )
}
