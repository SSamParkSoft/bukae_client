'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { resolveProSceneAtTime } from '../../utils/proPlaybackUtils'
import { computeOnTtsEnded, computeTtsStartOffset } from '../../utils/ttsSyncScheduler'

interface TransportHookLike {
  currentTime: number
  getTime?: () => number
  seek?: (time: number) => void
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
  scenes: ProStep3Scene[]
  ttsCacheRef: React.MutableRefObject<Map<string, TtsCacheItem>>
  ttsAudioRefsRef: React.MutableRefObject<Map<number, HTMLAudioElement>>
}

export function useProTransportTtsSync({
  transportHook,
  isPlaying,
  pixiReady,
  playbackSpeed,
  scenes,
  ttsCacheRef,
  ttsAudioRefsRef,
}: UseProTransportTtsSyncParams) {
  const activeTtsSceneIndexRef = useRef<number | null>(null)

  // onended 클로저가 항상 최신 값을 참조할 수 있도록 ref로 관리
  const scenesRef = useRef(scenes)
  const isPlayingRef = useRef(isPlaying)
  const transportHookRef = useRef(transportHook)
  const playbackSpeedRef = useRef(playbackSpeed)

  useEffect(() => { scenesRef.current = scenes }, [scenes])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { transportHookRef.current = transportHook }, [transportHook])
  useEffect(() => { playbackSpeedRef.current = playbackSpeed }, [playbackSpeed])

  const stopAllTtsPlayback = useCallback(() => {
    ttsAudioRefsRef.current.forEach((audio) => {
      audio.onended = null
      audio.pause()
      audio.src = ''
    })
    ttsAudioRefsRef.current.clear()
    activeTtsSceneIndexRef.current = null
  }, [ttsAudioRefsRef])

  // startTtsForScene이 onended 안에서 자신을 재귀 호출할 수 있도록 ref로 보관
  const startTtsForSceneRef = useRef<(sceneIndex: number, transportTime: number) => void>(() => undefined)

  const startTtsForScene = useCallback((sceneIndex: number, transportTime: number) => {
    const currentScenes = scenesRef.current
    const scene = currentScenes[sceneIndex]
    if (!scene) return

    const { voiceTemplate, script } = scene
    if (!voiceTemplate || !script?.trim()) return

    const ttsKey = `${voiceTemplate}::${script}`
    const cached = ttsCacheRef.current.get(ttsKey)
    if (!cached?.url) return

    stopAllTtsPlayback()

    const offset = computeTtsStartOffset(currentScenes, sceneIndex, transportTime)
    const audio = new Audio(cached.url)
    audio.playbackRate = playbackSpeedRef.current
    audio.preload = 'auto'
    ttsAudioRefsRef.current.set(sceneIndex, audio)
    activeTtsSceneIndexRef.current = sceneIndex

    // TTS가 끝나면 Transport를 정확한 씬 경계로 보정하고 다음 TTS 시작
    audio.onended = () => {
      if (!isPlayingRef.current) return

      const action = computeOnTtsEnded(scenesRef.current, sceneIndex)
      if (!action) return

      transportHookRef.current.seek?.(action.seekTo)

      if (action.type === 'next') {
        startTtsForSceneRef.current(action.sceneIndex, action.seekTo)
      }
    }

    const tryPlay = () => {
      audio.currentTime = offset
      void audio.play().catch(() => undefined)
    }

    if (audio.readyState >= 1) {
      tryPlay()
    } else {
      audio.addEventListener('loadedmetadata', tryPlay, { once: true })
    }
  }, [stopAllTtsPlayback, ttsCacheRef, ttsAudioRefsRef])

  useEffect(() => {
    startTtsForSceneRef.current = startTtsForScene
  }, [startTtsForScene])

  // 재생 시작/정지 또는 씬 변경 시 TTS를 현재 Transport 위치에서 시작
  useEffect(() => {
    if (!pixiReady || !isPlaying) {
      stopAllTtsPlayback()
      return
    }

    const transportTime = transportHook.getTime?.() ?? transportHook.currentTime
    const resolved = resolveProSceneAtTime(scenes, transportTime)

    if (!resolved) {
      stopAllTtsPlayback()
      return
    }

    startTtsForScene(resolved.sceneIndex, transportTime)

    return () => stopAllTtsPlayback()
  }, [isPlaying, pixiReady, scenes, transportHook, startTtsForScene, stopAllTtsPlayback])

  // 재생속도 변경 → 현재 재생 중인 오디오에 즉시 반영
  useEffect(() => {
    if (activeTtsSceneIndexRef.current === null) return
    const audio = ttsAudioRefsRef.current.get(activeTtsSceneIndexRef.current)
    if (audio) {
      audio.playbackRate = playbackSpeed
    }
  }, [playbackSpeed, ttsAudioRefsRef])

  useEffect(() => {
    return () => stopAllTtsPlayback()
  }, [stopAllTtsPlayback])
}
