'use client'

import { useEffect } from 'react'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { SceneScript } from '@/lib/types/domain/script'
import { isValidSceneArray } from '@/app/video/create/_utils/scene-array'

interface UseSceneStructureSyncParams {
  scenes: SceneScript[]
  timeline: TimelineData | null
  voiceTemplate: string | null
  ttsCacheRefShared: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  buildSceneMarkupWithTimeline: (timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number; voiceTemplate?: string | null; text?: { content?: string } }> } | null, sceneIndex: number) => string[]
  makeTtsKey: (voice: string, markup: string) => string
}

/**
 * 씬 구조 정보 동기화를 관리하는 훅
 * - 씬 구조 정보 자동 업데이트
 * - sceneStructureStore 동기화
 */
export function useSceneStructureSync({
  scenes,
  timeline,
  voiceTemplate,
  ttsCacheRefShared,
  buildSceneMarkupWithTimeline,
  makeTtsKey,
}: UseSceneStructureSyncParams) {
  const sceneStructureStore = useSceneStructureStore()

  // 씬 구조 정보 자동 업데이트
  useEffect(() => {
    // scenes가 배열이 아니거나 빈 배열이면 종료
    if (!isValidSceneArray(scenes) || !timeline) return
    
    sceneStructureStore.updateStructure({
      scenes,
      timeline,
      ttsCacheRef: ttsCacheRefShared,
      voiceTemplate,
      buildSceneMarkup: buildSceneMarkupWithTimeline,
      makeTtsKey,
    })
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, timeline, voiceTemplate])
}
