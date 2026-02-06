'use client'

import { useMemo } from 'react'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { ensureSceneArray } from '../_utils/scene-array'
import type { SceneScript } from '@/lib/types/domain/script'

/**
 * store의 scenes를 안전하게 구독하고 배열로 반환하는 훅
 * 
 * Pro step3에서 사용하는 패턴을 공통화:
 * - storeScenes가 배열이 아니거나 빈 배열이면 빈 배열 반환
 * - 배열이면 그대로 반환
 * 
 * @returns 안전한 씬 배열
 */
export function useSafeScenes(): SceneScript[] {
  const scenes = useVideoCreateStore((state) => state.scenes)
  
  return useMemo(() => {
    return ensureSceneArray<SceneScript>(scenes)
  }, [scenes])
}
