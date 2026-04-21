'use client'

import Image from 'next/image'
import { useAnalysisPolling } from '@/features/analysis/hooks/state/useAnalysisPolling'
import { useProjectStore } from '@/store/useProjectStore'
import { LAYOUT } from './layout-constants'

export function AnalysisLoadingOverlay() {
  const projectId = useProjectStore((s) => s.projectId)
  const { isLoading } = useAnalysisPolling()

  if (!projectId || !isLoading) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center"
      style={{ top: LAYOUT.HEADER_HEIGHT }}
    >
      {/* 배경 딤 */}
      <div className="absolute inset-0 bg-brand/85" />

      {/* SVG + 스캔 */}
      <div className="relative z-10 overflow-hidden" style={{ width: 200, height: 200 }}>
        <Image
          src="/loading.svg"
          alt="분석 중"
          width={200}
          height={200}
          priority
        />
        {/* 스캔 라이트 */}
        <div
          className="pointer-events-none absolute inset-x-0 h-[70%]"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
            animation: 'scan 1.8s linear infinite',
          }}
        />
      </div>
    </div>
  )
}
