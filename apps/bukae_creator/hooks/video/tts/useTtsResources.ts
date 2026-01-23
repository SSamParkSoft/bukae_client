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

  // TTS 세션 리셋
  const resetTtsSession = useCallback(() => {
    stopTtsAudio()
    stopScenePreviewAudio()
    ttsAbortRef.current?.abort()
    ttsAbortRef.current = null
    ttsInFlightRef.current.clear()
    ttsCacheRef.current.clear()
  }, [stopTtsAudio, stopScenePreviewAudio])

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

