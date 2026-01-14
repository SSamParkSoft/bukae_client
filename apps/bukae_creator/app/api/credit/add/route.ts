import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { addCredits } from '@/lib/api/credit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AddCreditsRequest = {
  amount: number
}

export async function POST(request: Request) {
  try {
    // 개발 환경에서만 허용
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '이 기능은 개발 환경에서만 사용할 수 있습니다.' },
        { status: 403 }
      )
    }

    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const body = (await request.json()) as Partial<AddCreditsRequest>
    const amount = typeof body.amount === 'number' ? body.amount : 0

    if (amount <= 0) {
      return NextResponse.json(
        { error: '충전할 크레딧은 0보다 커야 합니다.' },
        { status: 400 }
      )
    }

    const result = await addCredits(auth.userId, amount)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '크레딧 충전에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      amount,
      newBalance: result.newBalance,
    })
  } catch (error) {
    console.error('[Credit] add error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '크레딧 충전 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
