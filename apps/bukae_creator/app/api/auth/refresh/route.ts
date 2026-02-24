import { NextRequest, NextResponse } from 'next/server'

function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (envUrl) return envUrl
  return ''
}

/**
 * Refresh Token 프록시 API
 * 로컬 개발 환경에서 크로스 오리진 쿠키 전달 문제를 해결하기 위해 Next.js 서버를 통해 백엔드 API를 프록시
 * 로컬: HTTP → HTTPS 크로스 오리진 쿠키 문제 해결
 * 프로덕션: 직접 호출 (같은 HTTPS 도메인)
 */
export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl()
    
    if (!API_BASE_URL) {
      return NextResponse.json(
        { error: 'API_BASE_URL이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const refreshUrl = `${API_BASE_URL}/api/v1/auth/refresh`
    
    // 요청에서 쿠키 가져오기
    const cookies = request.cookies.getAll()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    
    // refreshToken 관련 쿠키 찾기 (정확한 이름만 매칭)
    const _refreshTokenCookies = cookies.filter(c => {
      const name = c.name.toLowerCase()
      return name === 'refresh_token' || name === 'refreshtoken'
    })
    
    
    // 백엔드로 프록시 요청
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    })
    
    // 응답 데이터 가져오기
    const data = await response.json().catch(() => null)
    
    // 응답 헤더에서 Set-Cookie 가져오기
    const setCookieHeaders = response.headers.getSetCookie()
    
    // Next.js 응답 생성
    const nextResponse = NextResponse.json(data, {
      status: response.status,
    })
    
    // Set-Cookie 헤더 전달 (백엔드에서 설정한 쿠키를 클라이언트로 전달)
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie)
      })
    }
    
    // CORS 헤더 추가
    nextResponse.headers.set('Access-Control-Allow-Origin', '*')
    nextResponse.headers.set('Access-Control-Allow-Credentials', 'true')
    
    return nextResponse
  } catch (error) {
    console.error('[Refresh Proxy] 오류:', error)
    return NextResponse.json(
      { error: '리프레시 요청 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
