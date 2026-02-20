'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { getPlayableSceneStartTime } from '../../utils/proPlaybackUtils'

interface TransportHookLike {
  currentTime: number
  getTime: () => number
  setTotalDuration: (duration: number) => void
  setRate: (rate: number) => void
  play: () => void
  pause: () => void
  seek: (time: number) => void
}

interface TransportStateLike {
  isPlaying: boolean
  totalDuration: number
}

interface UseProTransportPlaybackParams {
  transportHook: TransportHookLike
  transportState: TransportStateLike
  playbackSpeed: number
  totalDurationValue: number
  currentSceneIndex: number
  scenes: ProStep3Scene[]
  pixiReady: boolean
  renderAtRef: React.MutableRefObject<
    ((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number; forceRender?: boolean }) => void) | undefined
  >
  onBeforePlay?: () => boolean
  onPlayingChange?: (isPlaying: boolean) => void
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>
  setTotalDuration: React.Dispatch<React.SetStateAction<number>>
}

export function useProTransportPlayback({
  transportHook,
  transportState,
  playbackSpeed,
  totalDurationValue,
  currentSceneIndex,
  scenes,
  pixiReady,
  renderAtRef,
  onBeforePlay,
  onPlayingChange,
  setCurrentTime,
  setTotalDuration,
}: UseProTransportPlaybackParams) {
  useEffect(() => {
    if (totalDurationValue > 0) {
      transportHook.setTotalDuration(totalDurationValue)
    }
  }, [totalDurationValue, transportHook])

  useEffect(() => {
    transportHook.setRate(playbackSpeed)
  }, [transportHook, playbackSpeed])

  useEffect(() => {
    if (!transportState.isPlaying) return

    const updateCurrentTime = () => {
      setCurrentTime(transportHook.getTime())
    }

    let rafId: number | null = null
    const loop = () => {
      if (transportState.isPlaying) {
        updateCurrentTime()
        rafId = requestAnimationFrame(loop)
      }
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [transportHook, transportState.isPlaying, setCurrentTime])

  useEffect(() => {
    setTotalDuration(transportState.totalDuration)
  }, [setTotalDuration, transportState.totalDuration])

  // 씬 선택 시 또는 초기 로드 시(pixiReady가 true가 될 때) 해당 씬의 시작 시간으로 이동
  const lastPixiReadyRef = useRef(false)
  useEffect(() => {
    if (transportState.isPlaying || currentSceneIndex < 0 || !pixiReady) {
      lastPixiReadyRef.current = pixiReady
      return
    }

    // pixiReady가 false에서 true로 변경되었거나, currentSceneIndex가 변경된 경우 실행
    const pixiReadyChanged = !lastPixiReadyRef.current && pixiReady
    lastPixiReadyRef.current = pixiReady

    const sceneStartTime = getPlayableSceneStartTime(scenes, currentSceneIndex)
    if (sceneStartTime === null) {
      const scene = scenes[currentSceneIndex]
      console.warn('[ProPlayback] 씬을 재생할 수 없음 (isPlayableSegment=false):', {
        currentSceneIndex,
        videoUrl: scene?.videoUrl,
        ttsDuration: scene?.ttsDuration,
        selectionStartSeconds: scene?.selectionStartSeconds,
        selectionEndSeconds: scene?.selectionEndSeconds,
      })
      return
    }

    // 초기 로드 시에는 0초로 초기화, 그 외에는 씬 시작 시간으로 이동
    const targetTime = pixiReadyChanged ? 0 : sceneStartTime
    transportHook.seek(targetTime)
    if (renderAtRef.current) {
      renderAtRef.current(targetTime, { forceSceneIndex: currentSceneIndex })
    }
  }, [transportHook, currentSceneIndex, scenes, transportState.isPlaying, pixiReady, renderAtRef])

  useEffect(() => {
    onPlayingChange?.(transportState.isPlaying)
  }, [onPlayingChange, transportState.isPlaying])

  const handlePlayPause = useCallback(() => {
    if (transportState.isPlaying) {
      onPlayingChange?.(false)
      transportHook.pause()
    } else {
      if (onBeforePlay && !onBeforePlay()) {
        return
      }

      let playTime = transportHook.getTime()
      const selectedSceneStartTime = getPlayableSceneStartTime(scenes, currentSceneIndex)
      if (selectedSceneStartTime !== null) {
        playTime = selectedSceneStartTime
        transportHook.seek(playTime)
        setCurrentTime(playTime)
      }

      if (renderAtRef.current) {
        renderAtRef.current(playTime, {
          skipAnimation: false,
          forceSceneIndex: selectedSceneStartTime !== null ? currentSceneIndex : undefined,
        })
      }
      onPlayingChange?.(true)
      transportHook.play()
    }
  }, [
    currentSceneIndex,
    onBeforePlay,
    onPlayingChange,
    renderAtRef,
    scenes,
    setCurrentTime,
    transportHook,
    transportState.isPlaying,
  ])

  return {
    handlePlayPause,
  }
}
