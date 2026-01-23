'use client'

import { useRef, useCallback } from 'react'

/**
 * TTS 리소스 관리 훅
 * TTS 캐시, 오디오 refs, 세션 관리를 담당합니다.
 * 재생 로직은 포함하지 않으며, 순수 리소스 관리만 수행합니다.
 */
export function useTtsResources() {
  // TTS 재생 관련 refs
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

  // 씬 프리뷰 오디오 정지
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
  }, [])

  // [강화] TTS 캐시 크기 제한 상수
  // 비활성화하려면 아래 상수들을 매우 큰 값으로 설정하거나 cleanupTtsCache 호출을 주석 처리
  const MAX_TTS_CACHE_SIZE = 100 // 최대 캐시 항목 수
  const MAX_CACHE_MEMORY_MB = 50 // 최대 메모리 사용량 (MB, 개발 모드에서만 체크)

  // [강화] TTS 캐시 정리 함수
  // 비활성화하려면 이 함수 전체를 주석 처리하고 resetTtsSession에서 호출 제거
  const cleanupTtsCache = useCallback(() => {
    const cache = ttsCacheRef.current
    
    // 1. 크기 제한: 오래된 항목부터 제거
    if (cache.size > MAX_TTS_CACHE_SIZE) {
      const entries = Array.from(cache.entries())
      const toRemove = entries.slice(0, cache.size - MAX_TTS_CACHE_SIZE)
      toRemove.forEach(([key, value]) => {
        // URL 정리
        if (value.url) {
          URL.revokeObjectURL(value.url)
        }
        cache.delete(key)
      })
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TTS Cache] Cleaned up ${toRemove.length} old entries, remaining: ${cache.size}`)
      }
    }
    
    // 2. 메모리 사용량 체크 (개발 모드)
    // TypeScript 타입 확장을 위한 타입 가드
    const performanceWithMemory = performance as typeof performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number }
    }
    if (process.env.NODE_ENV === 'development' && performanceWithMemory.memory) {
      const usedMB = performanceWithMemory.memory.usedJSHeapSize / 1024 / 1024
      if (usedMB > MAX_CACHE_MEMORY_MB) {
        console.warn(`[TTS Cache] Memory usage high: ${usedMB.toFixed(2)}MB, cleaning cache...`)
        // 절반만 유지
        const entries = Array.from(cache.entries())
        const toKeep = entries.slice(-Math.floor(cache.size / 2))
        // 제거할 항목들의 URL 정리
        entries.slice(0, entries.length - toKeep.length).forEach(([, value]) => {
          if (value.url) {
            URL.revokeObjectURL(value.url)
          }
        })
        cache.clear()
        toKeep.forEach(([key, value]) => cache.set(key, value))
      }
    }
  }, [])

  // TTS 세션 리셋
  const resetTtsSession = useCallback(() => {
    stopTtsAudio()
    stopScenePreviewAudio()
    ttsAbortRef.current?.abort()
    ttsAbortRef.current = null
    ttsInFlightRef.current.clear()
    // [강화] 캐시 정리 후 clear (비활성화하려면 아래 줄 주석 처리)
    cleanupTtsCache()
    ttsCacheRef.current.clear()
  }, [stopTtsAudio, stopScenePreviewAudio, cleanupTtsCache])

  return {
    ttsCacheRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    stopTtsAudio,
    resetTtsSession,
    // 내부용 refs (필요시 사용)
    ttsInFlightRef,
    ttsAbortRef,
    scenePreviewAudioRef,
    scenePreviewAudioUrlRef,
    stopScenePreviewAudio,
  }
}

