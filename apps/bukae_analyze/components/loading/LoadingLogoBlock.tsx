type LoadingLogoBlockProps = {
  /** 한 변 길이(px) — Overlay 200, 패널 140 등 */
  size: number
}

/**
 * 로딩 로고 + 세로 스캔: 하이라이트 레이어만 loading.svg로 mask → 사각 빔 없이 실루엣만 밝아짐.
 * (이미지에 mask 적용 X — WebKit img+mask 잘림 이슈 회피)
 */
export function LoadingLogoBlock({ size }: LoadingLogoBlockProps) {
  const s = `${size}px`
  return (
    <div className="relative isolate shrink-0" style={{ width: s, height: s }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/loading.svg"
        alt="분석 중"
        width={size}
        height={size}
        decoding="async"
        draggable={false}
        className="loading-logo-base relative z-0 block h-full w-full max-h-none object-contain"
      />
      <div className="loading-logo-sweep-layer pointer-events-none absolute inset-0 z-1" aria-hidden>
        <div className="loading-scan-beam absolute inset-x-0 top-0 h-[58%] origin-top" />
      </div>
    </div>
  )
}
