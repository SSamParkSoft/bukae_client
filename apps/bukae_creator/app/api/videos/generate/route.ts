import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { requireEnvVars } from '@/lib/utils/env-validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (!envUrl) {
    throw new Error('환경 변수 NEXT_PUBLIC_API_BASE_URL이 설정되어 있지 않습니다.')
  }
  return envUrl
}

export async function POST(request: Request) {
  try {
    // 프로덕션 환경에서 필수 환경 변수 검증
    requireEnvVars()
    
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'videos:generate', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

    const body = await request.json()
    
    // 새로운 API 문서 형태 검증
    if (!body.jobType || body.jobType !== 'AUTO_CREATE_VIDEO_FROM_DATA') {
      return NextResponse.json(
        { error: 'jobType이 필요합니다. (AUTO_CREATE_VIDEO_FROM_DATA)' },
        { status: 400 }
      )
    }

    if (!body.encodingRequest) {
      return NextResponse.json(
        { error: 'encodingRequest가 필요합니다.' },
        { status: 400 }
      )
    }

    // 씬 데이터 검증
    if (!body.encodingRequest.scenes || !Array.isArray(body.encodingRequest.scenes) || body.encodingRequest.scenes.length === 0) {
      return NextResponse.json(
        { error: '씬 데이터가 필요합니다.' },
        { status: 400 }
      )
    }

    // 백엔드 API로 프록시 요청
    const API_BASE_URL = getApiBaseUrl()
    const accessToken = request.headers.get('Authorization') || ''

    const backendResponse = await fetch(`${API_BASE_URL}/api/v1/studio/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken,
      },
      body: JSON.stringify(body),
    })

    // 백엔드 응답을 그대로 전달
    const responseData = await backendResponse.json().catch(() => ({}))
    
    return NextResponse.json(
      responseData,
      { 
        status: backendResponse.status,
        headers: { 
          ...(rl.headers ?? {}),
          'Content-Type': 'application/json',
        }
      }
    )
  } catch (error) {
    const isDev = process.env.NODE_ENV === 'development'
    
    // 개발 환경에서만 상세 에러 로깅
    if (isDev) {
      console.error('영상 생성 API 오류:', error)
    }
    
    // 프로덕션에서는 내부 정보를 노출하지 않음
    return NextResponse.json(
      { 
        error: '영상 생성 중 오류가 발생했어요.',
        ...(isDev && error instanceof Error ? { message: error.message } : {}),
      },
      { status: 500 }
    )
  }
}

