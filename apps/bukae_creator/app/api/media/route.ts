import { NextResponse } from 'next/server'

import { getMediaAssets } from '@/lib/db'

export function GET() {
  try {
    const assets = getMediaAssets()
    return NextResponse.json(assets)
  } catch (error) {
    const isDev = process.env.NODE_ENV === 'development'
    
    // 개발 환경에서만 상세 에러 로깅
    if (isDev) {
      console.error('[media-api] 에러 상세:', error)
      const errorStack = error instanceof Error ? error.stack : undefined
      if (errorStack) {
        console.error('[media-api] 스택:', errorStack)
      }
    }
    
    // 프로덕션 환경에서는 빈 배열 반환 (getMediaAssets에서 이미 처리됨)
    // 하지만 혹시 모를 경우를 대비해 여기서도 처리
    const isProduction = process.env.NODE_ENV === 'production'
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    if (isProduction && errorMessage.includes('demo.db 파일을 찾을 수 없습니다')) {
      return NextResponse.json([])
    }
    
    // 프로덕션에서는 내부 정보를 노출하지 않음
    if (isProduction) {
      return NextResponse.json(
        { 
          message: '미디어 데이터를 불러오지 못했어요.',
        },
        { status: 500 }
      )
    }
    
    // 개발 환경에서만 상세 정보 제공
    return NextResponse.json(
      { 
        message: '미디어 데이터를 불러오지 못했어요.',
        error: errorMessage,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

