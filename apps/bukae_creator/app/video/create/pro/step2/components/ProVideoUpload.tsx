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
      className="w-[160px] h-[284px] rounded-lg bg-[#606060] hover:bg-[#505050] transition-colors flex flex-col items-center justify-center gap-2 text-white shrink-0 relative"
    >
      {/* 내부 프레임 (Figma의 Frame 2087331272) */}
      <div className="w-[99px] h-[32px] rounded-lg bg-white/20 flex items-center justify-center gap-2">
        {/* Plus 아이콘 */}
        <span
          className="text-xl font-bold"
          style={{
            fontSize: '24px',
            lineHeight: '24px',
          }}
        >
          +
        </span>
        {/* 텍스트 */}
        <span
          className="font-bold text-center text-white"
          style={{
            fontSize: '12px',
            lineHeight: '16.8px',
          }}
        >
          영상 업로드
        </span>
      </div>
    </button>
  )
})
