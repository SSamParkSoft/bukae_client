import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { getUserCredits, getProviderUsageStats } from '@/lib/api/credit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const credits = await getUserCredits(auth.userId)
    const stats = await getProviderUsageStats(auth.userId)

    return NextResponse.json({
      credits,
      stats,
    })
  } catch (error) {
    console.error('[Credit] balance error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '크레딧 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
