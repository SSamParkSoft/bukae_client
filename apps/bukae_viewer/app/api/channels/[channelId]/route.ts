import { NextResponse } from 'next/server'
import { ChannelInfo } from '@/lib/types/viewer'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params

    // 채널 ID를 동적으로 사용하여 기본 채널 정보 반환
    const channel: ChannelInfo = {
      id: channelId,
      name: channelId,
      description: `${channelId}의 미니홈페이지`,
      // ssambak 채널의 경우 프로필 이미지 추가
      ...(channelId === 'ssambak' && {
        profileImage: '/ssambak_profile.png',
      }),
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

