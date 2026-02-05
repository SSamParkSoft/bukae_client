'use client'

import { memo, useRef, useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  // 영상에서 썸네일 생성
  useEffect(() => {
    if (!videoUrl || !videoRef.current || !canvasRef.current) {
      setThumbnailUrl(null)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    const captureThumbnail = () => {
      try {
        // 비디오 크기가 유효한지 확인
        if (!video.videoWidth || !video.videoHeight) {
          console.warn('비디오 크기를 가져올 수 없습니다.')
          return
        }

        // 캔버스 크기를 비디오 크기에 맞춤
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.warn('캔버스 컨텍스트를 가져올 수 없습니다.')
          return
        }

        // 첫 프레임을 캔버스에 그리기
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // 캔버스를 이미지 URL로 변환
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
        setThumbnailUrl(thumbnail)
      } catch (error) {
        console.error('썸네일 생성 오류:', error)
        // CORS 오류인 경우 썸네일 없이 영상만 표시
        if (error instanceof Error && error.name === 'SecurityError') {
          console.warn('CORS 오류로 인해 썸네일을 생성할 수 없습니다. 영상만 표시합니다.')
        }
        setThumbnailUrl(null)
      }
    }

    // 비디오 메타데이터가 로드되면 썸네일 생성
    const handleLoadedData = () => {
      if (video.readyState >= 2) {
        // currentTime을 0.1초로 설정하여 첫 프레임 캡처
        video.currentTime = 0.1
      }
    }

    const handleSeeked = () => {
      captureThumbnail()
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('seeked', handleSeeked)

    // 이미 로드된 경우 즉시 처리
    if (video.readyState >= 2) {
      handleLoadedData()
    }

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('seeked', handleSeeked)
    }
  }, [videoUrl])

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
      {/* 숨겨진 비디오와 캔버스 - 썸네일 생성용 */}
      {videoUrl && (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className="hidden"
            muted
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
          />
          <canvas ref={canvasRef} className="hidden" />
        </>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            {/* 썸네일 또는 영상 표시 영역 */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* 썸네일 이미지 (항상 표시) */}
              {thumbnailUrl && (
                <Image
                  src={thumbnailUrl}
                  alt="영상 썸네일"
                  fill
                  className={`object-cover transition-opacity ${
                    isHovered ? 'opacity-0' : 'opacity-100'
                  }`}
                  unoptimized
                />
              )}
              {/* 호버 시 영상 표시 (썸네일 위에 오버레이) */}
              <video
                ref={(el) => {
                  if (el && isHovered) {
                    // 호버 시 영상 재생
                    el.play().catch(() => {
                      // 자동 재생 실패 시 무시
                    })
                  } else if (el && !isHovered) {
                    // 호버 해제 시 영상 일시정지
                    el.pause()
                    el.currentTime = 0
                  }
                }}
                src={videoUrl}
                className={`w-full h-full object-cover transition-opacity ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}
                muted
                playsInline
                preload="none"
                crossOrigin="anonymous"
              />
            </div>
            {/* 오버레이 - 호버 시에만 표시 */}
            <div 
              className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
            >
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
