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
  videoTexturesRef: React.MutableRefObject<Map<number, PIXI.Texture>>
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
  videoTexturesRef,
  ttsAudioRefsRef,
  textsRef,
}: UseVideoSegmentPlayerParams) {
  const currentSegmentIndexRef = useRef(0)
  const userGestureRef = useRef<{ timestamp: number } | null>(null)
  const isInitialMountRef = useRef(true)

  const videoEventListenersRef = useRef<Map<number, VideoEventListeners>>(new Map())
  const segmentTimersRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map())
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
    
    // 세그먼트 타이머 정리
    const timerId = segmentTimersRef.current.get(sceneIndex)
    if (timerId) {
      clearInterval(timerId)
      segmentTimersRef.current.delete(sceneIndex)
    }
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
    
    // 모든 세그먼트 타이머 정리
    segmentTimersRef.current.forEach((timerId) => {
      clearInterval(timerId)
    })
    segmentTimersRef.current.clear()
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
      const videoSegmentEndTime = Math.max(sceneStartTime, scene.selectionEndSeconds ?? sceneStartTime)
      
      // TTS duration을 기준으로 씬 duration 결정 (Fast track과 동일한 로직)
      // TTS duration이 있으면 우선 사용하고, 없으면 비디오 세그먼트 duration 사용
      const sceneDuration = scene.ttsDuration && scene.ttsDuration > 0
        ? scene.ttsDuration
        : videoSegmentEndTime - sceneStartTime
      
      // 씬 시작 시간 (TTS duration 기준)
      const sceneStartTimeForPlayback = previousDuration
      // 씬 종료 시간 (TTS duration 기준)
      const sceneEndTimeForPlayback = previousDuration + sceneDuration

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

      // 재생 시작 시간 기록 (TTS duration 기준)
      const playbackStartTime = Date.now()
      const playbackStartDuration = previousDuration

      const handleSegmentEnd = () => {
        stopSegment(originalIndex)
        onSegmentEnd()
      }

      // 마지막 씬인지 확인
      const playableScenes = getPlayableScenes(scenesRef.current)
      const isLastScene = segmentIndex === playableScenes.length - 1

      const handleTimeUpdate = () => {
        if (!isPlaying) {
          stopSegment(originalIndex)
          return
        }

        // TTS duration 기준으로 재생 시간 업데이트
        const elapsedTime = (Date.now() - playbackStartTime) / 1000
        const currentTotalTime = playbackStartDuration + elapsedTime
        
        // TTS duration 기준 종료 시간에 도달하면 종료
        if (currentTotalTime >= sceneEndTimeForPlayback) {
          handleSegmentEnd()
          return
        }
        
        setCurrentTime(clampPlaybackTime(currentTotalTime, totalDurationRef.current))
        
        // 비디오 세그먼트가 끝나면 비디오를 정지하되, TTS가 계속 재생되도록 함
        // TTS duration이 비디오 세그먼트보다 길면 비디오는 멈추고 TTS만 계속 재생
        // 마지막 씬이 아닌 경우에만 비디오를 정지 (마지막 씬은 마지막 프레임 유지)
        if (video.currentTime >= videoSegmentEndTime && !isLastScene) {
          video.pause()
        } else if (video.currentTime >= videoSegmentEndTime && isLastScene) {
          // 마지막 씬에서는 비디오를 정지하되 마지막 프레임을 유지하기 위해 VideoTexture 업데이트
          video.pause()
          // 마지막 프레임을 보여주기 위해 VideoTexture 업데이트
          const texture = videoTexturesRef.current.get(originalIndex)
          if (texture && !texture.destroyed && typeof (texture as { update?: () => void }).update === 'function') {
            try {
              ;(texture as { update: () => void }).update()
            } catch (error) {
              console.warn('[useVideoSegmentPlayer] VideoTexture 업데이트 실패:', error)
            }
          }
        }
      }

      const handleEnded = () => {
        if (!isPlaying) {
          stopSegment(originalIndex)
          return
        }

        // 비디오가 끝났지만 TTS가 아직 재생 중일 수 있음
        // TTS duration 기준으로 종료 시간을 확인
        const elapsedTime = (Date.now() - playbackStartTime) / 1000
        const currentTotalTime = playbackStartDuration + elapsedTime
        
        // 마지막 씬인 경우 비디오가 끝나도 마지막 프레임을 유지
        if (isLastScene) {
          // 마지막 프레임을 보여주기 위해 VideoTexture 업데이트
          const texture = videoTexturesRef.current.get(originalIndex)
          if (texture && !texture.destroyed && typeof (texture as { update?: () => void }).update === 'function') {
            try {
              ;(texture as { update: () => void }).update()
            } catch (error) {
              console.warn('[useVideoSegmentPlayer] VideoTexture 업데이트 실패:', error)
            }
          }
        }
        
        // TTS duration 기준 종료 시간에 도달했으면 종료
        if (currentTotalTime >= sceneEndTimeForPlayback) {
          handleSegmentEnd()
        }
        // 비디오만 끝났고 TTS가 아직 재생 중이면 비디오만 멈추고 TTS는 계속 재생
        // (handleTimeUpdate에서 TTS duration 기준으로 종료 처리)
      }

      // TTS duration 기준 타이머 설정 (비디오 timeupdate보다 정확)
      // 기존 타이머가 있으면 정리
      const existingTimer = segmentTimersRef.current.get(originalIndex)
      if (existingTimer) {
        clearInterval(existingTimer)
      }
      
      const segmentTimerId = setInterval(() => {
        if (!isPlaying) {
          clearInterval(segmentTimerId)
          segmentTimersRef.current.delete(originalIndex)
          return
        }
        
        const elapsedTime = (Date.now() - playbackStartTime) / 1000
        const currentTotalTime = playbackStartDuration + elapsedTime
        
        // TTS duration 기준 종료 시간에 도달하면 종료
        if (currentTotalTime >= sceneEndTimeForPlayback) {
          clearInterval(segmentTimerId)
          segmentTimersRef.current.delete(originalIndex)
          handleSegmentEnd()
          return
        }
        
        setCurrentTime(clampPlaybackTime(currentTotalTime, totalDurationRef.current))
      }, 16) // ~60fps 업데이트
      
      segmentTimersRef.current.set(originalIndex, segmentTimerId)

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
    setCurrentTime,
    spritesRef,
    stopSegment,
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
