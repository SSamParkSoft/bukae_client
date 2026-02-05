'use client'

import { memo, useRef } from 'react'
import { Loader2 } from 'lucide-react'

export interface ProVideoUploadProps {
  onUpload?: (file: File) => Promise<void>
  isLoading?: boolean
  videoUrl?: string | null
}

export const ProVideoUpload = memo(function ProVideoUpload({
  onUpload,
  isLoading = false,
  videoUrl,
}: ProVideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpload) return

    try {
      await onUpload(file)
    } catch (error) {
      console.error('영상 업로드 오류:', error)
    } finally {
      // 같은 파일을 다시 선택할 수 있도록 input 값 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/mov,video/avi,video/quicktime,video/webm"
        onChange={handleFileChange}
        className="hidden"
        disabled={isLoading}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={`w-[160px] h-[284px] rounded-lg transition-colors flex flex-col items-center justify-center gap-2 text-white shrink-0 relative overflow-hidden ${
          isLoading
            ? 'bg-[#505050] cursor-not-allowed'
            : videoUrl
            ? 'bg-[#404040] hover:bg-[#505050]'
            : 'bg-[#606060] hover:bg-[#505050]'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span
              className="font-bold text-center text-white"
              style={{
                fontSize: '12px',
                lineHeight: '16.8px',
              }}
            >
              업로드 중...
            </span>
          </>
        ) : videoUrl ? (
          <>
            {/* 업로드된 영상 썸네일 표시 영역 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <video
                src={videoUrl}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            </div>
            {/* 오버레이 */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-[99px] h-[32px] rounded-lg bg-white/20 flex items-center justify-center gap-2">
                <span
                  className="font-bold text-center text-white"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16.8px',
                  }}
                >
                  변경하기
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
      </button>
    </div>
  )
})
