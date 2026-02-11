import { useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import * as PIXI from 'pixi.js'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/components/ProSceneListPanel'
import {
  clampPlaybackTime,
  getPlayableScenes,
  getPreviousPlayableDuration,
  hasRecentGesture,
  type PlayableScene,
} from '@/app/video/create/pro/step3/utils/proPlaybackUtils'

interface UseVideoSegmentPlayerParams {
  isPlaying: boolean
  pixiReady: boolean
  scenes: ProStep3Scene[]
  totalDurationValue: number
  playbackSpeed: number
  loadVideoAsSprite: (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number) => Promise<void>
  renderSubtitle: (sceneIndex: number, script: string) => void
  playTts: (sceneIndex: number, voiceTemplate: string | null | undefined, script: string) => Promise<void>
  onPlayPause: () => void
  setCurrentSceneIndex: (index: number) => void
  setCurrentTime: (time: number) => void
  setTotalDuration: (duration: number) => void
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  ttsAudioRefsRef: React.MutableRefObject<Map<number, HTMLAudioElement>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
}

interface VideoEventListeners {
  timeupdate: () => void
  ended: () => void
}

const USER_GESTURE_TTL_MS = 3000

export function useVideoSegmentPlayer({
  isPlaying,
  pixiReady,
  scenes,
  totalDurationValue,
  playbackSpeed,
  loadVideoAsSprite,
  renderSubtitle,
  playTts,
  onPlayPause,
  setCurrentSceneIndex,
  setCurrentTime,
  setTotalDuration,
  videoElementsRef,
  spritesRef,
  ttsAudioRefsRef,
  textsRef,
}: UseVideoSegmentPlayerParams) {
  const currentSegmentIndexRef = useRef(0)
  const userGestureRef = useRef<{ timestamp: number } | null>(null)
  const isInitialMountRef = useRef(true)

  const videoEventListenersRef = useRef<Map<number, VideoEventListeners>>(new Map())
  const scenesRef = useRef(scenes)
  const totalDurationRef = useRef(totalDurationValue)
  const playSegmentRef = useRef<((
    segmentIndex: number,
    playableScene: PlayableScene,
    previousDuration: number,
    onSegmentEnd: () => void
  ) => Promise<boolean>) | null>(null)

  const clearVideoListeners = useCallback((sceneIndex: number) => {
    const video = videoElementsRef.current.get(sceneIndex)
    const listeners = videoEventListenersRef.current.get(sceneIndex)

    if (video && listeners) {
      video.removeEventListener('timeupdate', listeners.timeupdate)
      video.removeEventListener('ended', listeners.ended)
    }

    videoEventListenersRef.current.delete(sceneIndex)
  }, [videoElementsRef])

  const stopSegment = useCallback((sceneIndex: number) => {
    const video = videoElementsRef.current.get(sceneIndex)
    if (video) {
      video.pause()
    }
    clearVideoListeners(sceneIndex)
  }, [clearVideoListeners, videoElementsRef])

  const stopAllSegments = useCallback(() => {
    videoElementsRef.current.forEach((_, sceneIndex) => {
      stopSegment(sceneIndex)
    })
  }, [stopSegment, videoElementsRef])

  const stopAllTts = useCallback(() => {
    ttsAudioRefsRef.current.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    ttsAudioRefsRef.current.clear()
  }, [ttsAudioRefsRef])

  const hideAllVisuals = useCallback(() => {
    spritesRef.current.forEach((sprite) => {
      if (sprite && !sprite.destroyed) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })

    textsRef.current.forEach((textObj) => {
      if (textObj && !textObj.destroyed) {
        textObj.visible = false
        textObj.alpha = 0
      }
    })
  }, [spritesRef, textsRef])

  const updatePlaybackTime = useCallback(
    (video: HTMLVideoElement, sceneStartTime: number, previousDuration: number) => {
      if (!isPlaying) {
        return
      }

      const segmentProgress = video.currentTime - sceneStartTime
      const currentTotalTime = previousDuration + segmentProgress
      const clamped = clampPlaybackTime(currentTotalTime, totalDurationRef.current)
      setCurrentTime(clamped)
    },
    [isPlaying, setCurrentTime]
  )

  const playSegment = useCallback(async (
    segmentIndex: number,
    playableScene: PlayableScene,
    previousDuration: number,
    onSegmentEnd: () => void
  ): Promise<boolean> => {
    const { scene, originalIndex } = playableScene

    if (!scene.videoUrl) {
      return false
    }

    try {
      // 최신 scene 객체에서 selectionStartSeconds를 직접 전달하여 즉시 반영
      const selectionStart = scene.selectionStartSeconds ?? 0
      await loadVideoAsSprite(originalIndex, scene.videoUrl, selectionStart)

      const video = videoElementsRef.current.get(originalIndex)
      const sprite = spritesRef.current.get(originalIndex)

      if (!video || !sprite || sprite.destroyed) {
        return false
      }

      // 현재 세그먼트 외 정리
      videoElementsRef.current.forEach((_, sceneIndex) => {
        if (sceneIndex !== originalIndex) {
          stopSegment(sceneIndex)
        }
      })

      spritesRef.current.forEach((spriteItem, sceneIndex) => {
        if (sceneIndex !== originalIndex && spriteItem && !spriteItem.destroyed) {
          spriteItem.visible = false
          spriteItem.alpha = 0
        }
      })

      setCurrentSceneIndex(originalIndex)
      sprite.visible = true
      sprite.alpha = 1

      renderSubtitle(originalIndex, scene.script ?? '')
      if (scene.voiceTemplate && scene.script) {
        void playTts(originalIndex, scene.voiceTemplate, scene.script).catch(console.error)
      }

      const sceneStartTime = scene.selectionStartSeconds ?? 0
      const sceneEndTime = Math.max(sceneStartTime, scene.selectionEndSeconds ?? sceneStartTime)

      // 원본 영상 소리 끄기
      video.muted = true

      // 비디오가 정확한 시작 시간에서 시작되도록 보장
      if (Math.abs(video.currentTime - sceneStartTime) > 0.1) {
        video.currentTime = sceneStartTime
        // seek가 완료될 때까지 대기
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked)
            resolve()
          }
          video.addEventListener('seeked', onSeeked)
          // 이미 해당 시간에 있으면 seeked 이벤트가 발생하지 않을 수 있음
          if (Math.abs(video.currentTime - sceneStartTime) < 0.1) {
            video.removeEventListener('seeked', onSeeked)
            resolve()
          }
          // 타임아웃: 500ms 내에 seeked가 발생하지 않으면 진행
          setTimeout(() => {
            video.removeEventListener('seeked', onSeeked)
            resolve()
          }, 500)
        })
      }
      
      video.playbackRate = playbackSpeed

      clearVideoListeners(originalIndex)

      const handleSegmentEnd = () => {
        stopSegment(originalIndex)
        onSegmentEnd()
      }

      const handleTimeUpdate = () => {
        if (!isPlaying) {
          stopSegment(originalIndex)
          return
        }

        updatePlaybackTime(video, sceneStartTime, previousDuration)

        if (video.currentTime >= sceneEndTime) {
          handleSegmentEnd()
        }
      }

      const handleEnded = () => {
        if (!isPlaying) {
          stopSegment(originalIndex)
          return
        }

        handleSegmentEnd()
      }

      video.addEventListener('timeupdate', handleTimeUpdate)
      video.addEventListener('ended', handleEnded)
      videoEventListenersRef.current.set(originalIndex, {
        timeupdate: handleTimeUpdate,
        ended: handleEnded,
      })

      if (segmentIndex === 0) {
        const gestureTimestamp = userGestureRef.current?.timestamp
        if (!hasRecentGesture(gestureTimestamp, Date.now(), USER_GESTURE_TTL_MS)) {
          onPlayPause()
          return false
        }
        userGestureRef.current = null
      }

      const playPromise = video.play()
      if (playPromise !== undefined) {
        await playPromise
      }

      return true
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        onPlayPause()
        return false
      }

      console.error('[useVideoSegmentPlayer] 세그먼트 재생 오류:', error)
      return false
    }
  }, [
    clearVideoListeners,
    isPlaying,
    loadVideoAsSprite,
    onPlayPause,
    playbackSpeed,
    playTts,
    renderSubtitle,
    setCurrentSceneIndex,
    spritesRef,
    stopSegment,
    updatePlaybackTime,
    videoElementsRef,
  ])

  useLayoutEffect(() => {
    scenesRef.current = scenes
    totalDurationRef.current = totalDurationValue
    playSegmentRef.current = playSegment
  }, [scenes, totalDurationValue, playSegment])

  useEffect(() => {
    if (!isPlaying || !pixiReady) {
      return
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      const gestureTimestamp = userGestureRef.current?.timestamp
      if (!hasRecentGesture(gestureTimestamp, Date.now(), USER_GESTURE_TTL_MS)) {
        onPlayPause()
        return
      }
    }

    const initialPlayableScenes = getPlayableScenes(scenesRef.current)
    if (initialPlayableScenes.length === 0) {
      onPlayPause()
      return
    }

    currentSegmentIndexRef.current = 0

    const durationTimeoutId = setTimeout(() => {
      setTotalDuration(totalDurationRef.current)
    }, 0)

    let cancelled = false

    const playNextSegment = async () => {
      if (cancelled) {
        return
      }

      const playableScenes = getPlayableScenes(scenesRef.current)
      const segmentIndex = currentSegmentIndexRef.current

      if (segmentIndex >= playableScenes.length) {
        setCurrentTime(totalDurationRef.current)
        onPlayPause()
        return
      }

      const playableScene = playableScenes[segmentIndex]
      if (!playableScene) {
        currentSegmentIndexRef.current += 1
        void playNextSegment()
        return
      }

      const previousDuration = getPreviousPlayableDuration(playableScenes, segmentIndex)
      const playSegmentFn = playSegmentRef.current
      if (!playSegmentFn) {
        return
      }

      const success = await playSegmentFn(
        segmentIndex,
        playableScene,
        previousDuration,
        () => {
          currentSegmentIndexRef.current += 1
          void playNextSegment()
        }
      )

      if (!success && !cancelled) {
        currentSegmentIndexRef.current += 1
        void playNextSegment()
      }
    }

    void playNextSegment()

    return () => {
      cancelled = true
      clearTimeout(durationTimeoutId)
      stopAllSegments()
      stopAllTts()
      hideAllVisuals()
      setCurrentTime(0)
    }
  }, [
    hideAllVisuals,
    isPlaying,
    onPlayPause,
    pixiReady,
    setCurrentTime,
    setTotalDuration,
    stopAllSegments,
    stopAllTts,
  ])

  const trackUserGesture = useCallback(() => {
    if (!isPlaying) {
      userGestureRef.current = { timestamp: Date.now() }
    }
  }, [isPlaying])

  return {
    trackUserGesture,
  }
}
