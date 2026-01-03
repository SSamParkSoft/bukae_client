/**
 * Video 관련 타입 가드
 */

import type { VideoListItem } from '@/lib/types/api/video'
import { isObject, isString, isArray, isNumber } from './common'

/**
 * VideoListItem 타입 가드
 */
export function isVideoListItem(value: unknown): value is VideoListItem {
  if (!isObject(value)) return false

  return (
    isString(value.id) &&
    isString(value.userId) &&
    isString(value.title) &&
    isString(value.description) &&
    isString(value.fileUrl) &&
    isString(value.partnersLink) &&
    isString(value.platformType) &&
    isArray(value.posts) &&
    isNumber(value.sequence) &&
    isString(value.createdAt)
  )
}

/**
 * VideoListItem 배열 타입 가드
 */
export function isVideoListItemArray(value: unknown): value is VideoListItem[] {
  if (!isArray(value)) return false
  return value.every((item) => isVideoListItem(item))
}

