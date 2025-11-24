import { NextResponse } from 'next/server'
import { YouTubeVideo } from '@/lib/types/statistics'

// TODO: 실제 유튜브 API 연동
// 현재는 더미 데이터 반환
export async function GET() {
  try {
    // 더미 동영상 목록 생성
    const dummyVideos: YouTubeVideo[] = [
      {
        videoId: 'dQw4w9WgXcQ',
        title: '최고의 무선 이어폰 추천! 2024년 베스트 10',
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        publishedAt: '2024-01-15T10:00:00Z',
        views: 125000,
      },
      {
        videoId: 'jNQXAC9IVRw',
        title: '스마트워치 비교 리뷰 - 애플워치 vs 갤럭시워치',
        thumbnailUrl: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
        publishedAt: '2024-01-20T14:30:00Z',
        views: 98000,
      },
      {
        videoId: '9bZkp7q19f0',
        title: '노트북 추천 가이드 - 학생용부터 게이밍까지',
        thumbnailUrl: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
        publishedAt: '2024-01-25T09:15:00Z',
        views: 156000,
      },
      {
        videoId: 'kJQP7kiw5Fk',
        title: '무선 마우스 완벽 가이드 - 로지텍 vs 레이저',
        thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
        publishedAt: '2024-02-01T16:45:00Z',
        views: 87000,
      },
      {
        videoId: 'fJ9rUzIMcZQ',
        title: '키보드 추천 - 기계식 vs 멤브레인 비교',
        thumbnailUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
        publishedAt: '2024-02-05T11:20:00Z',
        views: 112000,
      },
    ]

    // 실제 API 연동 시 아래 주석 해제
    // const response = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=YOUR_CHANNEL_ID&maxResults=50&type=video', {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.YOUTUBE_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    // })
    // const data = await response.json()
    // const videos: YouTubeVideo[] = data.items.map((item: any) => ({
    //   videoId: item.id.videoId,
    //   title: item.snippet.title,
    //   thumbnailUrl: item.snippet.thumbnails.default.url,
    //   publishedAt: item.snippet.publishedAt,
    // }))
    // return NextResponse.json(videos)

    return NextResponse.json(dummyVideos)
  } catch (error) {
    console.error('유튜브 동영상 목록 API 오류:', error)
    return NextResponse.json(
      { error: '동영상 목록을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

