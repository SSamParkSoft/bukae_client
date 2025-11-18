import { NextResponse } from 'next/server'

import { getMediaAssets } from '@/lib/db'

export function GET() {
  try {
    const assets = getMediaAssets()
    return NextResponse.json(assets)
  } catch (error) {
    console.error('[media-api] 에러 상세:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    console.error('[media-api] 스택:', errorStack)
    
    // 개발 환경에서는 더 자세한 에러 정보 제공
    const isDev = process.env.NODE_ENV === 'development'
    
    // 프로덕션 환경에서는 빈 배열 반환 (getMediaAssets에서 이미 처리됨)
    // 하지만 혹시 모를 경우를 대비해 여기서도 처리
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction && errorMessage.includes('demo.db 파일을 찾을 수 없습니다')) {
      console.warn('[media-api] 프로덕션 환경에서 DB 파일 없음, 빈 배열 반환')
      return NextResponse.json([])
    }
    
    return NextResponse.json(
      { 
        message: '미디어 데이터를 불러오지 못했습니다.',
        error: errorMessage,
        errorName,
        ...(isDev && errorStack ? { stack: errorStack } : {}),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

