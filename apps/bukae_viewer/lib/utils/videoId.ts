/**
 * YouTube URL에서 video ID를 추출하는 함수
 * 지원 형식:
 * - https://www.youtube.com/watch?v=nKpZFe-fx2Q
 * - https://youtu.be/nKpZFe-fx2Q
 * - https://www.youtube.com/embed/nKpZFe-fx2Q
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // YouTube 도메인 체크
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
      return null
    }

    // 1. watch?v= 형식: https://www.youtube.com/watch?v=nKpZFe-fx2Q
    if (urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v')
    }

    // 2. youtu.be 형식: https://youtu.be/nKpZFe-fx2Q
    if (hostname.includes('youtu.be')) {
      const pathname = urlObj.pathname.replace(/^\//, '')
      return pathname || null
    }

    // 3. embed 형식: https://www.youtube.com/embed/nKpZFe-fx2Q
    const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/)
    if (embedMatch) {
      return embedMatch[1]
    }

    return null
  } catch {
    // URL 파싱 실패 시 정규식으로 직접 추출
    // watch?v= 형식
    const watchMatch = url.match(/[?&]v=([^&]+)/)
    if (watchMatch) return watchMatch[1]

    // youtu.be 형식
    const shortMatch = url.match(/youtu\.be\/([^/?]+)/)
    if (shortMatch) return shortMatch[1]

    // embed 형식
    const embedMatch = url.match(/\/embed\/([^/?]+)/)
    if (embedMatch) return embedMatch[1]

    return null
  }
}

/**
 * URL에서 videoID를 추출하는 함수
 * 예: ?videoID=123 또는 ?videoId=123
 * 또는 YouTube URL에서 v 파라미터 추출
 */
export function getVideoIdFromUrl(
  searchParams: URLSearchParams,
  currentUrl?: string
): string | null {
  // 1. 직접 videoID 파라미터 확인
  const directVideoId = searchParams.get('videoID') || searchParams.get('videoId') || null
  if (directVideoId) return directVideoId

  // 2. 현재 URL이 YouTube URL인 경우
  if (currentUrl) {
    const youtubeId = getYouTubeVideoId(currentUrl)
    if (youtubeId) return youtubeId
  }

  return null
}

/**
 * Referer URL에서 videoID를 추출하는 함수
 * YouTube URL도 지원
 */
export function getVideoIdFromReferer(referer: string | null): string | null {
  if (!referer) return null

  // 1. YouTube URL에서 추출 시도
  const youtubeId = getYouTubeVideoId(referer)
  if (youtubeId) return youtubeId

  // 2. 일반 videoID 파라미터 확인
  try {
    const url = new URL(referer)
    return url.searchParams.get('videoID') || url.searchParams.get('videoId') || null
  } catch {
    // URL 파싱 실패 시 referer 문자열에서 직접 추출 시도
    const match = referer.match(/[?&]videoID=([^&]+)|[?&]videoId=([^&]+)/i)
    return match ? (match[1] || match[2]) : null
  }
}

/**
 * 모든 소스에서 videoID를 추출하는 통합 함수
 * 우선순위: 현재 URL > Referer
 */
export function extractVideoId(
  searchParams: URLSearchParams,
  currentUrl?: string | null,
  referer?: string | null
): {
  videoId: string | null
  source: 'url' | 'referer' | null
} {
  // 1. 현재 URL에서 videoID 추출 (YouTube URL 포함)
  const urlVideoId = getVideoIdFromUrl(searchParams, currentUrl || undefined)

  // 2. Referer에서 videoID 추출 (YouTube URL 포함)
  const refererVideoId = getVideoIdFromReferer(referer || null)

  // 3. 우선순위: 현재 URL > Referer
  if (urlVideoId) {
    return { videoId: urlVideoId, source: 'url' }
  }

  if (refererVideoId) {
    return { videoId: refererVideoId, source: 'referer' }
  }

  return { videoId: null, source: null }
}

