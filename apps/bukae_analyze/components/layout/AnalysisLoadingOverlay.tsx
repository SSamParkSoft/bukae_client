'use client'

import { LoadingLogoBlock } from '@/components/layout/LoadingLogoBlock'
import { useAnalysisPolling } from '@/features/analysis/hooks/state/useAnalysisPolling'
import { useProjectStore } from '@/store/useProjectStore'

export function AnalysisLoadingOverlay() {
  const projectId = useProjectStore((s) => s.projectId)
  const { isLoading } = useAnalysisPolling()

  if (!projectId || !isLoading) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center pb-[8vh]">
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-black/0.3" />

      <div className="relative z-10 flex shrink-0 flex-col items-center gap-6">
        <LoadingLogoBlock size={200} />
        <p className="font-24-md text-white leading-[1.4] tracking-[-0.04em]">AI 분석중...</p>
      </div>
    </div>
  )
}
