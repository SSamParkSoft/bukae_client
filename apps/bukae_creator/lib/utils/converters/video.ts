/**
 * Video 변환 함수
 * VideoListItem (API DTO)를 내부 Video 도메인 모델로 변환합니다.
 */

import type { VideoListItem } from '@/lib/types/api/video'
import type { ConverterFunction } from './types'

/**
 * Video 도메인 모델 (내부 사용)
 * API 응답과는 별개의 타입입니다.
 */
export interface VideoDomain {
  id: string
  userId: string
  title: string
  description: string
  fileUrl: string
  partnersLink: string
  platformType: 'coupang' | 'naver' | 'aliexpress' | 'amazon'
  posts: Array<{
    channel: 'youtube' | 'tiktok' | 'instagram'
    postUrl: string
  }>
  sequence: number
  createdAt: string
}

/**
 * PlatformType을 내부 형식으로 변환
 */
function convertPlatformType(
  platformType: 'COUPANG' | 'NAVER' | 'ALIEXPRESS' | 'AMAZON'
): 'coupang' | 'naver' | 'aliexpress' | 'amazon' {
  const map: Record<
    'COUPANG' | 'NAVER' | 'ALIEXPRESS' | 'AMAZON',
    'coupang' | 'naver' | 'aliexpress' | 'amazon'
  > = {
    COUPANG: 'coupang',
    NAVER: 'naver',
    ALIEXPRESS: 'aliexpress',
    AMAZON: 'amazon',
  }
  return map[platformType] || 'coupang'
}

/**
 * ChannelType을 내부 형식으로 변환
 */
function convertChannelType(
  channel: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM'
): 'youtube' | 'tiktok' | 'instagram' {
  const map: Record<
    'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM',
    'youtube' | 'tiktok' | 'instagram'
  > = {
    YOUTUBE: 'youtube',
    TIKTOK: 'tiktok',
    INSTAGRAM: 'instagram',
  }
  return map[channel] || 'youtube'
}

/**
 * VideoListItem을 VideoDomain으로 변환
 * 
 * @param videoListItem - API 응답 데이터
 * @param options - 변환 옵션
 * @returns 변환된 Video 도메인 모델
 */
export const convertVideoListItemToVideo: ConverterFunction<
  VideoListItem,
  VideoDomain
> = (videoListItem, options) => {
  const { strict = false } = options || {}

  // 필수 필드 검증
  if (strict) {
    if (!videoListItem.id) {
      throw new Error('VideoListItem에 id가 없습니다.')
    }
    if (!videoListItem.title) {
      throw new Error('VideoListItem에 title이 없습니다.')
    }
    if (!videoListItem.fileUrl) {
      throw new Error('VideoListItem에 fileUrl이 없습니다.')
    }
  }

  return {
    id: videoListItem.id,
    userId: videoListItem.userId,
    title: videoListItem.title,
    description: videoListItem.description,
    fileUrl: videoListItem.fileUrl,
    partnersLink: videoListItem.partnersLink,
    platformType: convertPlatformType(videoListItem.platformType),
    posts: videoListItem.posts.map((post) => ({
      channel: convertChannelType(post.channel),
      postUrl: post.postUrl,
    })),
    sequence: videoListItem.sequence,
    createdAt: videoListItem.createdAt,
  }
}

