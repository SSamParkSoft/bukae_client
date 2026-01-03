/**
 * Timeline 관련 타입 가드
 */

import type { TimelineData, TimelineScene } from '@/lib/types/domain/timeline'
import { isObject, isString, isNumber, isArray } from './common'

/**
 * TimelineScene 타입 가드
 */
export function isTimelineScene(value: unknown): value is TimelineScene {
  if (!isObject(value)) return false

  return (
    isNumber(value.sceneId) &&
    isNumber(value.duration) &&
    isString(value.transition) &&
    isString(value.image) &&
    isObject(value.text) &&
    isString(value.text.content) &&
    isString(value.text.font) &&
    isString(value.text.color)
  )
}

/**
 * TimelineData 타입 가드
 */
export function isTimelineData(value: unknown): value is TimelineData {
  if (!isObject(value)) return false

  return (
    isNumber(value.fps) &&
    isString(value.resolution) &&
    isArray(value.scenes) &&
    value.scenes.every((scene) => isTimelineScene(scene))
  )
}

