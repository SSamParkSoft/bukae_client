import { Clock, Layers2, Anchor, Scissors } from 'lucide-react'
import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="flex flex-1 items-center gap-4 min-w-0">
      <div className="shrink-0 size-16 rounded-2xl bg-white/10 backdrop-blur-[2.667px] flex items-center justify-center">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <p className="font-16-rg text-white/60">{label}</p>
        <p className="text-[clamp(20px,1.42vw,24px)] font-medium text-white">{value}</p>
      </div>
    </div>
  )
}

export function HookMetrics({ data }: { data: HookAnalysisViewModel }) {
  return (
    <div className="p-11 mt-10">
      <div className="flex flex-col gap-8">
        <div className="flex items-center">
          <MetricCard
            icon={<Clock size={32} className="text-white" />}
            label="길이"
            value={data.videoLengthLabel ?? '—'}
          />
          <MetricCard
            icon={<Layers2 size={32} className="text-white" />}
            label="총 씬 개수"
            value={data.sceneCountLabel ?? '—'}
          />
        </div>
        <div className="flex items-center">
          <MetricCard
            icon={<Anchor size={32} className="text-white" />}
            label="후킹 구간"
            value={data.hookDurationSecLabel}
          />
          <MetricCard
            icon={<Scissors size={32} className="text-white" />}
            label="평균 컷 길이"
            value={data.avgCutLengthLabel ?? '—'}
          />
        </div>
      </div>
    </div>
  )
}
