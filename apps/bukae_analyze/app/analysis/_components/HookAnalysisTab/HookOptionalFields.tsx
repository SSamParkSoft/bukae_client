import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'

interface HookCategoryItemProps {
  label: string
  value: string
  isLarge?: boolean
}

function HookCategoryItem({ label, value, isLarge }: HookCategoryItemProps) {
  return (
    <div className="flex-1 h-[180px] bg-white/10 p-6 flex flex-col gap-4 min-w-0 mt-11">
      <p className="font-20-md text-white/60 shrink-0">{label}</p>
      <div className="flex items-center px-6 py-4 rounded-lg overflow-hidden">
        <p
          className={`min-w-0 text-white/80 ${
            isLarge
              ? 'font-32-sm leading-[1.8] text-center w-full'
              : 'font-20-md leading-[1.8] line-clamp-2 overflow-hidden text-ellipsis'
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
      <HookCategoryItem label="오프닝 유형" value={data.openingType} />
      <HookCategoryItem label="감정 자극" value={data.emotionTrigger} />
      <HookCategoryItem label="페이싱" value={data.pacingLabel} />
    </div>
  )
}
