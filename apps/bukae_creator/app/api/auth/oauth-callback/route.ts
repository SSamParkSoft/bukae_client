import { NextRequest, NextResponse } from 'next/server'

function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (envUrl) return envUrl
  return ''
}

/**
 * OAuth 콜백 프록시 API
 * 백엔드 OAuth 리다이렉트를 프록시하여 쿠키를 localhost 도메인에 설정
 */
export async function GET(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl()
    
    if (!API_BASE_URL) {
      return NextResponse.redirect(new URL('/login?error=API_BASE_URL이 설정되지 않았습니다.', request.url))
    }

    // 백엔드 OAuth 콜백 URL로 리다이렉트
    const { searchParams } = new URL(request.url)
    const oauthCallbackUrl = `${API_BASE_URL}/oauth/callback?${searchParams.toString()}`
    
    
    // 백엔드로 리다이렉트 (쿠키를 받기 위해)
    const response = await fetch(oauthCallbackUrl, {
      method: 'GET',
      redirect: 'manual', // 리다이렉트를 수동으로 처리
      headers: {
        Cookie: request.cookies.toString(),
      },
    })

    // 리다이렉트 응답 처리
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        // 백엔드가 리다이렉트하는 URL로 이동
        // Set-Cookie 헤더를 클라이언트로 전달
        const nextResponse = NextResponse.redirect(new URL(location, request.url))
        
        // Set-Cookie 헤더 전달
        const setCookieHeaders = response.headers.getSetCookie()
        if (setCookieHeaders && setCookieHeaders.length > 0) {
          setCookieHeaders.forEach(cookie => {
            // 도메인을 localhost로 변경
            const modifiedCookie = cookie
              .replace(/Domain=[^;]+/gi, 'Domain=localhost')
              .replace(/Secure/gi, '') // Secure 제거 (HTTP 환경)
            nextResponse.headers.append('Set-Cookie', modifiedCookie)
          })
        }
        
        return nextResponse
      }
    }

    // 리다이렉트가 아닌 경우 직접 응답
    const data = await response.text()
    return new NextResponse(data, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
      },
    })
  } catch (error) {
    console.error('[OAuth Callback Proxy] 오류:', error)
    return NextResponse.redirect(new URL('/login?error=OAuth 콜백 처리 중 오류가 발생했습니다.', request.url))
  }
}
