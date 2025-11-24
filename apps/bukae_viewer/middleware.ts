import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 예약된 경로 목록 (이 경로들은 채널 ID로 처리하지 않음)
const RESERVED_PATHS = [
  'api',
  'viewer',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 루트 경로는 그대로 통과
  if (pathname === '/') {
    return NextResponse.next()
  }

  // API 경로는 그대로 통과
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 정적 파일 경로는 그대로 통과
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/manifest')
  ) {
    return NextResponse.next()
  }

  // 첫 번째 경로 세그먼트 추출
  const firstSegment = pathname.split('/')[1]

  // 예약된 경로인 경우 그대로 통과
  if (RESERVED_PATHS.includes(firstSegment)) {
    return NextResponse.next()
  }

  // 나머지는 채널 ID로 처리 (동적 라우팅으로 전달)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청 경로와 일치:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

