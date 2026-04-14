import type { VideoStructureViewModel } from '@/features/videoAnalysis/types/viewModel'

interface Props {
  data: VideoStructureViewModel
}

const SECTIONS: { key: keyof VideoStructureViewModel; label: string }[] = [
  { key: 'overview', label: '영상 개요' },
  { key: 'storyStructure', label: '스토리 전개 구성' },
  { key: 'editingPoints', label: '편집 및 연출 포인트' },
  { key: 'targetAudience', label: '핵심 타겟층' },
  { key: 'viralPoints', label: '바이럴 포인트' },
  { key: 'trendContext', label: '현재 트렌드 맥락' },
  { key: 'ctaStrategy', label: 'CTA 전략' },
]

export function VideoStructureTab({ data }: Props) {
  return (
    <div className="py-8 space-y-4">
      {SECTIONS.map(({ key, label }, index) => (
        <div key={key} className="rounded-xl border border-black/10 p-5">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-black/40 uppercase tracking-wider mb-2">{label}</p>
              <p className="text-sm leading-relaxed text-black/80">{data[key]}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
