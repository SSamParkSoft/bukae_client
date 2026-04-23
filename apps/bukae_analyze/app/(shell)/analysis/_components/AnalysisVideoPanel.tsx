'use client'

type Props = {
  posterUrl: string
  videoSrc: string
  className?: string
}

/**
 * 분석 페이지 왼쪽 영역 — 탭바와 같은 행에서 시작(상위 그리드에서 배치)
 */
export function AnalysisVideoPanel({ posterUrl, videoSrc, className }: Props) {
  return (
    <div className={['shrink-0', className ?? ''].join(' ')}>
      <div className="h-[572px] w-[321.75px] overflow-hidden rounded-2xl bg-black">
        <video
          className="h-full w-full object-cover"
          controls
          controlsList="nodownload"
          disablePictureInPicture
          playsInline
          preload="metadata"
          poster={posterUrl}
          src={videoSrc || undefined}
          onContextMenu={(e) => e.preventDefault()}
        >
          브라우저가 비디오를 지원하지 않습니다.
        </video>
      </div>
    </div>
  )
}
