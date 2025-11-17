import { NextResponse } from 'next/server'

import { getMediaAssets } from '@/lib/db'

export function GET() {
  try {
    const assets = getMediaAssets()
    return NextResponse.json(assets)
  } catch (error) {
    console.error('[media-api]', error)
    return NextResponse.json({ message: '미디어 데이터를 불러오지 못했습니다.' }, { status: 500 })
  }
}

