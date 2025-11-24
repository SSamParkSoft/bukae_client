import { NextResponse } from 'next/server'
import { YouTubeStats } from '@/lib/types/statistics'

// TODO: 실제 유튜브 애널리틱스 API 연동
// 현재는 더미 데이터 반환
export async function GET() {
  try {
    // 더미 데이터 생성 (전체 통계)
    const dummyData: YouTubeStats = {
      // 수익 관련 (우선 표시)
      totalEstimatedRevenue: Math.floor(Math.random() * 500000) + 100000,
      adRevenue: Math.floor(Math.random() * 400000) + 80000,
      cpm: Math.floor(Math.random() * 5) + 2,
      monetizedPlaybacks: Math.floor(Math.random() * 50000) + 10000,
      // 기타 통계
      views: Math.floor(Math.random() * 100000) + 50000,
      likes: Math.floor(Math.random() * 5000) + 1000,
      dislikes: Math.floor(Math.random() * 100) + 10,
      subscriberChange: Math.floor(Math.random() * 500) - 50,
      trafficSources: [
        { source: '유튜브 검색', percentage: 35 },
        { source: '추천 동영상', percentage: 40 },
        { source: '외부', percentage: 15 },
        { source: '채널 페이지', percentage: 5 },
        { source: '기타', percentage: 5 },
      ],
    }

    // 실제 API 연동 시 아래 주석 해제
    // const response = await fetch('https://youtubeanalytics.googleapis.com/v2/reports', {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.YOUTUBE_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    // })
    // const data = await response.json()
    // return NextResponse.json(data)

    return NextResponse.json(dummyData)
  } catch (error) {
    console.error('유튜브 통계 API 오류:', error)
    return NextResponse.json(
      { error: '통계 데이터를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

