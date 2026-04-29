'use client'

import { LoadingLogoBlock } from '@/components/loading/LoadingLogoBlock'

type Props = {
  visible: boolean
}

export function AnalysisLoadingOverlay({ visible }: Props) {
  if (!visible) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center pb-[8vh]">
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/5" />

      <div className="relative z-10 flex shrink-0 flex-col items-center gap-6">
        <LoadingLogoBlock size={200} />
        <p className="font-24-md text-white">AI 분석중...</p>
      </div>
    </div>
  )
}
