import { useRef, useCallback } from 'react'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getMp3DurationSec } from '@/lib/utils/audio'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseTtsManagerParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
}

/**
 * TTS 관리 hook
 * TTS 캐시 관리, TTS 생성 및 업로드, 미리보기 핸들러를 담당합니다.
 * 
 * Note: 이 hook은 기본 구조만 제공하며, 실제 TTS 생성 로직은
 * step4/page.tsx에 남아있습니다. 향후 점진적으로 이 hook으로 이동할 수 있습니다.
 */
export function useTtsManager({
  timeline,
  voiceTemplate,
}: UseTtsManagerParams) {
  // TTS 캐시 관리
  const ttsCacheRef = useRef(
    new Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>()
  )
  const ttsInFlightRef = useRef(
    new Map<string, Promise<{ blob: Blob; durationSec: number; markup: string; url?: string | null }>>()
  )

  // TTS 캐시 무효화
  const invalidateSceneTtsCache = useCallback((sceneIndex: number) => {
    if (!timeline || !voiceTemplate) return

    const keysToInvalidate: string[] = []
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return

    // sceneId나 sceneIndex로 캐시된 항목 찾기
    ttsCacheRef.current.forEach((cached, key) => {
      if (cached.sceneId === scene.sceneId || cached.sceneIndex === sceneIndex) {
        keysToInvalidate.push(key)
      }
    })

    // 찾은 키들의 캐시 삭제
    keysToInvalidate.forEach(key => {
      ttsCacheRef.current.delete(key)
    })
  }, [timeline, voiceTemplate])

  return {
    ttsCacheRef,
    ttsInFlightRef,
    invalidateSceneTtsCache,
    buildSceneMarkup: (sceneIndex: number) => buildSceneMarkup(timeline, sceneIndex),
    makeTtsKey: (voiceName: string, markup: string) => makeTtsKey(voiceName, markup),
    getMp3DurationSec,
  }
}

