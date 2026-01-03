'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import { bgmTemplates, getBgmTemplateUrlSync } from '@/lib/data/templates'

interface UseVideoPlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  bgmTemplate: string | null
  playbackSpeed: number
  currentSceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  updateCurrentScene: (skipAnimation?: boolean, prevIndex?: number | null, forceTransition?: string, onComplete?: (sceneIndex?: number) => void, isPlaying?: boolean, partIndex?: number | null, sceneIndex?: number) => void
  setTimeline: (timeline: TimelineData) => void
  buildSceneMarkup: (sceneIndex: number) => string[]
  makeTtsKey: (voice: string, markup: string) => string
  getMp3DurationSec: (blob: Blob) => Promise<number>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  appRef: React.RefObject<PIXI.Application | null>
  selectScene: (index: number, skipStopPlaying?: boolean, onTransitionComplete?: () => void) => void
  setIsPreparing?: (preparing: boolean) => void
  setIsTtsBootstrapping?: (bootstrapping: boolean) => void
  setIsBgmBootstrapping?: (bootstrapping: boolean) => void
  isTtsBootstrappingRef?: React.MutableRefObject<boolean>
  isBgmBootstrappingRef?: React.MutableRefObject<boolean>
  changedScenesRef?: React.MutableRefObject<Set<number>>
  ensureSceneTts?: (sceneIndex: number, signal?: AbortSignal, forceRegenerate?: boolean) => Promise<{
    sceneIndex: number
    parts: Array<{
      blob: Blob
      durationSec: number
      url: string | null
      partIndex: number
      markup: string
    }>
  }>
  pixiReady?: boolean
  spritesRef?: React.MutableRefObject<Map<number, PIXI.Sprite>>
  loadAllScenes?: () => Promise<void>
  setShowReadyMessage?: (show: boolean) => void
  setCurrentTime?: (time: number) => void
  renderSceneContent?: (
    sceneIndex: number,
    partIndex?: number | null,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      updateTimeline?: boolean
      prepareOnly?: boolean
      isPlaying?: boolean
    }
  ) => void
  renderSceneImage?: (
    sceneIndex: number,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  renderSubtitlePart?: (
    sceneIndex: number,
    partIndex: number,
    options?: {
      skipAnimation?: boolean
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  prepareImageAndSubtitle?: (
    sceneIndex: number,
    partIndex?: number,
    options?: {
      onComplete?: () => void
    }
  ) => void
  setIsPreviewingTransition?: (previewing: boolean) => void
  setTimelineIsPlaying?: (playing: boolean) => void
}

export function useVideoPlayback({
  timeline,
  voiceTemplate,
  bgmTemplate,
  playbackSpeed,
  currentSceneIndex,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  updateCurrentScene,
  setTimeline,
  buildSceneMarkup,
  makeTtsKey,
  getMp3DurationSec: _getMp3DurationSec, // eslint-disable-line @typescript-eslint/no-unused-vars
  textsRef,
  appRef,
  selectScene: _selectScene, // eslint-disable-line @typescript-eslint/no-unused-vars
  setIsPreparing,
  setIsTtsBootstrapping,
  setIsBgmBootstrapping,
  isTtsBootstrappingRef,
  isBgmBootstrappingRef,
  changedScenesRef,
  ensureSceneTts,
  pixiReady,
  spritesRef,
  loadAllScenes,
  setShowReadyMessage,
  setCurrentTime,
  renderSceneContent,
  renderSceneImage,
  renderSubtitlePart,
  prepareImageAndSubtitle,
  setIsPreviewingTransition,
  setTimelineIsPlaying,
}: UseVideoPlaybackParams) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparing, setIsPreparingLocal] = useState(false)
  const isPlayingRef = useRef(false)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bgmStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bgmStartTimeRef = useRef<number | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 재생 제어용 AbortController 및 재생 중인 씬 인덱스 추적
  const playbackAbortControllerRef = useRef<AbortController | null>(null)
  const currentPlayingSceneIndexRef = useRef<number | null>(null)
  
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
  
  // BGM 재생 관련 refs
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
  const bgmAudioUrlRef = useRef<string | null>(null)

  // isPlaying 상태와 ref 동기화
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // isPreparing 상태 동기화
  useEffect(() => {
    if (setIsPreparing) {
      setIsPreparing(isPreparing)
    }
  }, [isPreparing, setIsPreparing])

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
    
    // TTS 정지 시 재생바 업데이트 interval 정리 (타임라인 업데이트 중지)
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
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

  // BGM 오디오 정지
  const stopBgmAudio = useCallback(() => {
    const a = bgmAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    bgmAudioRef.current = null
    if (bgmAudioUrlRef.current) {
      URL.revokeObjectURL(bgmAudioUrlRef.current)
      bgmAudioUrlRef.current = null
    }
  }, [])

  // BGM 오디오 시작
  const startBgmAudio = useCallback(async (templateId: string | null, playbackSpeed: number, shouldPlay: boolean = false): Promise<void> => {
    if (!templateId) {
      stopBgmAudio()
      return
    }

    const template = bgmTemplates.find(t => t.id === templateId)
    if (!template) {
      stopBgmAudio()
      return
    }

    try {
      const url = getBgmTemplateUrlSync(template)
      if (!url) {
        stopBgmAudio()
        return
      }

      // URL이 유효한지 확인
      if (!url.startsWith('http') && !url.startsWith('/')) {
        stopBgmAudio()
        return
      }

      // URL이 실제로 접근 가능한지 확인
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (!response.ok) {
          stopBgmAudio()
          return
        }
      } catch {
        stopBgmAudio()
        return
      }

      stopBgmAudio()
      const audio = new Audio(url)
      audio.loop = true
      audio.playbackRate = playbackSpeed
      audio.volume = 0.3 // BGM 볼륨을 0.3으로 설정
      bgmAudioRef.current = audio
      
      // 재생해야 하는 경우에만 재생
      if (shouldPlay) {
        // BGM이 실제로 재생될 때까지 기다리는 Promise
        const playingPromise = new Promise<void>((resolve, reject) => {
          let resolved = false
          
          const handlePlaying = () => {
            if (!resolved) {
              resolved = true
              // BGM 재생 시작 시점 기록
              bgmStartTimeRef.current = Date.now()
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              resolve()
            }
          }
          
          const handleError = () => {
            if (!resolved) {
              resolved = true
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              stopBgmAudio()
              reject(new Error('BGM 재생 실패'))
            }
          }
          
          audio.addEventListener('playing', handlePlaying)
          audio.addEventListener('error', handleError)
          
          // play() 호출
          audio.play().catch((err) => {
            if (!resolved) {
              resolved = true
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              reject(err)
            }
          })
        })
        
        // 실제 재생이 시작될 때까지 기다림
        await playingPromise
      } else {
        // 로드만 하고 재생은 하지 않음
        // audio.load()를 호출하여 메타데이터 로드
        audio.load()
      }
    } catch {
      stopBgmAudio()
    }
  }, [stopBgmAudio])

  // 재생 시작
  const startPlayback = useCallback(() => {
    console.log(`[startPlayback] 함수 호출됨 | timeline: ${!!timeline}`)
    if (!timeline) {
      console.warn(`[startPlayback] timeline이 null이므로 종료`)
      return
    }
    
    console.log(`[startPlayback] 재생 시작 준비`)
    // AbortController 생성 (재생 중지 시 Promise 체인 중단)
    playbackAbortControllerRef.current = new AbortController()
    currentPlayingSceneIndexRef.current = null
    
    if (setShowReadyMessage) {
      setShowReadyMessage(false)
    }
    // 즉시 ref 업데이트 (상태 업데이트 전에 ref를 먼저 업데이트하여 즉시 반영)
    isPlayingRef.current = true
    setIsPlaying(true)
    
    // 재생 시작 시간 기록
    const playbackStartTime = Date.now()
    
    // 재생 버튼 클릭 시 TTS duration 계산 및 Timeline 업데이트
    console.log(`[재생] 재생 버튼 클릭 - TTS duration 계산 및 Timeline 업데이트`)
    
    // 현재 Timeline 총 길이 계산 (23.5초가 어디서 나오는지 확인)
    const currentTotalDuration = timeline.scenes.reduce((sum, scene, index) => {
      const isLastScene = index === timeline.scenes.length - 1
      const transitionDuration = isLastScene ? 0 : (scene.transitionDuration || 0.5)
      return sum + scene.duration + transitionDuration
    }, 0)
    console.log(`[Timeline 분석] 현재 Timeline 총 길이: ${currentTotalDuration.toFixed(2)}초`)
    timeline.scenes.forEach((scene, index) => {
      console.log(`[Timeline 분석]   씬 ${index}: duration=${scene.duration.toFixed(2)}초`)
    })
    
    const sceneDurations: Array<{ sceneIndex: number; duration: number }> = []
    
    // 모든 씬의 TTS duration 계산 (캐시에 있는 것만)
    for (let i = 0; i < timeline.scenes.length; i++) {
      const markups = buildSceneMarkup(i)
      let sceneDuration = 0
      let hasCachedTts = false
      
      for (let partIndex = 0; partIndex < markups.length; partIndex++) {
        const markup = markups[partIndex]
        const key = makeTtsKey(voiceTemplate!, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached && cached.durationSec > 0) {
          sceneDuration += cached.durationSec
          hasCachedTts = true
        }
      }
      
      const currentTimelineDuration = timeline.scenes[i]?.duration || 0
      console.log(`[Timeline 분석] 씬 ${i}: Timeline=${currentTimelineDuration.toFixed(2)}초, TTS 캐시=${sceneDuration.toFixed(2)}초 (${hasCachedTts ? '있음' : '없음'})`)
      
      // 캐시에 TTS가 있으면 duration 사용
      if (hasCachedTts && sceneDuration > 0) {
        if (Math.abs(sceneDuration - currentTimelineDuration) > 0.05) {
          sceneDurations.push({ sceneIndex: i, duration: sceneDuration })
        }
      }
    }
    
    // Timeline 업데이트 (실제 TTS duration 사용, 제한 없음)
    if (sceneDurations.length > 0 && setTimeline) {
      const updatedScenes = timeline.scenes.map((scene, index) => {
        const ttsDuration = sceneDurations.find(s => s.sceneIndex === index)
        if (ttsDuration) {
          // 최소 0.5초만 유지, 최대 제한 없음 (실제 duration 그대로 사용)
          const clamped = Math.max(0.5, ttsDuration.duration)
          console.log(`[Timeline 업데이트] 씬 ${index}: ${scene.duration.toFixed(2)}초 → ${clamped.toFixed(2)}초 (실제 TTS duration)`)
          return { ...scene, duration: clamped }
        }
        return scene
      })
      
      const newTimeline = {
        ...timeline,
        scenes: updatedScenes,
      }
      
      // 업데이트 후 총 길이 계산
      const updatedTotalDuration = updatedScenes.reduce((sum, scene, index) => {
        const isLastScene = index === updatedScenes.length - 1
        const transitionDuration = isLastScene ? 0 : (scene.transitionDuration || 0.5)
        return sum + scene.duration + transitionDuration
      }, 0)
      
      setTimeline(newTimeline)
      console.log(`[Timeline 업데이트] ✅ ${sceneDurations.length}개 씬 duration 업데이트 완료`)
      console.log(`[Timeline 업데이트] 업데이트 후 총 길이: ${updatedTotalDuration.toFixed(2)}초 (이전: ${currentTotalDuration.toFixed(2)}초)`)
    } else {
      console.log(`[Timeline 업데이트] 업데이트할 씬이 없음 (sceneDurations.length=${sceneDurations.length}, setTimeline=${!!setTimeline})`)
    }
    
    console.log(`[재생] 재생 시작 (씬 ${currentSceneIndex}부터)`)
    
    // BGM 페이드 아웃 설정 (Timeline duration 기반)
    const setupBgmFadeOut = () => {
      if (!bgmTemplate || !bgmAudioRef.current) return
      
      // Timeline 기반 총 길이 계산
      const totalTimelineDuration = timeline.scenes.reduce((sum, scene, index) => {
        const isLastScene = index === timeline.scenes.length - 1
        const transitionDuration = isLastScene ? 0 : (scene.transitionDuration || 0.5)
        return sum + scene.duration + transitionDuration
      }, 0)
      
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      const totalTimeMs = (totalTimelineDuration * 1000) / speed
      const fadeDuration = 1000 // 1초 페이드
      const fadeStartTime = Math.max(0, totalTimeMs - fadeDuration)
      
      if (fadeStartTime > 0) {
        setTimeout(() => {
          if (!bgmAudioRef.current) return
          
          const audio = bgmAudioRef.current
          const startVolume = audio.volume
          const fadeInterval = 50 // 50ms마다 volume 조절
          const volumeStep = startVolume / (fadeDuration / fadeInterval)
          
          const fadeTimer = setInterval(() => {
            if (!bgmAudioRef.current) {
              clearInterval(fadeTimer)
              return
            }
            
            bgmAudioRef.current.volume = Math.max(0, bgmAudioRef.current.volume - volumeStep)
            
            if (bgmAudioRef.current.volume <= 0) {
              clearInterval(fadeTimer)
              stopBgmAudio()
            }
          }, fadeInterval)
        }, fadeStartTime)
      } else {
        // 페이드 시간이 없으면 즉시 정지
        setTimeout(() => {
          stopBgmAudio()
        }, totalTimeMs)
      }
    }
    
    // 실제 재생 시작 로직은 playNextScene에서 처리
    let bgmStarted = false // BGM이 시작되었는지 추적
    const actualPlaybackTimes: Array<{ sceneIndex: number; partIndex: number; expectedDuration: number; actualDuration: number; startTime: number; endTime: number }> = []
    
    const playNextScene = async (currentIndex: number) => {
      console.log(`[playNextScene] 함수 호출됨 | currentIndex: ${currentIndex}`)
      // AbortController 체크: 재생 중지되었으면 중단
      if (playbackAbortControllerRef.current?.signal.aborted) {
        console.log(`[재생] 씬 ${currentIndex} 재생 중지됨 (AbortController)`)
        return
      }
      
      if (currentIndex >= timeline.scenes.length) {
        // 재생 완료: 모든 재생 관련 로직 정지
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        if (playTimeoutRef.current) {
          clearTimeout(playTimeoutRef.current)
          playTimeoutRef.current = null
        }
        isPlayingRef.current = false
        setIsPlaying(false)
        stopBgmAudio()
        stopTtsAudio() // TTS 오디오도 정지
        playbackAbortControllerRef.current = null
        currentPlayingSceneIndexRef.current = null
        
        // 재생 완료
        const playbackEndTime = Date.now()
        const actualTotalDuration = playbackEndTime - playbackStartTime
        const actualTotalDurationSec = actualTotalDuration / 1000
        console.log(`[재생] 재생 완료: 총 재생 시간 ${actualTotalDurationSec.toFixed(2)}초`)
        
        return
      }
      
      // 재생 중인 씬 인덱스 추적
      currentPlayingSceneIndexRef.current = currentIndex
      
      const sceneIndex = currentIndex
      const scene = timeline.scenes[sceneIndex]
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      
      // 이전 씬의 모든 오디오와 렌더링 정지 (현재 씬만 재생되도록 보장)
      console.log(`[playNextScene] 씬 ${sceneIndex} 재생 시작 전 이전 씬 정리`)
      stopTtsAudio() // 이전 씬의 TTS 오디오 정지
      
      // 다른 모든 씬의 렌더링 중지 (현재 씬 제외)
      if (spritesRef && textsRef) {
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== sceneIndex) {
            sprite.visible = false
            sprite.alpha = 0
          }
        })
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== sceneIndex) {
            text.visible = false
            text.alpha = 0
          }
        })
      }
      
      // TTS 재생 함수를 먼저 정의 (renderSceneWithSync에서 사용하기 위해)
      // TTS 재생 함수 - 각 ||| 구간별로 순차 재생 (파일이 준비되는 대로 즉시 렌더링)
      const playTts = async (): Promise<boolean> => {
        try {
          // 원본 텍스트 저장
          const originalText = scene.text?.content || ''
          
          // ||| 기준으로 텍스트 배열로 나누기
          const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
          
          // 자막 리스트 콘솔 출력
          console.log(`[자막 리스트] 씬 ${sceneIndex} 원본 텍스트:`, originalText)
          console.log(`[자막 리스트] 씬 ${sceneIndex} 분할된 자막 개수:`, scriptParts.length)
          console.log(`[자막 리스트] 씬 ${sceneIndex} 자막 배열:`, scriptParts)
          scriptParts.forEach((part, index) => {
            console.log(`[자막 리스트] 씬 ${sceneIndex} 구간 ${index + 1}:`, part)
          })
          
          if (scriptParts.length === 0) {
            // TTS가 없으면 fallback duration 사용
            const fallbackDuration = scene.duration
            const waitTime = (fallbackDuration * 1000) / speed
            playTimeoutRef.current = setTimeout(async () => {
              if (isPlayingRef.current) {
                await playNextScene(currentIndex + 1)
              }
            }, waitTime)
            return false
          }

          // 첫 번째 구간의 TTS가 실제로 재생되기 시작한 후 씬 전환을 위한 플래그
          let firstPartStarted = false
          let firstPartStartTime = 0

          // 각 구간을 순차적으로 처리하면서 파일이 준비되는 대로 즉시 렌더링 (리스트 순서대로만)
          const playPart = async (partIndex: number): Promise<void> => {
            // AbortController 체크: 재생 중지되었으면 중단
            if (playbackAbortControllerRef.current?.signal.aborted) {
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex} 재생 중지됨 (AbortController)`)
              return
            }
            
            if (!isPlayingRef.current || partIndex >= scriptParts.length) {
              // 재생 중지되었거나 모든 구간 재생 완료
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex} 처리 완료 (총 ${scriptParts.length}개)`)
              return
            }

            // 리스트 순서대로만 처리 (partIndex는 0, 1, 2... 순서대로만 증가)
            console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1}/${scriptParts.length} 처리 시작 (리스트 인덱스: ${partIndex})`)
            
            const currentPartText = scriptParts[partIndex]?.trim() || ''
            
            if (!currentPartText) {
              console.warn(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 텍스트가 비어있음`)
              // 다음 구간으로
              if (partIndex < scriptParts.length - 1) {
                await playPart(partIndex + 1)
              }
              return
            }
            
            // 자막 즉시 표시 (리스트 순서대로 렌더링)
            // 단, 첫 번째 구간(partIndex === 0)은 통합 렌더링에서 이미 처리되므로 여기서는 건너뜀
            if (currentPartText && partIndex > 0) {
              // renderSubtitlePart 사용 (자막만 렌더링)
              // 각 구간에 맞게 구간 파싱하여 표시
              if (renderSubtitlePart) {
                // 두 번째 구간부터는 renderSubtitlePart 호출 (각 구간에 맞게 파싱)
                renderSubtitlePart(sceneIndex, partIndex, {
                  skipAnimation: true,
                })
                console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1}/${scriptParts.length} 자막 렌더링 (리스트 인덱스 ${partIndex}): "${currentPartText.substring(0, 30)}..."`)
              } else if (renderSceneContent) {
                // fallback: renderSceneContent 사용
                renderSceneContent(sceneIndex, partIndex, {
                  skipAnimation: true,
                  updateTimeline: true,
                })
                console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1}/${scriptParts.length} 자막 렌더링 (리스트 인덱스 ${partIndex}): "${currentPartText.substring(0, 30)}..."`)
              } else {
                // fallback: 기존 방식 (renderSceneContent가 없는 경우)
                // timeline 먼저 업데이트
                if (timeline && timeline.scenes[sceneIndex]) {
                  const updatedTimeline = {
                    ...timeline,
                    scenes: timeline.scenes.map((s, i) =>
                      i === sceneIndex
                        ? {
                            ...s,
                            text: {
                              ...s.text,
                              content: currentPartText,
                            },
                          }
                        : s
                    ),
                  }
                  setTimeline(updatedTimeline)
                }
                
                // 텍스트 객체 직접 업데이트 (즉시 반영) - 리스트 순서대로만 렌더링
                const currentText = textsRef.current.get(sceneIndex)
                if (currentText) {
                  currentText.text = currentPartText
                  currentText.visible = true
                  currentText.alpha = 1
                  console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1}/${scriptParts.length} 자막 렌더링 (리스트 인덱스 ${partIndex}): "${currentPartText.substring(0, 30)}..."`)
                } else {
                  console.warn(`[재생] 씬 ${sceneIndex} 텍스트 객체를 찾을 수 없음 (textsRef 크기: ${textsRef.current.size})`)
                }
              }
              
              // 자막은 이미 렌더링되었으므로 updateCurrentScene 호출 불필요 (씬 전환은 오디오 재생 시작 시 처리)
            }

            // 해당 구간의 TTS 파일 가져오기 (순차적으로 처리)
            const markups = buildSceneMarkup(sceneIndex)
            if (partIndex >= markups.length) {
              // 다음 구간으로
              if (partIndex < scriptParts.length - 1) {
                await playPart(partIndex + 1)
              } else {
                // 모든 구간 재생 완료, 다음 씬으로 이동
                const nextScene = currentIndex + 1 < timeline.scenes.length ? timeline.scenes[currentIndex + 1] : null
                const isNextInSameGroup = nextScene && nextScene.sceneId === scene.sceneId

                if (isNextInSameGroup) {
                  // 같은 그룹 내의 다음 씬으로 넘어갈 때는 자막만 변경
                  const nextIndex = currentIndex + 1
                  setCurrentSceneIndex(nextIndex)
                  currentSceneIndexRef.current = nextIndex
                  // 현재 씬의 첫 번째 구간 인덱스 계산 (구간이 나뉘어져 있으면 0, 아니면 null)
                  const currentScene = timeline.scenes[nextIndex]
                  const partIndex = currentScene?.text?.content?.includes('|||') ? 0 : null
                  
                  // lastRenderedSceneIndexRef는 updateCurrentScene 완료 후 업데이트되므로 여기서는 업데이트하지 않음
                  // 재생 중이므로 isPlaying: true
                  updateCurrentScene(false, currentIndex, undefined, () => {
                    // updateCurrentScene 완료 후 lastRenderedSceneIndexRef 업데이트
                    lastRenderedSceneIndexRef.current = nextIndex
                    // 같은 그룹 내 씬이므로 전환 효과 없이 바로 TTS 재생 시작
                    void playNextScene(nextIndex)
                  }, true, partIndex, nextIndex) // 현재 씬의 첫 번째 구간 인덱스 전달, sceneIndex: nextIndex 전달
                } else {
                  await playNextScene(currentIndex + 1)
                }
              }
              return
            }

            const markup = markups[partIndex]
            if (!markup) {
              // 다음 구간으로
              if (partIndex < scriptParts.length - 1) {
                await playPart(partIndex + 1)
              }
              return
            }

            // TTS 파일 가져오기 (캐시에서)
            const key = makeTtsKey(voiceTemplate!, markup)
            const cached = ttsCacheRef.current.get(key)
            
            if (!cached) {
              console.error(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 캐시 없음 - 재생 중지`)
              console.error(`[재생] TTS 키: ${key}`)
              console.error(`[재생] 캐시된 키 목록:`, Array.from(ttsCacheRef.current.keys()).slice(0, 10))
              // TTS 캐시가 없으면 재생 중지 (다음 구간/씬으로 넘어가지 않음)
              isPlayingRef.current = false
              setIsPlaying(false)
              if (setTimelineIsPlaying) {
                setTimelineIsPlaying(false)
              }
              return
            }

            const part = {
              blob: cached.blob,
              durationSec: cached.durationSec,
              url: cached.url,
              partIndex,
              markup,
            }

            if (!part || (!part.blob && !part.url)) {
              // TTS가 없으면 다음 구간으로
              console.warn(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 데이터 없음`)
              if (partIndex < scriptParts.length - 1) {
                await playPart(partIndex + 1)
              }
              return
            }
            
            // TTS duration이 없으면 에러
            if (!part.durationSec || part.durationSec <= 0) {
              console.error(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS duration이 없음`)
              // 다음 구간으로
              if (partIndex < scriptParts.length - 1) {
                await playPart(partIndex + 1)
              }
              return
            }

            // TTS 파일이 준비되었으므로 즉시 재생

            // TTS 재생: 저장소 URL이 있으면 우선 사용, 없으면 blob에서 URL 생성
            // 이전 오디오 URL 정리
            stopTtsAudio()
            let audioUrl: string | null = null
            if (part.url) {
              audioUrl = part.url
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 저장소 URL 사용: ${part.url.substring(0, 50)}...`)
            } else if (part.blob) {
              audioUrl = URL.createObjectURL(part.blob)
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} blob URL 생성`)
            }

            // TTS duration만큼 정확히 표시 (TTS duration을 기준으로 화면 전환 보장)
            const targetDuration = (part.durationSec * 1000) / speed
            console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS duration: ${part.durationSec}초, 재생 시간: ${targetDuration}ms (배속: ${speed})`)
            
            if (audioUrl) {
              ttsAudioUrlRef.current = audioUrl
              const audio = new Audio(audioUrl)
              audio.playbackRate = speed
              ttsAudioRef.current = audio

              await new Promise<void>((resolve, reject) => {
                // AbortController 체크
                if (playbackAbortControllerRef.current?.signal.aborted) {
                  reject(new Error('재생 중지됨'))
                  return
                }
                
                let startTime: number | null = null // audio.play() 호출 후 설정
                const partStartTime = Date.now()
                let resolved = false
                let audioActualDuration: number | null = null
                let playingEventListener: (() => void) | null = null
                let canplaythroughResolved = false

                const finish = () => {
                  if (resolved) return
                  resolved = true
                  
                  // 이벤트 리스너 정리
                  if (playingEventListener) {
                    audio.removeEventListener('playing', playingEventListener)
                    playingEventListener = null
                  }
                  
                  const endTime = Date.now()
                  const actualDuration = (endTime - partStartTime) / 1000
                  const expectedDuration = part.durationSec / speed
                  
                  // 실제 오디오 duration 확인
                  if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                    audioActualDuration = audio.duration / speed
                  }
                  
                  // 재생 시간 기록
                  actualPlaybackTimes.push({
                    sceneIndex,
                    partIndex,
                    expectedDuration,
                    actualDuration,
                    startTime: partStartTime,
                    endTime,
                  })
                  
                  // 구간별 상세 로그
                  const diff = actualDuration - expectedDuration
                  const diffPercent = (diff / expectedDuration) * 100
                  console.log(`[영상 길이 분석] 씬 ${sceneIndex} 구간 ${partIndex + 1} 완료: 예상=${expectedDuration.toFixed(2)}초, 실제=${actualDuration.toFixed(2)}초, 차이=${diff > 0 ? '+' : ''}${diff.toFixed(2)}초 (${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%)${audioActualDuration ? `, 오디오실제=${audioActualDuration.toFixed(2)}초` : ''}`)
                  
                  // Blob URL 정리
                  stopTtsAudio()
                  resolve()
                }

                // 첫 번째 구간의 재생 시작을 감지 (playing 이벤트)
                if (partIndex === 0 && !firstPartStarted) {
                  playingEventListener = () => {
                    console.log(`[playing이벤트] 씬 ${sceneIndex} 구간 ${partIndex} playing 이벤트 발생`)
                    if (!firstPartStarted) {
                      firstPartStarted = true
                      firstPartStartTime = Date.now()
                      
                      // 통합 렌더링에서 이미 이미지와 자막이 렌더링되었으므로
                      // playing 이벤트에서는 렌더링 함수를 호출하지 않고 직접 alpha만 변경
                      const currentSprite = spritesRef?.current.get(sceneIndex)
                      const currentText = textsRef.current.get(sceneIndex)
                      
                      console.log(`[playing이벤트] 씬 ${sceneIndex} 현재 상태 확인 | sprite: alpha=${currentSprite?.alpha}, visible=${currentSprite?.visible} | text: alpha=${currentText?.alpha}, visible=${currentText?.visible}`)
                      
                      // 이미지가 아직 표시되지 않았을 때만 직접 alpha 변경
                      if (currentSprite && currentSprite.alpha < 1) {
                        currentSprite.visible = true
                        currentSprite.alpha = 1
                        console.log(`[playing이벤트] 씬 ${sceneIndex} 이미지 직접 표시 | alpha: ${currentSprite.alpha}, visible: ${currentSprite.visible}`)
                      } else {
                        console.log(`[playing이벤트] 씬 ${sceneIndex} 이미지는 이미 표시됨 (alpha=${currentSprite?.alpha})`)
                      }
                      
                      // 자막이 아직 표시되지 않았을 때만 직접 alpha 변경
                      if (currentText && currentText.alpha < 1) {
                        currentText.visible = true
                        currentText.alpha = 1
                        console.log(`[playing이벤트] 씬 ${sceneIndex} 자막 직접 표시 | alpha: ${currentText.alpha}, visible: ${currentText.visible}`)
                      } else {
                        console.log(`[playing이벤트] 씬 ${sceneIndex} 자막은 이미 표시됨 (alpha=${currentText?.alpha})`)
                      }
                      
                      // 씬 전환은 통합 렌더링에서 이미 처리됨
                      // 첫 번째 구간이 재생되기 시작했음을 기록
                      // 첫 번째 씬에서만 BGM 재생 시작 (TTS와 동시에)
                      if (!bgmStarted && bgmTemplate && bgmAudioRef.current) {
                        bgmStarted = true
                        const bgmAudio = bgmAudioRef.current
                        bgmStartTimeRef.current = firstPartStartTime
                        bgmAudio.play().catch(() => {})
                        // BGM 페이드 아웃 시작 (첫 번째 씬에서만)
                        setupBgmFadeOut()
                      }
                    } else {
                      console.log(`[playing이벤트] 씬 ${sceneIndex} 구간 ${partIndex} 이미 처리됨 (firstPartStarted=true)`)
                    }
                  }
                  console.log(`[playing이벤트] 씬 ${sceneIndex} 구간 ${partIndex} playing 이벤트 리스너 등록`)
                  audio.addEventListener('playing', playingEventListener)
                } else {
                  console.log(`[playing이벤트] 씬 ${sceneIndex} 구간 ${partIndex} playing 이벤트 리스너 등록 안함 (partIndex=${partIndex}, firstPartStarted=${firstPartStarted})`)
                }

                // 재생바 업데이트를 위한 인터벌
                const updateProgress = () => {
                  if (!isPlayingRef.current || resolved || !startTime) {
                    // 재생 중지되었거나 완료되었거나 아직 재생이 시작되지 않았으면 interval 정리
                    if (progressIntervalRef.current && (!isPlayingRef.current || resolved)) {
                      clearInterval(progressIntervalRef.current)
                      progressIntervalRef.current = null
                    }
                    return
                  }
                  const elapsed = (Date.now() - startTime) / 1000 * speed
                  if (setCurrentTime) {
                    // 현재 씬까지의 누적 시간 계산
                    let accumulated = 0
                    for (let i = 0; i < sceneIndex; i++) {
                      const s = timeline.scenes[i]
                      const isLastScene = i === timeline.scenes.length - 1
                      const nextScene = !isLastScene ? timeline.scenes[i + 1] : null
                      const isSameSceneId = nextScene && s.sceneId === nextScene.sceneId
                      const transitionDuration = isLastScene ? 0 : (isSameSceneId ? 0 : (s.transitionDuration || 0.5))
                      accumulated += s.duration + transitionDuration
                    }
                    // 현재 씬 내에서의 진행 시간 계산 (이전 구간들의 duration 합산)
                    let currentSceneProgress = 0
                    for (let i = 0; i < partIndex; i++) {
                      const markups = buildSceneMarkup(sceneIndex)
                      if (i < markups.length) {
                        const markup = markups[i]
                        const key = makeTtsKey(voiceTemplate!, markup)
                        const cached = ttsCacheRef.current.get(key)
                        if (cached) {
                          currentSceneProgress += cached.durationSec
                        }
                      }
                    }
                    currentSceneProgress += elapsed
                    setCurrentTime(accumulated + currentSceneProgress)
                  }
                }
                // 기존 interval이 있으면 정리
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current)
                }
                // interval은 audio.play() 호출 후에 시작되도록 함 (startTime이 설정된 후)

                // 오디오 재생 완료를 처리 (TTS가 끝나면 다음 씬으로 - 오디오 이벤트만 사용)
                // audio.play() 전에 이벤트를 등록해야 함
                const handleEnded = () => {
                  if (!resolved) {
                    console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 오디오 재생 완료 (onended 이벤트) - currentTime: ${audio.currentTime.toFixed(2)}s, duration: ${audio.duration ? audio.duration.toFixed(2) : 'unknown'}s`)
                    if (progressIntervalRef.current) {
                      clearInterval(progressIntervalRef.current)
                      progressIntervalRef.current = null
                    }
                    audio.removeEventListener('ended', handleEnded)
                    audio.removeEventListener('error', handleError)
                    finish()
                  }
                }
                
                const handleError = () => {
                  if (!resolved) {
                    console.error(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 오디오 재생 에러`)
                    if (progressIntervalRef.current) {
                      clearInterval(progressIntervalRef.current)
                      progressIntervalRef.current = null
                    }
                    audio.removeEventListener('ended', handleEnded)
                    audio.removeEventListener('error', handleError)
                    if (playingEventListener) {
                      audio.removeEventListener('playing', playingEventListener)
                      playingEventListener = null
                    }
                    // 에러 발생 시 상태 복원 (이미지와 자막을 alpha: 1로 복원)
                    if (spritesRef && textsRef) {
                      const currentSprite = spritesRef.current.get(sceneIndex)
                      const currentText = textsRef.current.get(sceneIndex)
                      if (currentSprite) {
                        currentSprite.alpha = 1
                        currentSprite.visible = true
                      }
                      if (currentText) {
                        currentText.alpha = 1
                        currentText.visible = true
                      }
                    }
                    // 에러 발생 시 즉시 종료
                    finish()
                  }
                }
                
                // canplaythrough 이벤트 확인 (타임아웃 5초)
                const canplaythroughTimeout = setTimeout(() => {
                  if (!canplaythroughResolved) {
                    canplaythroughResolved = true
                    console.warn(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} canplaythrough 타임아웃 (5초), 계속 진행`)
                  }
                }, 5000)
                
                const handleCanPlayThrough = () => {
                  if (!canplaythroughResolved) {
                    canplaythroughResolved = true
                    clearTimeout(canplaythroughTimeout)
                    audio.removeEventListener('canplaythrough', handleCanPlayThrough)
                  }
                }
                
                // 이벤트 리스너 등록 (play 전에 등록)
                audio.addEventListener('ended', handleEnded)
                audio.addEventListener('error', handleError)
                audio.addEventListener('canplaythrough', handleCanPlayThrough)
                
                // 재생 중지 상태 확인
                if (playbackAbortControllerRef.current?.signal.aborted || !isPlayingRef.current) {
                  console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생 중지됨 (play() 호출 전)`)
                  clearTimeout(canplaythroughTimeout)
                  audio.removeEventListener('canplaythrough', handleCanPlayThrough)
                  finish()
                  return
                }

                // 오디오 재생 시작 (duration 기반 타임아웃 없음)
                audio.play().then(() => {
                  // 재생 중지 상태 재확인
                  if (playbackAbortControllerRef.current?.signal.aborted || !isPlayingRef.current) {
                    console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생 중지됨 (play() 직후)`)
                    audio.pause()
                    clearTimeout(canplaythroughTimeout)
                    audio.removeEventListener('canplaythrough', handleCanPlayThrough)
                    finish()
                    return
                  }
                  
                  // audio.play() 성공 시 startTime 설정 및 interval 시작
                  if (!startTime) {
                    startTime = Date.now()
                    progressIntervalRef.current = setInterval(updateProgress, 100) // 100ms마다 업데이트
                    console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 타임라인 업데이트 시작`)
                  }
                }).catch((error) => {
                  // AbortError는 재생 중지로 인한 정상적인 경우이므로 무시
                  if (error.name === 'AbortError' || error.message?.includes('interrupted')) {
                    console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생 중단됨 (정상)`)
                  } else {
                    // audio.play() 실패 시 Promise 해결
                    console.error(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} audio.play() 실패:`, error)
                    // 브라우저 자동 재생 정책 대응
                    if (error.name === 'NotAllowedError' || error.name === 'NotSupportedError') {
                      alert('오디오 재생이 차단되었습니다. 브라우저 설정을 확인해주세요.')
                    }
                  }
                  clearTimeout(canplaythroughTimeout)
                  audio.removeEventListener('canplaythrough', handleCanPlayThrough)
                  // 에러 발생 시 상태 복원
                  if (spritesRef && textsRef) {
                    const currentSprite = spritesRef.current.get(sceneIndex)
                    const currentText = textsRef.current.get(sceneIndex)
                    if (currentSprite) {
                      currentSprite.alpha = 1
                      currentSprite.visible = true
                    }
                    if (currentText) {
                      currentText.alpha = 1
                      currentText.visible = true
                    }
                  }
                  finish()
                })
                  .then(() => {
                    console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 오디오 play() 호출 완료 (TTS 음성이 끝날 때까지 대기)`)
                    // duration 기반 타임아웃 제거 - 오디오가 끝날 때까지 무조건 대기
                  })
                  .catch((error) => {
                    // 재생 실패 시 즉시 종료
                    console.error(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 오디오 재생 실패:`, error)
                    audio.removeEventListener('ended', handleEnded)
                    audio.removeEventListener('error', handleError)
                    if (playingEventListener) {
                      audio.removeEventListener('playing', playingEventListener)
                      playingEventListener = null
                    }
                    finish()
                  })
              })
            } else {
              // 오디오가 없어도 duration만큼 대기
              console.warn(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생할 오디오 없음, duration만큼 대기: ${part.durationSec}초`)
              await new Promise(resolve => setTimeout(resolve, targetDuration))
            }

            // 다음 구간 재생 또는 다음 씬으로 이동 (리스트 순서대로만)
            if (!isPlayingRef.current) {
              // 재생 중지되었으면 모든 재생 관련 로직 정지
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
              }
              return
            }

            if (partIndex < scriptParts.length - 1) {
              // 같은 씬의 다음 구간 재생 (리스트 순서대로: partIndex + 1)
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 완료, 다음 구간 ${partIndex + 2}로 이동`)
              await playPart(partIndex + 1)
            } else {
              // 모든 구간 재생 완료, 다음 씬으로 이동
              const nextScene = currentIndex + 1 < timeline.scenes.length ? timeline.scenes[currentIndex + 1] : null
              const isNextInSameGroup = nextScene && nextScene.sceneId === scene.sceneId

              if (isNextInSameGroup) {
                // 같은 그룹 내의 다음 씬으로 넘어갈 때는 자막만 변경
                const nextIndex = currentIndex + 1
                setCurrentSceneIndex(nextIndex)
                currentSceneIndexRef.current = nextIndex
                // 현재 씬의 첫 번째 구간 인덱스 계산 (구간이 나뉘어져 있으면 0, 아니면 null)
                const currentScene = timeline.scenes[nextIndex]
                const partIndex = currentScene?.text?.content?.includes('|||') ? 0 : null
                
                // lastRenderedSceneIndexRef는 updateCurrentScene 완료 후 업데이트되므로 여기서는 업데이트하지 않음
                // 재생 중이므로 isPlaying: true
                updateCurrentScene(false, currentIndex, undefined, () => {
                  // updateCurrentScene 완료 후 lastRenderedSceneIndexRef 업데이트
                  lastRenderedSceneIndexRef.current = nextIndex
                  // 같은 그룹 내 씬이므로 전환 효과 없이 바로 TTS 재생 시작
                  void playNextScene(nextIndex)
                }, true, partIndex, nextIndex) // 현재 씬의 첫 번째 구간 인덱스 전달, sceneIndex: nextIndex 전달
              } else {
                // 다른 그룹으로 넘어갈 때는 selectScene을 통해 전환 효과 적용
                // playNextScene 내부에서 selectScene을 호출하므로 바로 호출
                if (isPlayingRef.current) {
                  await playNextScene(currentIndex + 1)
                }
              }
            }
          }
          
          // 첫 번째 구간부터 재생 시작 (각 파일이 준비되는 대로 즉시 렌더링)
          await playPart(0)
          return firstPartStarted
        } catch (error) {
          console.error('TTS 재생 실패:', error)
          // 에러 발생 시 fallback duration 사용
          const fallbackDuration = scene.duration
          const waitTime = (fallbackDuration * 1000) / speed
          playTimeoutRef.current = setTimeout(async () => {
            if (isPlayingRef.current) {
              await playNextScene(currentIndex + 1)
            }
          }, waitTime)
          return false
        }
      }
      
      // 이전 씬 인덱스 계산 (renderSceneWithSync 외부에서도 사용)
      const previousSceneIndex = currentIndex > 0 ? currentIndex - 1 : null
      const previousScene = previousSceneIndex !== null ? timeline.scenes[previousSceneIndex] : null
      const isSameGroup = previousScene && previousScene.sceneId === scene.sceneId
      
      // 통합 렌더링 함수: renderSceneContent 사용 (이미지, 자막, TTS를 동시에 시작)
      const renderSceneWithSync = async () => {
        const prevIndex = previousSceneIndex !== null ? previousSceneIndex : lastRenderedSceneIndexRef.current
        
        // 전환 효과 설정
        const transition = scene.transition || 'fade'
        const skipAnimation = transition === 'none'
        
        // renderSceneContent로 전환 효과 적용 (이미지 + 첫 번째 구간 자막)
        // TTS 재생은 전환 효과 완료 후 시작
        // prepareOnly 단계 제거: 최종 상태로 바로 렌더링하고 전환 효과 애니메이션만 적용
        if (renderSceneContent) {
          // 전환 효과 적용 (최종 상태로 바로 렌더링)
          renderSceneContent(sceneIndex, 0, {
            skipAnimation,
            forceTransition: transition,
            previousIndex: prevIndex,
            updateTimeline: false, // 재생 중에는 timeline 업데이트 안함 (다른 함수 영향 방지)
            prepareOnly: false, // 최종 상태로 바로 렌더링 (전환 효과 애니메이션은 usePixiEffects에서 처리)
            isPlaying: true, // 재생 중임을 명시
            onComplete: () => {
              console.log(`[통합 렌더링] 씬 ${sceneIndex} 이미지/자막 전환 효과 완료`)
            },
          })
          
          // lastRenderedSceneIndexRef 업데이트
          lastRenderedSceneIndexRef.current = sceneIndex
          setCurrentSceneIndex(sceneIndex)
          currentSceneIndexRef.current = sceneIndex
          
          // 전환 효과가 없으면 즉시 TTS 재생 시작
          // 전환 효과가 있으면 약간의 지연 후 TTS 재생 시작 (전환 효과가 시작되도록)
          if (skipAnimation) {
            // 전환 효과가 없으면 즉시 TTS 재생 시작
            void playTts()
          } else {
            // 전환 효과가 있으면 전환 효과 duration만큼 대기 후 TTS 재생 시작
            const transitionDuration = scene.transitionDuration || 0.5
            setTimeout(() => {
              console.log(`[통합 렌더링] 씬 ${sceneIndex} 전환 효과 대기 완료, TTS 재생 시작`)
              void playTts()
            }, transitionDuration * 1000)
          }
        } else {
          // fallback: 기존 방식
          // lastRenderedSceneIndexRef 업데이트
          lastRenderedSceneIndexRef.current = sceneIndex
          setCurrentSceneIndex(sceneIndex)
          currentSceneIndexRef.current = sceneIndex
          // TTS 재생 시작 (비동기)
          void playTts()
        }
      }
      
      // 통합 렌더링 실행 (이미지, 자막, TTS 동시 시작)
      await renderSceneWithSync()
      
      // TTS 재생은 비동기로 시작되었으므로 여기서는 대기하지 않음
      // playTts 내부에서 다음 씬으로 전환 처리
      
      // AbortController 체크: 재생 중지되었으면 중단
      if (playbackAbortControllerRef.current?.signal.aborted) {
        console.log(`[재생] 씬 ${sceneIndex} 재생 중지됨 (렌더링 후)`)
        return
      }
      
      // 같은 그룹 내 씬인지 확인 (움직임 효과가 적용된 분할된 씬들)
      // previousSceneIndex, previousScene, isSameGroup은 위에서 이미 선언됨
      // isSameGroup은 사용되지 않지만 타입 체크를 위해 유지
      void isSameGroup
      
      // 전환 효과 duration과 TTS duration 불일치 처리 - 경고 로그 출력
      if (scene.transitionDuration && scene.transitionDuration > 0) {
        // 원본 텍스트에서 구간 추출
        const originalText = scene.text?.content || ''
        const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
        
        if (scriptParts.length > 0) {
          const ttsDuration = scriptParts.reduce((sum, _, idx) => {
            const markups = buildSceneMarkup(sceneIndex)
            if (idx < markups.length) {
              const markup = markups[idx]
              const key = makeTtsKey(voiceTemplate!, markup)
              const cached = ttsCacheRef.current.get(key)
              if (cached && cached.durationSec > 0) {
                return sum + cached.durationSec
              }
            }
            return sum
          }, 0)
          
          if (ttsDuration > 0 && Math.abs(scene.transitionDuration - ttsDuration) > 0.5) {
            console.warn(`[재생] 씬 ${sceneIndex} 전환 효과 duration(${scene.transitionDuration.toFixed(2)}초)과 TTS duration(${ttsDuration.toFixed(2)}초) 불일치 (차이: ${Math.abs(scene.transitionDuration - ttsDuration).toFixed(2)}초)`)
          }
        }
      }
      
      // TTS 재생은 renderSceneWithSync 내부에서 이미 시작됨 (이미지, 자막, TTS 동시 시작)
      // BGM은 playTts의 playPart 내부 playing 이벤트에서 첫 번째 씬의 첫 번째 구간 재생 시작 시 처리됨
    }
    
    // currentSceneIndexRef를 사용하여 최신 씬 인덱스로 재생 시작
    // (씬 선택 후 재생 시작 시 올바른 씬부터 재생하도록)
    const startSceneIndex = currentSceneIndexRef.current
    console.log(`[startPlayback] playNextScene 호출 전 | startSceneIndex: ${startSceneIndex}, currentSceneIndex: ${currentSceneIndex}, timeline.scenes.length: ${timeline.scenes.length}`)
    
    // 시작 씬 인덱스 유효성 검사
    if (startSceneIndex < 0 || startSceneIndex >= timeline.scenes.length) {
      console.error(`[startPlayback] 잘못된 시작 씬 인덱스: ${startSceneIndex}, timeline.scenes.length: ${timeline.scenes.length}`)
      isPlayingRef.current = false
      setIsPlaying(false)
      if (setTimelineIsPlaying) {
        setTimelineIsPlaying(false)
      }
      return
    }
    
    void playNextScene(startSceneIndex)
  }, [timeline, currentSceneIndex, voiceTemplate, bgmTemplate, playbackSpeed, buildSceneMarkup, makeTtsKey, stopBgmAudio, stopTtsAudio, setCurrentSceneIndex, currentSceneIndexRef, lastRenderedSceneIndexRef, updateCurrentScene, setTimeline, textsRef, setShowReadyMessage, setCurrentTime, prepareImageAndSubtitle, renderSceneContent, renderSceneImage, renderSubtitlePart, spritesRef, setIsPlaying, setTimelineIsPlaying, isPlayingRef])

  // 모든 재생 정지 (명시적 일시정지 함수)
  const pauseAll = useCallback(() => {
    // AbortController로 Promise 체인 중단
    if (playbackAbortControllerRef.current) {
      playbackAbortControllerRef.current.abort()
      playbackAbortControllerRef.current = null
    }
    
    // 모든 timeout 정리
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current)
      playTimeoutRef.current = null
    }
    if (bgmStopTimeoutRef.current) {
      clearTimeout(bgmStopTimeoutRef.current)
      bgmStopTimeoutRef.current = null
    }
    // 재생바 업데이트 interval 정리
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    bgmStartTimeRef.current = null
    // 즉시 ref 업데이트 (상태 업데이트 전에 ref를 먼저 업데이트하여 즉시 반영)
    isPlayingRef.current = false
    setIsPlaying(false)
    // 타임라인 재생도 즉시 정지
    if (setTimelineIsPlaying) {
      setTimelineIsPlaying(false)
    }
    
    // 재생 중지 시 현재 씬의 이미지와 자막을 alpha: 1로 복원
    const currentSceneIndex = currentPlayingSceneIndexRef.current
    if (currentSceneIndex !== null && spritesRef && textsRef) {
      const currentSprite = spritesRef.current.get(currentSceneIndex)
      const currentText = textsRef.current.get(currentSceneIndex)
      if (currentSprite) {
        currentSprite.alpha = 1
        currentSprite.visible = true
      }
      if (currentText) {
        currentText.alpha = 1
        currentText.visible = true
      }
    }
    currentPlayingSceneIndexRef.current = null
    // 준비 상태도 초기화 (일시정지 시 준비 중 상태 해제)
    setIsPreparingLocal(false)
    // TTS 오디오 정지
    stopTtsAudio()
    // BGM 오디오 정지
    stopBgmAudio()
    // 부트스트래핑 상태 초기화
    if (isTtsBootstrappingRef) {
      isTtsBootstrappingRef.current = false
    }
    if (setIsTtsBootstrapping) {
      setIsTtsBootstrapping(false)
    }
    if (isBgmBootstrappingRef) {
      isBgmBootstrappingRef.current = false
    }
    if (setIsBgmBootstrapping) {
      setIsBgmBootstrapping(false)
    }
    // TTS 세션 리셋
    resetTtsSession()
  }, [setIsPlaying, setTimelineIsPlaying, stopTtsAudio, stopBgmAudio, resetTtsSession, setIsTtsBootstrapping, setIsBgmBootstrapping, isTtsBootstrappingRef, isBgmBootstrappingRef, spritesRef, textsRef, currentPlayingSceneIndexRef])

  // handlePlayPause ref (재귀 호출을 위해)
  const handlePlayPauseRef = useRef<(() => Promise<void>) | null>(null)
  
  // 재생/일시정지 토글
  const handlePlayPause = useCallback(async () => {
    console.log(`[handlePlayPause] 함수 호출됨`)
    // ref만 사용하여 최신 상태 확인 (상태는 비동기적으로 업데이트되므로 ref 사용)
    const currentlyPlaying = isPlayingRef.current
    console.log(`[handlePlayPause] 현재 재생 상태: ${currentlyPlaying}`)
    if (!currentlyPlaying) {
      console.log(`[handlePlayPause] 재생 시작 시도 | isPreparing: ${isPreparing}, timeline: ${!!timeline}, voiceTemplate: ${!!voiceTemplate}, pixiReady: ${pixiReady}, spritesRef.size: ${spritesRef?.current.size}`)
      // 준비 중이면 아무것도 하지 않음
      if (isPreparing) {
        console.log(`[handlePlayPause] isPreparing이 true이므로 종료`)
        return
      }
      
      // 재생 시작: 모든 씬의 TTS 합성 및 BGM 로드
      if (!timeline) {
        console.log(`[handlePlayPause] timeline이 null이므로 종료`)
        return
      }
      
      // voiceTemplate 미선택 가드
      if (!voiceTemplate) {
        console.log(`[handlePlayPause] voiceTemplate이 없으므로 종료`)
        alert('목소리를 선택해주세요.')
        return
      }
      
      if (pixiReady !== undefined && !pixiReady) {
        console.log(`[handlePlayPause] pixiReady가 false이므로 종료`)
        return
      }
      if (spritesRef && spritesRef.current.size === 0) {
        console.log(`[handlePlayPause] spritesRef.size가 0이므로 종료`)
        return
      }
      
      // 현재 씬의 스프라이트가 로드되었는지 확인
      if (spritesRef) {
        const currentSprite = spritesRef.current.get(currentSceneIndex)
        if (!currentSprite) {
          console.log(`[handlePlayPause] currentSprite가 없으므로 로드 시도 | currentSceneIndex: ${currentSceneIndex}`)
          // 스프라이트가 없으면 로드 시도
          if (pixiReady && appRef.current && loadAllScenes) {
            loadAllScenes().then(() => {
              // 로드 완료 후 재생 시작
              if (handlePlayPauseRef.current) {
                setTimeout(() => {
                  void handlePlayPauseRef.current!()
                }, 100)
              }
            })
          }
          return
        }
      }
      
      console.log(`[handlePlayPause] 모든 조건 통과, TTS 합성 시작`)
      
      // 재생 시작 시 전환효과 미리보기 중지
      if (setIsPreviewingTransition) {
        setIsPreviewingTransition(false)
      }
      
      // 모든 씬의 TTS 합성 시작
      setIsPreparingLocal(true)
      if (setIsTtsBootstrapping) {
        setIsTtsBootstrapping(true)
      }
      if (isTtsBootstrappingRef) {
        isTtsBootstrappingRef.current = true
      }
      
      if (bgmTemplate) {
        if (setIsBgmBootstrapping) {
          setIsBgmBootstrapping(true)
        }
        if (isBgmBootstrappingRef) {
          isBgmBootstrappingRef.current = true
        }
      }
      
      // 현재 씬부터 마지막 씬까지 모든 TTS 배치 합성 (동시성 제한 + 딜레이)
      // 이미 캐시된 씬은 스킵하여 rate limit 절약
      const batchSize = 3 // 3개씩 처리
      const batchDelay = 1000 // 1초 딜레이

      // 먼저 캐시 확인하여 이미 합성된 씬은 스킵
      // 단, 캐시에 blob이나 URL이 있어야 유효한 캐시로 간주
      const scenesToSynthesize = []
      for (let i = currentSceneIndex; i < timeline.scenes.length; i++) {
        const markups = buildSceneMarkup(i)
        // 모든 구간이 유효한 캐시(blob 또는 URL)를 가지고 있는지 확인
        const cachedCount = markups.filter(markup => {
          const key = makeTtsKey(voiceTemplate!, markup)
          const cached = ttsCacheRef.current.get(key)
          // blob이나 URL이 있어야 유효한 캐시로 간주
          return cached && (cached.blob || cached.url)
        }).length
        
        if (cachedCount < markups.length) {
          scenesToSynthesize.push(i)
        }
      }

      // 캐시되지 않은 씬만 배치 처리
      interface TtsPart {
        blob: Blob
        durationSec: number
        url: string | null
        partIndex: number
        markup: string
      }
      const ttsResults: Array<{ sceneIndex: number; parts: Array<TtsPart> }> = []
      if (ensureSceneTts) {
        for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
          const batch = []
          for (let j = 0; j < batchSize && i + j < scenesToSynthesize.length; j++) {
            const sceneIndex = scenesToSynthesize[i + j]
            batch.push(
              ensureSceneTts(sceneIndex, undefined, changedScenesRef?.current.has(sceneIndex) || false)
                .then((result) => {
                  return { sceneIndex, result }
                })
                .catch(() => {
                  return { sceneIndex, result: null }
                })
            )
          }
          // 각 배치를 순차적으로 처리
          const batchResult = await Promise.allSettled(batch)
          interface BatchResultValue {
            sceneIndex: number
            result: {
              sceneIndex: number
              parts: Array<TtsPart>
            } | null
          }
          const successfulResults = batchResult
            .filter((r): r is PromiseFulfilledResult<BatchResultValue> => 
              r.status === 'fulfilled' && r.value?.result !== null
            )
            .map(r => r.value)
          ttsResults.push(...successfulResults.map(r => ({ 
            sceneIndex: r.sceneIndex, 
            parts: r.result?.parts || [] 
          })))
          
          // 실패한 씬이 있으면 무시 (이미 처리됨)
          
          // 마지막 배치가 아니면 딜레이 추가
          if (i + batchSize < scenesToSynthesize.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelay))
          }
        }
      }
      
      // ensureSceneTts 결과를 직접 확인하여 모든 part가 준비되었는지 검증
      // 그리고 각 part를 캐시에 명시적으로 저장 (타이밍 이슈 방지)
      let allTtsReady = true
      const missingTts: Array<{ sceneIndex: number; partIndex: number; reason: string }> = []
      
      // ensureSceneTts로 생성한 씬들의 part를 캐시에 명시적으로 저장
      for (const ttsResult of ttsResults) {
        const { sceneIndex, parts } = ttsResult
        if (!parts || parts.length === 0) {
          allTtsReady = false
          missingTts.push({ sceneIndex, partIndex: -1, reason: 'parts 배열이 비어있음' })
          continue
        }
        
        const markups = buildSceneMarkup(sceneIndex)
        for (let partIndex = 0; partIndex < markups.length; partIndex++) {
          const part = parts[partIndex]
          if (!part) {
            allTtsReady = false
            missingTts.push({ sceneIndex, partIndex, reason: 'part가 null' })
            continue
          }
          
          if (!part.blob && !part.url) {
            allTtsReady = false
            missingTts.push({ sceneIndex, partIndex, reason: 'blob과 url이 모두 없음' })
            continue
          }
          
          if (!part.durationSec || part.durationSec <= 0) {
            allTtsReady = false
            missingTts.push({ sceneIndex, partIndex, reason: 'durationSec가 없거나 0 이하' })
            continue
          }
          
          // 캐시에 명시적으로 저장 (타이밍 이슈 방지)
          const markup = markups[partIndex]
          const key = makeTtsKey(voiceTemplate!, markup)
          const scene = timeline.scenes[sceneIndex]
          const cacheEntry = {
            blob: part.blob,
            durationSec: part.durationSec,
            markup: part.markup || markup,
            url: part.url || null,
            sceneId: scene?.sceneId,
            sceneIndex,
          }
          ttsCacheRef.current.set(key, cacheEntry)
        }
      }
      
      // 모든 씬의 모든 구간 TTS가 캐시에 있는지 최종 확인
      for (let i = currentSceneIndex; i < timeline.scenes.length; i++) {
        const markups = buildSceneMarkup(i)
        for (let partIndex = 0; partIndex < markups.length; partIndex++) {
          const markup = markups[partIndex]
          const key = makeTtsKey(voiceTemplate!, markup)
          const cached = ttsCacheRef.current.get(key)
          if (!cached || (!cached.blob && !cached.url)) {
            allTtsReady = false
            missingTts.push({ sceneIndex: i, partIndex, reason: '캐시에 없음' })
          } else if (!cached.durationSec || cached.durationSec <= 0) {
            allTtsReady = false
            missingTts.push({ sceneIndex: i, partIndex, reason: 'durationSec가 없거나 0 이하' })
          }
        }
      }
      
      if (!allTtsReady) {
        setIsPreparingLocal(false)
        if (setIsTtsBootstrapping) {
          setIsTtsBootstrapping(false)
        }
        if (isTtsBootstrappingRef) {
          isTtsBootstrappingRef.current = false
        }
        if (setIsBgmBootstrapping) {
          setIsBgmBootstrapping(false)
        }
        if (isBgmBootstrappingRef) {
          isBgmBootstrappingRef.current = false
        }
        alert(`TTS 준비 중 오류가 발생했어요. (${missingTts.length}개 구간 누락)`)
        return
      }
      
      // BGM 로드 (재생은 하지 않음)
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      const bgmPromise = bgmTemplate
        ? startBgmAudio(bgmTemplate, speed, false).catch(() => {
            if (isBgmBootstrappingRef) {
              isBgmBootstrappingRef.current = false
            }
            if (setIsBgmBootstrapping) {
              setIsBgmBootstrapping(false)
            }
            return null
          })
        : Promise.resolve(null)
      
      // 모든 준비 완료 대기 (TTS는 이미 확인했으므로 BGM만 대기)
      Promise.all([bgmPromise])
        .then(() => {
          setIsPreparingLocal(false)
          if (setIsTtsBootstrapping) {
            setIsTtsBootstrapping(false)
          }
          if (isTtsBootstrappingRef) {
            isTtsBootstrappingRef.current = false
          }
          if (setIsBgmBootstrapping) {
            setIsBgmBootstrapping(false)
          }
          if (isBgmBootstrappingRef) {
            isBgmBootstrappingRef.current = false
          }
          
          console.log(`[재생] 모든 TTS 준비 완료, 재생 시작`)
          // 로딩 완료 후 바로 재생 시작
          console.log(`[handlePlayPause] startPlayback 호출 전`)
          startPlayback()
          console.log(`[handlePlayPause] startPlayback 호출 후`)
        })
        .catch(() => {
          setIsPreparingLocal(false)
          if (setIsTtsBootstrapping) {
            setIsTtsBootstrapping(false)
          }
          if (isTtsBootstrappingRef) {
            isTtsBootstrappingRef.current = false
          }
          if (setIsBgmBootstrapping) {
            setIsBgmBootstrapping(false)
          }
          if (isBgmBootstrappingRef) {
            isBgmBootstrappingRef.current = false
          }
          alert('BGM 로드 중 오류가 발생했어요.')
        })
    } else {
      // 재생 중지 (일시정지) - pauseAll 함수 사용
      pauseAll()
    }
  }, [isPreparing, timeline, voiceTemplate, bgmTemplate, playbackSpeed, pixiReady, spritesRef, currentSceneIndex, appRef, loadAllScenes, buildSceneMarkup, makeTtsKey, ensureSceneTts, changedScenesRef, startBgmAudio, startPlayback, pauseAll, setIsPreviewingTransition, setIsTtsBootstrapping, setIsBgmBootstrapping, isTtsBootstrappingRef, isBgmBootstrappingRef])
  
  // handlePlayPause ref 업데이트
  useEffect(() => {
    handlePlayPauseRef.current = handlePlayPause
  }, [handlePlayPause])

  // 재생 중지 시 timeout 정리
  useEffect(() => {
    if (!isPlaying && playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current)
      playTimeoutRef.current = null
    }
  }, [isPlaying])
  
  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      // 재생 중지
      if (playbackAbortControllerRef.current) {
        playbackAbortControllerRef.current.abort()
        playbackAbortControllerRef.current = null
      }
      isPlayingRef.current = false
      setIsPlaying(false)
      
      // 리소스 정리
      stopTtsAudio()
      stopBgmAudio()
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current)
        playTimeoutRef.current = null
      }
      if (bgmStopTimeoutRef.current) {
        clearTimeout(bgmStopTimeoutRef.current)
        bgmStopTimeoutRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [stopTtsAudio, stopBgmAudio])
  
  // 오디오 컨텍스트 상태 처리 - document.visibilitychange 이벤트 리스너 추가
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 숨겨졌을 때는 아무것도 하지 않음 (브라우저가 자동으로 처리)
        console.log('[재생] 페이지 숨김 감지')
      } else {
        // 페이지가 다시 보일 때 오디오 상태 확인
        console.log('[재생] 페이지 표시 감지')
        if (isPlayingRef.current && ttsAudioRef.current) {
          // 재생 중이었으면 상태 확인
          const audio = ttsAudioRef.current
          if (audio.paused && !audio.ended) {
            // 일시정지된 상태면 재생 재개 시도
            audio.play().catch((error) => {
              console.warn('[재생] 오디오 재생 재개 실패:', error)
            })
          }
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    isPlaying,
    setIsPlaying,
    isPreparing,
    play: handlePlayPause,
    pause: pauseAll,
    toggle: handlePlayPause,
    stopTtsAudio,
    stopBgmAudio,
    resetTtsSession,
    startBgmAudio,
    ttsCacheRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    bgmAudioRef,
    bgmStartTimeRef,
    playTimeoutRef,
  }
}

