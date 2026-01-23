'use client'

import { useRef, useCallback, useEffect, useMemo } from 'react'
import { useVideoCreateStore, TimelineData } from '@/store/useVideoCreateStore'
import type { TimelineScene } from '@/store/useVideoCreateStore'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { ensureSceneTts as ensureSceneTtsUtil } from '@/lib/utils/tts-synthesis'
import { calculateTotalDuration } from '@/utils/timeline'

interface UseTtsManagerProps {
  timeline: TimelineData | null
  voiceTemplate: string | null
  setTimeline: (timeline: TimelineData | null) => void
  isPlaying: boolean
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>
  changedScenesRef: React.MutableRefObject<Set<number>>
}

export function useTtsManager({
  timeline,
  voiceTemplate,
  setTimeline,
  isPlaying,
  setCurrentTime,
  changedScenesRef,
}: UseTtsManagerProps) {
  // TTS 캐시 및 상태 관리
  const ttsCacheRef = useRef(
    new Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>()
  )
  const ttsInFlightRef = useRef(
    new Map<string, Promise<{ blob: Blob; durationSec: number; markup: string; url?: string | null }>>()
  )
  const ttsAbortRef = useRef<AbortController | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const ttsAudioUrlRef = useRef<string | null>(null)
  const scenePreviewAudioRef = useRef<HTMLAudioElement | null>(null)
  const scenePreviewAudioUrlRef = useRef<string | null>(null)
  const previewingSceneIndexRef = useRef<number | null>(null)
  const previewingPartIndexRef = useRef<number | null>(null)
  const isPreviewingRef = useRef<boolean>(false)
  const prevScenesKeyRef = useRef<string>('')

  // TTS 오디오 정지
  const stopTtsAudio = useCallback(() => {
    const a = ttsAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    ttsAudioRef.current = null
    if (ttsAudioUrlRef.current) {
      URL.revokeObjectURL(ttsAudioUrlRef.current)
      ttsAudioUrlRef.current = null
    }
  }, [])

  const stopScenePreviewAudio = useCallback(() => {
    const a = scenePreviewAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    scenePreviewAudioRef.current = null
    if (scenePreviewAudioUrlRef.current) {
      URL.revokeObjectURL(scenePreviewAudioUrlRef.current)
      scenePreviewAudioUrlRef.current = null
    }
    previewingSceneIndexRef.current = null
    previewingPartIndexRef.current = null
    isPreviewingRef.current = false
  }, [])

  const resetTtsSession = useCallback(() => {
    stopTtsAudio()
    stopScenePreviewAudio()
    ttsAbortRef.current?.abort()
    ttsAbortRef.current = null
    ttsInFlightRef.current.clear()
    ttsCacheRef.current.clear()
  }, [stopTtsAudio, stopScenePreviewAudio])

  // voiceTemplate 변경 시 캐시 초기화
  useEffect(() => {
    if (voiceTemplate) {
      resetTtsSession()
    }
  }, [voiceTemplate, resetTtsSession])

  // 씬 duration을 오디오에서 설정
  const setSceneDurationFromAudio = useCallback(
    (sceneIndex: number, durationSec: number) => {
      console.log(`[setSceneDurationFromAudio] 호출됨: Scene ${sceneIndex}, durationSec=${durationSec.toFixed(2)}s`)
      
      if (!timeline || !voiceTemplate) {
        console.log(`[setSceneDurationFromAudio] early return: timeline=${!!timeline}, voiceTemplate=${!!voiceTemplate}`)
        return
      }
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        console.log(`[setSceneDurationFromAudio] early return: durationSec=${durationSec}`)
        return
      }
      
      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        console.log(`[setSceneDurationFromAudio] early return: scene 없음`)
        return
      }
      
      // ensureSceneTts에서 계산한 durationSec이 정확하므로 항상 업데이트
      // actualPlaybackDuration은 실제 재생 시간이지만, TTS duration 합계가 더 정확함
      
      // ensureSceneTts에서 계산한 durationSec을 직접 사용 (가장 정확함)
      const finalDuration = durationSec
      const prev = scene.duration ?? 0
      
      // 기존 duration과 같으면 업데이트하지 않음 (0.01초 이하 차이는 무시)
      if (Math.abs(prev - finalDuration) <= 0.01) {
        console.log(`[setSceneDurationFromAudio] early return: 기존 duration과 동일 (prev=${prev.toFixed(2)}s, new=${finalDuration.toFixed(2)}s)`)
        return
      }

      // 실제 duration 사용 (최소 0.5초만 유지, 최대 제한 없음)
      const clamped = Math.max(0.5, finalDuration)
      
      console.log(`[setSceneDurationFromAudio] 업데이트: Scene ${sceneIndex}, prev=${prev.toFixed(2)}s -> new=${clamped.toFixed(2)}s`)
      
      // 이전 totalDuration 계산 (같은 sceneId를 가진 씬들 사이의 transition 제외)
      const prevTotalDuration = calculateTotalDuration(timeline)
      
      // 부분 업데이트: 해당 씬의 duration만 변경
      const updatedScene = { ...scene, duration: clamped }
      const newTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((s, i) => (i === sceneIndex ? updatedScene : s)),
      }
      
      // 새로운 totalDuration 계산 (같은 sceneId를 가진 씬들 사이의 transition 제외)
      const newTotalDuration = calculateTotalDuration(newTimeline)
      
      console.log(`[setSceneDurationFromAudio] totalDuration 변경: ${prevTotalDuration.toFixed(2)}s -> ${newTotalDuration.toFixed(2)}s`)
      
      // 재생 중일 때 currentTime을 비례적으로 조정하여 재생바 튕김 방지
      if (isPlaying && prevTotalDuration > 0 && newTotalDuration > 0) {
        const ratio = newTotalDuration / prevTotalDuration
        setCurrentTime((prevTime) => {
          const adjustedTime = prevTime * ratio
          // 조정된 시간이 새로운 totalDuration을 넘지 않도록
          return Math.min(adjustedTime, newTotalDuration)
        })
      }
      
      setTimeline(newTimeline)
      console.log(`[setSceneDurationFromAudio] timeline 업데이트 완료: Scene ${sceneIndex}`)
    },
    [setTimeline, timeline, isPlaying, setCurrentTime, voiceTemplate]
  )

  // ensureSceneTts 래퍼
  const ensureSceneTts = useCallback(
    async (
      sceneIndex: number,
      signal?: AbortSignal,
      forceRegenerate: boolean = false
    ): Promise<{
      sceneIndex: number
      parts: Array<{
        blob: Blob
        durationSec: number
        url: string | null
        partIndex: number
        markup: string
      }>
    }> => {
      if (!timeline) {
        throw new Error('timeline이 없습니다.')
      }
      const sceneVoiceTemplate = timeline.scenes[sceneIndex]?.voiceTemplate || voiceTemplate
      if (!sceneVoiceTemplate) {
        throw new Error('목소리를 먼저 선택해주세요.')
      }

      return ensureSceneTtsUtil({
        timeline,
        sceneIndex,
        voiceTemplate: sceneVoiceTemplate,
        ttsCacheRef,
        ttsInFlightRef,
        changedScenesRef,
        setSceneDurationFromAudio,
        signal,
        forceRegenerate,
      })
    },
    [timeline, voiceTemplate, setSceneDurationFromAudio, changedScenesRef]
  )

  // 씬 TTS 캐시 무효화 (저장소 URL도 제거하여 재업로드 유도)
  const invalidateSceneTtsCache = useCallback((sceneIndex: number) => {
    if (!timeline || !voiceTemplate) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return

    const keysToInvalidate: string[] = []
    
    // 현재 캐시의 모든 키를 순회하면서 해당 씬(sceneId 또는 sceneIndex)의 캐시 찾기
    ttsCacheRef.current.forEach((value, key) => {
      // 캐시 값이 객체인지 확인
      if (value && typeof value === 'object') {
        const cached = value as { blob: Blob; durationSec: number; markup: string; url?: string | null; sceneId?: number; sceneIndex?: number }
        // sceneId가 일치하거나 sceneIndex가 일치하면 무효화
        // 기존 캐시에는 sceneId/sceneIndex가 없을 수 있으므로, 
        // 해당 씬의 현재 스크립트로 생성된 키인지도 확인
        const shouldInvalidate = 
          cached.sceneId === scene.sceneId || 
          cached.sceneIndex === sceneIndex
        
        if (shouldInvalidate) {
          keysToInvalidate.push(key)
        }
      }
    })
    
    // sceneId나 sceneIndex로 찾지 못한 경우, 
    // 해당 씬의 현재 스크립트로 생성된 모든 키를 찾아서 무효화
    // (스크립트가 변경되었을 때 이전 캐시를 찾기 위함)
    // 씬별 voiceTemplate도 고려 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
    if (keysToInvalidate.length === 0) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate || ''
      markups.forEach((markup) => {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        if (ttsCacheRef.current.has(key)) {
          keysToInvalidate.push(key)
        }
      })
    }
    
    // 찾은 키들의 캐시 삭제 (URL 포함하여 완전히 무효화)
    keysToInvalidate.forEach(key => {
      const cached = ttsCacheRef.current.get(key)
      if (cached) {
        ttsCacheRef.current.delete(key)
      }
    })
  }, [timeline, voiceTemplate])

  // 씬별 마크업 메모이제이션 (캐시 확인 최적화)
  const sceneMarkupsMap = useMemo(() => {
    if (!timeline || !voiceTemplate) return new Map<number, string[]>()
    
    const map = new Map<number, string[]>()
    timeline.scenes.forEach((scene, index) => {
      const markups = buildSceneMarkup(timeline, index)
      map.set(index, markups)
    })
    return map
  }, [timeline, voiceTemplate])
  
  // 씬별 캐시 상태 메모이제이션 (캐시 확인 최적화)
  const sceneCacheStatusMap = useMemo(() => {
    if (!timeline || !voiceTemplate || !sceneMarkupsMap) return new Map<number, { allCached: boolean; totalDuration: number }>()
    
    const map = new Map<number, { allCached: boolean; totalDuration: number }>()
    timeline.scenes.forEach((scene, index) => {
      const markups = sceneMarkupsMap.get(index) || []
      if (markups.length === 0) {
        map.set(index, { allCached: true, totalDuration: 0 })
        return
      }
      
      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
      let totalTtsDuration = 0
      let allPartsCached = true
      
      for (const markup of markups) {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached && cached.durationSec > 0) {
          totalTtsDuration += cached.durationSec
        } else {
          allPartsCached = false
          break
        }
      }
      
      map.set(index, { allCached: allPartsCached, totalDuration: totalTtsDuration })
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, voiceTemplate, sceneMarkupsMap, ttsCacheRef.current])
  
  // Timeline의 duration을 계산 (TTS 캐시 기반)
  useEffect(() => {
    if (!timeline || !voiceTemplate) return
    
    // scenes의 text content와 voiceTemplate이 변경되었는지 확인
    const currentScenesKey = timeline.scenes.map(s => 
      `${s.text?.content || ''}|${s.voiceTemplate || ''}`
    ).join('||')
    const scenesChanged = prevScenesKeyRef.current !== currentScenesKey
    prevScenesKeyRef.current = currentScenesKey
    
    // text content나 voiceTemplate이 변경되지 않았고, 모든 씬의 duration이 이미 정확히 계산되어 있으면 실행하지 않음
    if (!scenesChanged) {
      const allScenesHaveDuration = timeline.scenes.every((scene, index) => {
        // actualPlaybackDuration이 있으면 duration이 일치하는지 확인
        if (scene.actualPlaybackDuration && scene.actualPlaybackDuration > 0) {
          return Math.abs(scene.duration - scene.actualPlaybackDuration) <= 0.01
        }
        // actualPlaybackDuration이 없으면 TTS 캐시 확인 (메모이제이션된 결과 사용)
        const cacheStatus = sceneCacheStatusMap.get(index)
        if (!cacheStatus) return false
        
        // 모든 part가 캐시에 있고, duration이 이미 정확히 계산되어 있으면 OK
        if (cacheStatus.allCached && cacheStatus.totalDuration > 0) {
          return Math.abs(scene.duration - cacheStatus.totalDuration) <= 0.01
        }
        return false
      })
      
      // 모든 씬의 duration이 이미 정확히 계산되어 있으면 실행하지 않음
      if (allScenesHaveDuration) {
        return
      }
    }
    
    const updatedScenes = timeline.scenes.map((scene, index) => {
      // 실제 재생 시간이 있으면 그것을 사용 (가장 정확함)
      // actualPlaybackDuration이 있으면 절대 TTS 캐시 기반 계산을 하지 않음
      if (scene.actualPlaybackDuration && scene.actualPlaybackDuration > 0) {
        // 기존 duration과 같으면 업데이트하지 않음
        if (Math.abs(scene.duration - scene.actualPlaybackDuration) <= 0.01) {
          return scene
        }
        // actualPlaybackDuration이 있으면 무조건 그것을 사용
        return { ...scene, duration: scene.actualPlaybackDuration }
      }
      
      // actualPlaybackDuration이 없을 때만 TTS 캐시 기반으로 계산 (메모이제이션된 결과 사용)
      const cacheStatus = sceneCacheStatusMap.get(index)
      if (!cacheStatus) return scene
      
      // 모든 part가 캐시에 있고 duration이 계산 가능한 경우만 업데이트
      if (cacheStatus.allCached && cacheStatus.totalDuration > 0) {
        // 기존 duration과 같으면 업데이트하지 않음
        if (Math.abs(scene.duration - cacheStatus.totalDuration) <= 0.01) {
          return scene
        }
        return { ...scene, duration: cacheStatus.totalDuration }
      }
      
      // TTS 캐시가 없으면 아무것도 하지 않음 (재생이 안되니까)
      return scene
    })
    
    // 실제로 duration이 변경된 씬만 필터링하여 부분 업데이트
    const scenesToUpdate: Array<{ index: number; scene: TimelineScene }> = []
    updatedScenes.forEach((scene, index) => {
      const prevDuration = timeline.scenes[index]?.duration ?? 0
      if (Math.abs(scene.duration - prevDuration) > 0.01) {
        scenesToUpdate.push({ index, scene })
      }
    })
    
    // 변경된 씬이 있으면 부분 업데이트 (변경된 씬만 업데이트)
    if (scenesToUpdate.length > 0) {
      setTimeline({
        ...timeline,
        scenes: timeline.scenes.map((s, i) => {
          const update = scenesToUpdate.find(u => u.index === i)
          return update ? update.scene : s
        }),
      })
    }
  }, [voiceTemplate, setTimeline, timeline, sceneCacheStatusMap])

  return {
    ttsCacheRef,
    ttsInFlightRef,
    ttsAbortRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    scenePreviewAudioRef,
    scenePreviewAudioUrlRef,
    previewingSceneIndexRef,
    previewingPartIndexRef,
    isPreviewingRef,
    stopTtsAudio,
    stopScenePreviewAudio,
    resetTtsSession,
    ensureSceneTts,
    invalidateSceneTtsCache,
    setSceneDurationFromAudio,
  }
}
