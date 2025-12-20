import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080').trim()
}

export async function POST(request: Request) {
  try {
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
    
    console.log('=== 영상 생성 요청 (백엔드로 프록시) ===')
    console.log('Job Type:', body.jobType)
    console.log('Video ID:', body.encodingRequest.videoId)
    console.log('Scenes Count:', body.encodingRequest.scenes.length)
    console.log('Backend URL:', `${API_BASE_URL}/api/v1/studio/jobs`)
    console.log('==================')

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
    console.error('영상 생성 API 오류:', error)
    return NextResponse.json(
      { 
        error: '영상 생성 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    )
  }
}

