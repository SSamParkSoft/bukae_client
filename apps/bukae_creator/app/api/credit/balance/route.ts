import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 이 API는 사용하지 않습니다. 404를 반환합니다.
export async function GET() {
  return NextResponse.json(
    { error: '이 API는 사용되지 않습니다.' },
    { status: 404 }
  )
}
