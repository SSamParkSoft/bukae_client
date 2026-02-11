'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { resolveProSceneAtTime } from '../../utils/proPlaybackUtils'

interface TransportHookLike {
  currentTime: number
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

    const resolved = resolveProSceneAtTime(scenes, transportHook.currentTime)
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

    const targetOffset = Math.max(0, resolved.sceneTimeInSegment)
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
        const clampedOffset = Math.max(
          0,
          Math.min(targetOffset, Number.isFinite(audio.duration) ? audio.duration : targetOffset)
        )
        audio.currentTime = clampedOffset
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
    if (Math.abs(activeAudio.currentTime - targetOffset) > 0.2) {
      activeAudio.currentTime = targetOffset
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
