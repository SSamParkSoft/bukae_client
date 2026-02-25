import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { refundVideoExportCredits } from '@/lib/api/credit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type VideoRefundRequest = {
  jobId?: unknown
  transactionId?: unknown
  reason?: unknown
}

function parseStringField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'videos:refund', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

    const body = (await request.json().catch(() => ({}))) as VideoRefundRequest
    const jobId = parseStringField(body.jobId)
    const transactionId = parseStringField(body.transactionId)
    const reason = parseStringField(body.reason)

    if (!jobId && !transactionId) {
      return NextResponse.json(
        { error: 'jobId 또는 transactionId 중 하나는 필요합니다.' },
        { status: 400 }
      )
    }

    const refundResult = await refundVideoExportCredits({
      userId: auth.userId,
      jobId,
      transactionId,
      reason,
    })

    if (!refundResult.success) {
      return NextResponse.json(
        {
          error: refundResult.error || '환불 처리에 실패했습니다.',
          refunded: refundResult.refunded,
          transactionId: refundResult.transactionId,
          refundedCredits: refundResult.refundedCredits,
          remainingCredits: refundResult.remainingCredits,
        },
        {
          status: refundResult.permissionDenied ? 403 : 500,
          headers: {
            ...(rl.headers ?? {}),
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return NextResponse.json(
      {
        success: true,
        refunded: refundResult.refunded,
        transactionId: refundResult.transactionId,
        refundedCredits: refundResult.refundedCredits,
        remainingCredits: refundResult.remainingCredits,
      },
      {
        status: 200,
        headers: {
          ...(rl.headers ?? {}),
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('[videos/refund] API error:', error)
    return NextResponse.json(
      {
        error: '영상 환불 처리 중 오류가 발생했어요.',
      },
      { status: 500 }
    )
  }
}
