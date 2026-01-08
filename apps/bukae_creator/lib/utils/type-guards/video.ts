/**
 * Video 관련 타입 가드
 */

import type { VideoListItem } from '@/lib/types/api/video'
import { isObject, isString, isArray, isNumber } from './common'

/**
 * VideoListItem 타입 가드
 */
export function isVideoListItem(value: unknown): value is VideoListItem {
  if (!isObject(value)) {
    return false
  }

  const checks = {
    id: isString(value.id),
    userId: isString(value.userId),
    title: isString(value.title),
    description: typeof value.description === 'string', // 빈 문자열도 허용
    fileUrl: typeof value.fileUrl === 'string', // 빈 문자열도 허용
    partnersLink: typeof value.partnersLink === 'string' || value.partnersLink === null, // 문자열 또는 null 허용
    platformType: isString(value.platformType),
    posts: isArray(value.posts),
    sequence: isNumber(value.sequence),
    createdAt: isString(value.createdAt),
  }

  return Object.values(checks).every(Boolean)
}

/**
 * VideoListItem 배열 타입 가드
 */
export function isVideoListItemArray(value: unknown): value is VideoListItem[] {
  if (!isArray(value)) {
    return false
  }
  
  for (let i = 0; i < value.length; i++) {
    if (!isVideoListItem(value[i])) {
      return false
    }
  }
  
  return true
}

