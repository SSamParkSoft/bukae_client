'use client'

import React, { memo } from 'react'
import { Upload, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  isExporting: boolean
  onExport: () => void
}

export const ExportButton = memo(function ExportButton({
  isExporting,
  onExport,
}: ExportButtonProps) {
  return (
    <button
      onClick={onExport}
      disabled={isExporting}
      className="w-full h-9 bg-[#5e8790] text-white rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#5e8790]/90"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span 
            className="font-bold tracking-[-0.32px] text-xs"
            style={{ 
              fontSize: '12px',
              lineHeight: '16px'
            }}
          >
            제작 시작 중...
          </span>
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          <span 
            className="font-bold tracking-[-0.32px] text-xs"
            style={{ 
              fontSize: '12px',
              lineHeight: '16px'
            }}
          >
            내보내기
          </span>
        </>
      )}
    </button>
  )
})
