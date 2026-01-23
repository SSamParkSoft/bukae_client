'use client'

import { useCallback } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface TtsCacheValue {
  blob: Blob
  durationSec: number
  markup: string
  url?: string | null
}

/**
 * TTS 캐시 확인 및 관리 훅
 * TTS 캐시 확인, duration 계산 등의 공통 로직을 제공합니다.
 */
export function useTtsCache() {
  /**
   * 씬 목록에서 TTS 합성이 필요한 씬 찾기
   */
  const findScenesToSynthesize = useCallback((
    timeline: TimelineData | null,
    sceneIndices: number[],
    voiceTemplate: string | null,
    buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[],
    makeTtsKey: (voiceName: string, markup: string) => string,
    ttsCacheRef: React.MutableRefObject<Map<string, TtsCacheValue>>
  ): number[] => {
    const scenesToSynthesize: number[] = []
    for (const sceneIndex of sceneIndices) {
      const scene = timeline?.scenes[sceneIndex]
      if (!scene) continue
      
      // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
      if (!sceneVoiceTemplate) continue
      
      const markups = buildSceneMarkup(timeline, sceneIndex)
      const hasAllCache = markups.every(markup => {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      })
      if (!hasAllCache) {
        scenesToSynthesize.push(sceneIndex)
      }
    }
    return scenesToSynthesize
  }, [])

  /**
   * 특정 씬의 TTS 캐시 확인
   */
  const hasSceneTtsCache = useCallback((
    timeline: TimelineData | null,
    sceneIndex: number,
    voiceTemplate: string | null,
    buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[],
    makeTtsKey: (voiceName: string, markup: string) => string,
    ttsCacheRef: React.MutableRefObject<Map<string, TtsCacheValue>>
  ): boolean => {
    const scene = timeline?.scenes[sceneIndex]
    if (!scene) return false
    
    const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
    if (!sceneVoiceTemplate) return false
    
    const markups = buildSceneMarkup(timeline, sceneIndex)
    return markups.every(markup => {
      const key = makeTtsKey(sceneVoiceTemplate, markup)
      const cached = ttsCacheRef.current.get(key)
      return cached && (cached.blob || cached.url)
    })
  }, [])

  /**
   * 씬의 TTS duration 계산 (캐시에서)
   */
  const getSceneTtsDuration = useCallback((
    timeline: TimelineData | null,
    sceneIndex: number,
    voiceTemplate: string | null,
    buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[],
    makeTtsKey: (voiceName: string, markup: string) => string,
    ttsCacheRef: React.MutableRefObject<Map<string, TtsCacheValue>>,
    fallbackDuration?: number
  ): number => {
    const scene = timeline?.scenes[sceneIndex]
    if (!scene) return fallbackDuration || 0
    
    const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
    if (!sceneVoiceTemplate) return fallbackDuration || 0
    
    const markups = buildSceneMarkup(timeline, sceneIndex)
    let duration = 0
    for (const markup of markups) {
      const key = makeTtsKey(sceneVoiceTemplate, markup)
      const cached = ttsCacheRef.current.get(key)
      if (cached?.durationSec && cached.durationSec > 0) {
        duration += cached.durationSec
      }
    }
    return duration > 0 ? duration : (fallbackDuration || scene.duration || 1)
  }, [])

  /**
   * 그룹의 TTS duration 계산 (여러 씬의 합계)
   */
  const getGroupTtsDuration = useCallback((
    timeline: TimelineData | null,
    groupIndices: number[],
    voiceTemplate: string | null,
    buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[],
    makeTtsKey: (voiceName: string, markup: string) => string,
    ttsCacheRef: React.MutableRefObject<Map<string, TtsCacheValue>>
  ): number => {
    let duration = 0
    if (timeline) {
      for (const sceneIndex of groupIndices) {
        const sceneDuration = getSceneTtsDuration(
          timeline,
          sceneIndex,
          voiceTemplate,
          buildSceneMarkup,
          makeTtsKey,
          ttsCacheRef
        )
        duration += sceneDuration
      }
    }
    return duration
  }, [getSceneTtsDuration])

  /**
   * 특정 씬/구간의 TTS durationSec을 캐시에서 가져오기
   */
  const getPartTtsDuration = useCallback((
    timeline: TimelineData | null,
    sceneIndex: number,
    partIndex: number,
    voiceTemplate: string | null,
    buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[],
    makeTtsKey: (voiceName: string, markup: string) => string,
    ttsCacheRef: React.MutableRefObject<Map<string, TtsCacheValue>>,
    fallbackDuration?: number
  ): number => {
    if (!timeline) return fallbackDuration || 1
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return fallbackDuration || 1

    const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
    const markups = buildSceneMarkup(timeline, sceneIndex)
    const markup = markups?.[partIndex]
    if (sceneVoiceTemplate && markup) {
      const key = makeTtsKey(sceneVoiceTemplate, markup)
      const cached = ttsCacheRef.current.get(key)
      if (cached?.durationSec && cached.durationSec > 0) {
        return cached.durationSec
      }
    }
    // fallback: 씬 duration 또는 fallbackDuration 또는 1초
    return fallbackDuration || scene.duration || 1
  }, [])

  return {
    findScenesToSynthesize,
    hasSceneTtsCache,
    getSceneTtsDuration,
    getGroupTtsDuration,
    getPartTtsDuration,
  }
}
