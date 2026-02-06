/**
 * Next.js 커스텀 이미지 로더
 * 외부 이미지(알리익스프레스, 쿠팡)는 프록시를 통해 로드
 */
export default function customImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  // 외부 이미지 도메인 확인
  const isExternalImage =
    src.includes('aliexpress-media.com') ||
    src.includes('alicdn.com') ||
    src.includes('coupangcdn.com') ||
    src.includes('ads-partners.coupang.com')

  // 외부 이미지는 프록시를 통해 로드
  if (isExternalImage) {
    const params = new URLSearchParams({
      url: src,
      w: width.toString(),
      q: (quality || 75).toString(),
    })
    return `/api/media/proxy?${params.toString()}`
  }

  // 내부 이미지는 Next.js 기본 로더 사용 (원본 URL 반환)
  return src
}
