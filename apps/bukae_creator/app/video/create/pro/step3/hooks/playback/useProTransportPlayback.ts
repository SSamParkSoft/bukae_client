'use client'

import { useCallback, useEffect } from 'react'
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
    ((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined
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

  useEffect(() => {
    if (transportState.isPlaying || currentSceneIndex < 0 || !pixiReady) {
      return
    }

    const sceneStartTime = getPlayableSceneStartTime(scenes, currentSceneIndex)
    if (sceneStartTime === null) {
      return
    }

    transportHook.seek(sceneStartTime)
    if (renderAtRef.current) {
      renderAtRef.current(sceneStartTime, { forceSceneIndex: currentSceneIndex })
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
