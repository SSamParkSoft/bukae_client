'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { resolveProSceneAtTime } from '../../utils/proPlaybackUtils'

interface TransportHookLike {
  currentTime: number
  getTime?: () => number
}

interface TtsCacheItem {
  blob: Blob
  durationSec: number
  url?: string | null
}

interface UseProTransportTtsSyncParams {
  transportHook: TransportHookLike
  isPlaying: boolean
  pixiReady: boolean
  playbackSpeed: number
  currentTime: number
  scenes: ProStep3Scene[]
  ttsCacheRef: React.MutableRefObject<Map<string, TtsCacheItem>>
  ttsAudioRefsRef: React.MutableRefObject<Map<number, HTMLAudioElement>>
}

export function useProTransportTtsSync({
  transportHook,
  isPlaying,
  pixiReady,
  playbackSpeed,
  currentTime,
  scenes,
  ttsCacheRef,
  ttsAudioRefsRef,
}: UseProTransportTtsSyncParams) {
  const activeTtsSceneIndexRef = useRef<number | null>(null)

  const stopAllTtsPlayback = useCallback(() => {
    ttsAudioRefsRef.current.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    ttsAudioRefsRef.current.clear()
    activeTtsSceneIndexRef.current = null
  }, [ttsAudioRefsRef])

  useEffect(() => {
    if (!pixiReady) {
      return
    }

    if (!isPlaying) {
      stopAllTtsPlayback()
      return
    }

    const transportTime = typeof transportHook.getTime === 'function'
      ? transportHook.getTime()
      : transportHook.currentTime
    const resolved = resolveProSceneAtTime(scenes, transportTime)
    if (!resolved) {
      stopAllTtsPlayback()
      return
    }

    const targetScene = scenes[resolved.sceneIndex]
    const voiceTemplate = targetScene?.voiceTemplate
    const script = targetScene?.script
    if (!targetScene || !voiceTemplate || !script?.trim()) {
      stopAllTtsPlayback()
      return
    }

    const ttsKey = `${voiceTemplate}::${script}`
    const cached = ttsCacheRef.current.get(ttsKey)
    if (!cached?.url) {
      stopAllTtsPlayback()
      return
    }

    // sceneTimeInSegment를 TTS 오디오 duration으로 clamp하여 마지막 씬에서 끊김 방지
    // TTS 오디오의 실제 duration을 사용 (cached.durationSec 또는 audio.duration)
    const ttsAudioDuration = cached.durationSec && Number.isFinite(cached.durationSec) && cached.durationSec > 0
      ? cached.durationSec
      : null
    
    // sceneTimeInSegment가 씬 duration을 넘지 않도록 clamp
    const clampedSceneTime = Math.min(resolved.sceneTimeInSegment, resolved.duration)
    
    // TTS 오디오 duration이 있으면 그것도 고려하여 clamp
    const targetOffset = ttsAudioDuration
      ? Math.max(0, Math.min(clampedSceneTime, ttsAudioDuration - 0.01)) // 0.01초 여유를 두어 끝에서 끊김 방지
      : Math.max(0, clampedSceneTime)
    
    const activeSceneIndex = activeTtsSceneIndexRef.current
    const activeAudio = activeSceneIndex !== null ? ttsAudioRefsRef.current.get(activeSceneIndex) : undefined

    if (activeSceneIndex !== resolved.sceneIndex || !activeAudio) {
      stopAllTtsPlayback()
      const audio = new Audio(cached.url)
      audio.playbackRate = playbackSpeed
      audio.preload = 'auto'
      ttsAudioRefsRef.current.set(resolved.sceneIndex, audio)
      activeTtsSceneIndexRef.current = resolved.sceneIndex

      const tryPlay = () => {
        // audio.duration이 로드되었으면 그것도 고려하여 clamp
        const audioDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : ttsAudioDuration
        const finalOffset = audioDuration
          ? Math.max(0, Math.min(targetOffset, audioDuration - 0.01)) // 0.01초 여유를 두어 끝에서 끊김 방지
          : targetOffset
        audio.currentTime = finalOffset
        void audio.play().catch(() => undefined)
      }

      if (audio.readyState >= 1) {
        tryPlay()
      } else {
        const onLoadedMetadata = () => {
          audio.removeEventListener('loadedmetadata', onLoadedMetadata)
          tryPlay()
        }
        audio.addEventListener('loadedmetadata', onLoadedMetadata)
      }
      return
    }

    activeAudio.playbackRate = playbackSpeed
    
    // activeAudio의 duration도 고려하여 clamp
    const activeAudioDuration = Number.isFinite(activeAudio.duration) && activeAudio.duration > 0
      ? activeAudio.duration
      : ttsAudioDuration
    
    const finalTargetOffset = activeAudioDuration
      ? Math.max(0, Math.min(targetOffset, activeAudioDuration - 0.01)) // 0.01초 여유를 두어 끝에서 끊김 방지
      : targetOffset
    
    if (Math.abs(activeAudio.currentTime - finalTargetOffset) > 0.2) {
      activeAudio.currentTime = finalTargetOffset
    }
    if (activeAudio.paused) {
      void activeAudio.play().catch(() => undefined)
    }
  }, [currentTime, isPlaying, pixiReady, playbackSpeed, scenes, stopAllTtsPlayback, transportHook, ttsAudioRefsRef, ttsCacheRef])

  useEffect(() => {
    return () => {
      stopAllTtsPlayback()
    }
  }, [stopAllTtsPlayback])
}
