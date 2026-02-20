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
  const imageQuality = quality ?? 75

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
      q: imageQuality.toString(),
    })
    return `/api/media/proxy?${params.toString()}`
  }

  // next/image custom loader 경고 방지를 위해 모든 URL에 width/quality를 반영
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const url = new URL(src)
      url.searchParams.set('w', width.toString())
      url.searchParams.set('q', imageQuality.toString())
      return url.toString()
    } catch {
      // URL 파싱 실패 시 fallback으로 아래 relative 처리 사용
    }
  }

  const [path, hash = ''] = src.split('#')
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}w=${width}&q=${imageQuality}${hash ? `#${hash}` : ''}`
}
