/**
 * Next.js 커스텀 이미지 로더
 * 외부 이미지(알리익스프레스, 쿠팡)는 프록시를 통해 로드
 * 프로필/아바타 이미지 URL은 쿼리 파라미터를 붙이지 않음 (깨짐 방지)
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

  // data URL, blob은 그대로 반환
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }

  // 프로필/아바타 이미지: w·q 쿼리 붙이면 깨지는 경우가 있으므로 URL 그대로 반환
  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const url = new URL(src)
      const host = url.hostname.toLowerCase()
      const isProfileImageHost =
        host === 'lh3.googleusercontent.com' || // Google 프로필
        host.endsWith('.googleusercontent.com') ||
        host.includes('supabase') || // Supabase Storage 등
        host === 'avatars.githubusercontent.com' ||
        host === 'platform-lookaside.fbsbx.com' // Facebook 등
      if (isProfileImageHost) {
        return src
      }
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
