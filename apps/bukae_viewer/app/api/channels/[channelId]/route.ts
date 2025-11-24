import { NextResponse } from 'next/server'
import { ChannelInfo } from '@/lib/types/viewer'

// 더미 채널 데이터 (추후 DB 연동)
const DUMMY_CHANNELS: Record<string, ChannelInfo> = {
  ssambak: {
    id: 'ssambak',
    name: '쌈박한 소프트',
    description: '가성비 좋은 제품을 찾아드립니다',
    youtubeChannelId: 'UC1234567890',
    youtubeChannelName: 'ssambak',
    subscriberCount: 50000,
    businessEmail: 'business@example.com',
  },
  compare_everything_lab: {
    id: 'compare_everything_lab',
    name: '123',
    profileImage: 'https://via.placeholder.com/200/06b6d4/ffffff?text=쌈박한소프트',
    description: '가성비 좋은 제품을 찾아드립니다',
    youtubeChannelId: 'UC1234567890',
    youtubeChannelName: 'compare_everything_lab',
    subscriberCount: 50000,
    businessEmail: 'business@example.com',
  },
  channel123: {
    id: 'channel123',
    name: '테스트 채널',
    profileImage: 'https://via.placeholder.com/200/8b5cf6/ffffff?text=테스트',
    description: '테스트 채널입니다',
    youtubeChannelId: 'UC0987654321',
    youtubeChannelName: 'channel123',
    subscriberCount: 10000,
    businessEmail: 'test@example.com',
  },
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params

    // 채널 정보 조회 (추후 DB 연동)
    const channel = DUMMY_CHANNELS[channelId]

    if (!channel) {
      return NextResponse.json(
        { error: '채널을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(channel, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('채널 정보 API 오류:', error)
    return NextResponse.json(
      { error: '채널 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

