'use client'

import { LoadingLogoBlock } from '@/components/loading/LoadingLogoBlock'

type Props = {
  visible: boolean
  label?: string
  percent?: number | null
  stageLabel?: string | null
}

export function AnalysisLoadingOverlay({
  visible,
  label = 'AI 분석중...',
  percent,
  stageLabel,
}: Props) {
  if (!visible) return null

  const progressLabel = typeof percent === 'number' ? `${percent}%` : null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center pb-[8vh]">
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/5" />

      <div className="relative z-10 flex shrink-0 flex-col items-center gap-6">
        <LoadingLogoBlock size={200} />
        <div className="flex max-w-[520px] flex-col items-center gap-3 text-center">
          <p className="font-24-md text-white">
            {progressLabel ? `${label} ${progressLabel}` : label}
          </p>
          {stageLabel ? (
            <p className="font-16-rg leading-6 text-white/60">{stageLabel}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
