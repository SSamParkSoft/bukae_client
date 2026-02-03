'use client'

import { memo } from 'react'

export interface ProVideoUploadProps {
  onUpload?: () => void
}

export const ProVideoUpload = memo(function ProVideoUpload({
  onUpload,
}: ProVideoUploadProps) {
  return (
    <button
      type="button"
      onClick={onUpload}
      className="w-20 h-20 sm:w-[120px] sm:h-[120px] rounded-lg overflow-hidden bg-[#606060] hover:bg-[#404040] transition-colors flex flex-col items-center justify-center gap-1.5 text-text-tertiary shrink-0"
    >
      <span
        className="font-bold text-white rounded-lg px-2 py-1 bg-white/20"
        style={{
          fontSize: 'var(--font-size-14)',
          lineHeight: 'var(--line-height-14-140)',
        }}
      >
        + 영상 업로드
      </span>
    </button>
  )
})
