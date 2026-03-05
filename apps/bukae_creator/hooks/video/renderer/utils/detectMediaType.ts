/**
 * 미디어 타입 감지 유틸리티
 * TimelineScene의 videoUrl / mediaType 필드 및 image URL 확장자를 기반으로
 * 이미지 또는 영상 여부를 판단합니다.
 */

import type { TimelineScene } from '@/lib/types/domain/timeline'

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv'])

/**
 * TimelineScene의 미디어 타입을 반환합니다.
 *
 * 우선순위:
 * 1. scene.mediaType 명시 필드
 * 2. scene.videoUrl 존재 여부
 * 3. scene.image URL 확장자
 * 4. 기본값 'image'
 */
export function detectMediaType(scene: TimelineScene): 'image' | 'video' {
  if (scene.mediaType) return scene.mediaType
  if (scene.videoUrl) return 'video'

  const ext = scene.image?.split('.').pop()?.toLowerCase()
  if (ext && VIDEO_EXTENSIONS.has(ext)) return 'video'

  return 'image'
}
