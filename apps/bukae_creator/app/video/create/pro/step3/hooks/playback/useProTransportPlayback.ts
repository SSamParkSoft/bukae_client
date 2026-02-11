'use client'

import { useCallback, useEffect } from 'react'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { getPlayableSceneStartTime } from '../../utils/proPlaybackUtils'

interface TransportHookLike {
  currentTime: number
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
  isPlaying: boolean
  playbackSpeed: number
  totalDurationValue: number
  currentSceneIndex: number
  scenes: ProStep3Scene[]
  pixiReady: boolean
  renderAtRef: React.MutableRefObject<
    ((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined
  >
  onPlayPause: () => void
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>
  setTotalDuration: React.Dispatch<React.SetStateAction<number>>
}

export function useProTransportPlayback({
  transportHook,
  transportState,
  isPlaying,
  playbackSpeed,
  totalDurationValue,
  currentSceneIndex,
  scenes,
  pixiReady,
  renderAtRef,
  onPlayPause,
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
    if (isPlaying && !transportState.isPlaying) {
      transportHook.play()
    } else if (!isPlaying && transportState.isPlaying) {
      transportHook.pause()
    }
  }, [transportHook, isPlaying, transportState.isPlaying])

  useEffect(() => {
    if (!transportState.isPlaying) return

    const updateCurrentTime = () => {
      setCurrentTime(transportHook.currentTime)
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
    if (isPlaying || currentSceneIndex < 0 || !pixiReady) {
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
  }, [transportHook, currentSceneIndex, scenes, isPlaying, pixiReady, renderAtRef])

  const handlePlayPause = useCallback(() => {
    if (transportState.isPlaying) {
      transportHook.pause()
    } else {
      if (renderAtRef.current) {
        renderAtRef.current(transportHook.currentTime, { skipAnimation: false })
      }
      transportHook.play()
    }
    onPlayPause()
  }, [onPlayPause, renderAtRef, transportHook, transportState.isPlaying])

  return {
    handlePlayPause,
  }
}
