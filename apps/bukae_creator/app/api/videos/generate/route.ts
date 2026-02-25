import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import {
  bindVideoCreditTransactionToJob,
  chargeVideoExportCredits,
} from '@/lib/api/credit'
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

type VideoGenerateRequest = {
  jobType?: unknown
  encodingRequest?: {
    scenes?: unknown
  }
  clientRequestId?: unknown
  [key: string]: unknown
}

function normalizeClientRequestId(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return crypto.randomUUID()
}

function extractJobId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const maybeJobId = (payload as { jobId?: unknown }).jobId
  return typeof maybeJobId === 'string' && maybeJobId.trim().length > 0 ? maybeJobId : null
}

export async function POST(request: Request) {
  try {
    // 프로덕션 환경에서 필수 환경 변수 검증
    requireEnvVars()
    
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'videos:generate', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

    const body = (await request.json()) as VideoGenerateRequest
    const clientRequestId = normalizeClientRequestId(body.clientRequestId)
    
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
    const accessToken = auth.accessToken ? `Bearer ${auth.accessToken}` : ''

    const backendResponse = await fetch(`${API_BASE_URL}/api/v1/studio/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': accessToken,
      },
      body: JSON.stringify({
        ...body,
        clientRequestId,
      }),
    })

    // 백엔드 응답을 그대로 전달
    const responseData = await backendResponse.json().catch(() => ({}))
    const jobId = extractJobId(responseData)

    let billing = {
      success: true,
      charged: false,
      alreadyProcessed: false,
      transactionId: null as string | null,
      creditsUsed: 0,
      remainingCredits: null as number | null,
      error: undefined as string | undefined,
    }

    // jobId가 확인된 job 생성 성공 시점에만 크레딧 차감
    if (backendResponse.ok && jobId) {
      const chargeResult = await chargeVideoExportCredits({
        userId: auth.userId,
        clientRequestId,
      })

      billing = {
        success: chargeResult.success,
        charged: chargeResult.charged,
        alreadyProcessed: chargeResult.alreadyProcessed,
        transactionId: chargeResult.transactionId,
        creditsUsed: chargeResult.creditsUsed,
        remainingCredits: chargeResult.remainingCredits,
        error: chargeResult.error,
      }

      if (!chargeResult.success) {
        return NextResponse.json(
          {
            error: chargeResult.error || '크레딧 차감에 실패했습니다.',
            billing: {
              ...billing,
              clientRequestId,
            },
          },
          {
            status: 402,
            headers: {
              ...(rl.headers ?? {}),
              'Content-Type': 'application/json',
            },
          }
        )
      }

      // 렌더 실패 환불을 위해 transactionId <-> jobId 연결
      if (chargeResult.transactionId) {
        const bindResult = await bindVideoCreditTransactionToJob({
          transactionId: chargeResult.transactionId,
          jobId,
        })

        if (!bindResult.success) {
          console.warn('[videos/generate] 거래-작업 연결 실패:', bindResult.error)
        }
      }
    }

    const responsePayload =
      responseData && typeof responseData === 'object' && !Array.isArray(responseData)
        ? {
            ...responseData,
            billing: {
              ...billing,
              clientRequestId,
            },
          }
        : {
            data: responseData,
            billing: {
              ...billing,
              clientRequestId,
            },
          }

    return NextResponse.json(
      responsePayload,
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
