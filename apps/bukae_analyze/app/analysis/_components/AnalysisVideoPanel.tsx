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
    <div
      className={[
        'shrink-0 border-b border-white/10 pb-6 lg:sticky lg:top-0 lg:self-start lg:border-b-0 lg:border-r lg:border-white/10 lg:pb-10 lg:pr-6',
        className ?? '',
      ].join(' ')}
    >
      <div className="mx-auto aspect-9/16 w-full max-w-[min(100%,360px)] overflow-hidden rounded-2xl bg-black lg:max-h-[calc(100vh-7rem)] lg:max-w-none">
        <video
          className="h-full w-full object-contain"
          controls
          playsInline
          preload="metadata"
          poster={posterUrl}
          src={videoSrc}
        >
          브라우저가 비디오를 지원하지 않습니다.
        </video>
      </div>
    </div>
  )
}
