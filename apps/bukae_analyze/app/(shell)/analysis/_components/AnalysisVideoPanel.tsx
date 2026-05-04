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
  const hasVideo = videoSrc.trim().length > 0
  const hasPoster = posterUrl.trim().length > 0
  const missingMediaMessage = !hasVideo && !hasPoster
    ? '분석 영상과 썸네일 이미지를 불러오지 못했습니다.'
    : !hasVideo
      ? '분석 영상 파일을 불러오지 못했습니다.'
      : !hasPoster
        ? '썸네일 이미지를 불러오지 못했습니다.'
        : null

  return (
    <div className={['shrink-0', className ?? ''].join(' ')}>
      <div className="relative h-[572px] w-[321.75px] overflow-hidden rounded-2xl bg-black">
        {hasVideo ? (
          <video
            className="h-full w-full object-cover"
            controls
            controlsList="nodownload"
            disablePictureInPicture
            playsInline
            preload="metadata"
            poster={hasPoster ? posterUrl : undefined}
            src={videoSrc}
            onContextMenu={(e) => e.preventDefault()}
          >
            브라우저가 비디오를 지원하지 않습니다.
          </video>
        ) : hasPoster ? (
          <div
            role="img"
            aria-label="분석 영상 썸네일"
            className="h-full w-full object-cover"
            style={{
              backgroundImage: `url("${posterUrl.replaceAll('"', '\\"')}")`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          />
        ) : (
          <div className="h-full w-full bg-white/[0.03]" />
        )}

        {missingMediaMessage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55 px-8 text-center">
            <p className="font-14-rg leading-[1.5] text-white/70">
              {missingMediaMessage}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
