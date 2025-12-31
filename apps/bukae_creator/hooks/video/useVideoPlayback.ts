'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'
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
  updateCurrentScene: (skipAnimation?: boolean, prevIndex?: number | null, forceTransition?: string, onComplete?: () => void) => void
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
  getMp3DurationSec,
  textsRef,
  appRef,
  selectScene,
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
}: UseVideoPlaybackParams) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparing, setIsPreparingLocal] = useState(false)
  const isPlayingRef = useRef(false)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bgmStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bgmStartTimeRef = useRef<number | null>(null)
  
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
      } catch (fetchError) {
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
    } catch (error) {
      stopBgmAudio()
    }
  }, [stopBgmAudio])

  // 재생 시작
  const startPlayback = useCallback(() => {
    if (!timeline) return
    
    if (setShowReadyMessage) {
      setShowReadyMessage(false)
    }
    setIsPlaying(true)
    isPlayingRef.current = true
    
    // TTS 전체 길이 계산 및 BGM 페이드 아웃 설정
    const calculateTotalTtsDuration = (): number => {
      let totalDuration = 0
      for (let i = currentSceneIndex; i < timeline.scenes.length; i++) {
        const markups = buildSceneMarkup(i)
        // 각 구간의 duration 합산
        let sceneDuration = 0
        for (const markup of markups) {
          const key = makeTtsKey(voiceTemplate!, markup)
          const cached = ttsCacheRef.current.get(key)
          if (cached) {
            sceneDuration += cached.durationSec
          }
        }
        if (sceneDuration > 0) {
          totalDuration += sceneDuration
        } else {
          totalDuration += timeline.scenes[i]?.duration || 3
        }
      }
      return totalDuration
    }
    
    // BGM 페이드 아웃 설정
    const setupBgmFadeOut = () => {
      if (!bgmTemplate || !bgmAudioRef.current) return
      
      const totalTtsDuration = calculateTotalTtsDuration()
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      const totalTimeMs = (totalTtsDuration * 1000) / speed
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
    const playNextScene = async (currentIndex: number) => {
      if (currentIndex >= timeline.scenes.length) {
        setIsPlaying(false)
        isPlayingRef.current = false
        stopBgmAudio()
        return
      }
      
      const sceneIndex = currentIndex
      const scene = timeline.scenes[sceneIndex]
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      
      // 같은 그룹 내 씬인지 확인 (움직임 효과가 적용된 분할된 씬들)
      const previousSceneIndex = currentIndex > 0 ? currentIndex - 1 : null
      const previousScene = previousSceneIndex !== null ? timeline.scenes[previousSceneIndex] : null
      const isSameGroup = previousScene && previousScene.sceneId === scene.sceneId
      const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']
      const isMovementEffect = isSameGroup && previousScene && MOVEMENT_EFFECTS.includes(previousScene.transition || '')
      
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
            if (currentPartText) {
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
              
              // 약간의 지연 후 updateCurrentScene 호출하여 timeline과 동기화
              setTimeout(() => {
                updateCurrentScene(true, null, undefined, undefined)
              }, 10)
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
                  const nextIndex = currentIndex + 1
                  setCurrentSceneIndex(nextIndex)
                  currentSceneIndexRef.current = nextIndex
                  lastRenderedSceneIndexRef.current = nextIndex
                  updateCurrentScene(false, currentIndex, undefined, () => {
                    void playNextScene(nextIndex)
                  })
                } else {
                  await playNextScene(currentIndex + 1)
                }
              }
              return
            }

            const markup = markups[partIndex]
            if (!voiceTemplate) {
              console.error('[재생] 목소리를 선택해주세요.')
              return
            }
            const key = makeTtsKey(voiceTemplate, markup)
            const accessToken = authStorage.getAccessToken()
            if (!accessToken) {
              console.error('[재생] 로그인이 필요합니다.')
              return
            }

            // 캐시 확인
            const cached = ttsCacheRef.current.get(key)
            let part: { blob: Blob; durationSec: number; url: string | null } | null = null

            if (cached && cached.blob) {
              // 캐시에서 사용
              part = {
                blob: cached.blob,
                durationSec: cached.durationSec || 0,
                url: cached.url || null,
              }
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 캐시에서 사용`)
            } else {
              // TTS 생성
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 생성 중...`)
              try {
                const res = await fetch('/api/tts/synthesize', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                  body: JSON.stringify({
                    voiceName: voiceTemplate,
                    mode: 'markup',
                    markup,
                  }),
                })

                if (!res.ok) {
                  throw new Error('TTS 합성 실패')
                }

                const blob = await res.blob()
                const durationSec = await getMp3DurationSec(blob)

                // Supabase 업로드
                let url: string | null = null
                try {
                  const formData = new FormData()
                  formData.append('file', blob)
                  formData.append('sceneId', String(scene.sceneId))

                  const uploadRes = await fetch('/api/media/upload', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: formData,
                  })

                  if (uploadRes.ok) {
                    const uploadData = await uploadRes.json()
                    url = uploadData.url || null
                  }
                } catch (error) {
                  console.error(`[재생] 구간 ${partIndex + 1} 업로드 실패:`, error)
                }

                // 캐시에 저장
                const entry = { blob, durationSec, markup, url, sceneId: scene.sceneId, sceneIndex }
                ttsCacheRef.current.set(key, entry)

                part = { blob, durationSec, url }
                console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 생성 완료`)
              } catch (error) {
                console.error(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 생성 실패:`, error)
                // 다음 구간으로
                if (partIndex < scriptParts.length - 1) {
                  await playPart(partIndex + 1)
                }
                return
              }
            }

            if (!part) {
              // 다음 구간으로
              if (partIndex < scriptParts.length - 1) {
                await playPart(partIndex + 1)
              }
              return
            }

            // TTS 파일이 준비되었으므로 즉시 재생

            // TTS 재생: 저장소 URL이 있으면 우선 사용, 없으면 blob에서 URL 생성
            stopTtsAudio()
            let audioUrl: string | null = null
            if (part.url) {
              audioUrl = part.url
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 저장소 URL 사용: ${part.url.substring(0, 50)}...`)
            } else if (part.blob) {
              audioUrl = URL.createObjectURL(part.blob)
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} blob URL 생성`)
            }

            // TTS duration만큼 정확히 표시
            const targetDuration = (part.durationSec * 1000) / speed
            
            if (audioUrl) {
              ttsAudioUrlRef.current = audioUrl
              const audio = new Audio(audioUrl)
              audio.playbackRate = speed
              ttsAudioRef.current = audio

              await new Promise<void>((resolve) => {
                const startTime = Date.now()
                let resolved = false
                let playingStarted = false

                const finish = () => {
                  if (resolved) return
                  resolved = true
                  stopTtsAudio()
                  resolve()
                }

                // 첫 번째 구간의 재생 시작을 감지
                if (partIndex === 0 && !firstPartStarted) {
                  const handlePlaying = () => {
                    if (!firstPartStarted) {
                      firstPartStarted = true
                      firstPartStartTime = Date.now()
                      audio.removeEventListener('playing', handlePlaying)
                      // 첫 번째 구간이 재생되기 시작했으므로 씬 전환
                      selectScene(sceneIndex, true, () => {
                        // 전환 효과 완료 콜백
                      })
                      // 첫 번째 씬에서만 BGM 재생 시작 (TTS와 동시에)
                      if (!bgmStarted && bgmTemplate && bgmAudioRef.current) {
                        bgmStarted = true
                        const bgmAudio = bgmAudioRef.current
                        bgmStartTimeRef.current = firstPartStartTime
                        bgmAudio.play().catch(() => {})
                        // BGM 페이드 아웃 시작 (첫 번째 씬에서만)
                        setupBgmFadeOut()
                      }
                    }
                  }
                  audio.addEventListener('playing', handlePlaying)
                }

                // 재생바 업데이트를 위한 인터벌
                const updateProgress = () => {
                  if (!isPlayingRef.current || resolved) return
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
                const progressInterval = setInterval(updateProgress, 100) // 100ms마다 업데이트

                audio.onended = () => {
                  clearInterval(progressInterval)
                  finish()
                }
                
                audio.onerror = () => {
                  clearInterval(progressInterval)
                  // 에러 발생 시 duration만큼 대기
                  const elapsed = Date.now() - startTime
                  const remaining = Math.max(0, targetDuration - elapsed)
                  setTimeout(() => finish(), remaining)
                }
                
                audio.play().catch(() => {
                  // 재생 실패 시 duration만큼 대기
                  setTimeout(() => {
                    clearInterval(progressInterval)
                    finish()
                  }, targetDuration)
                })

                // duration이 지나면 자동으로 다음 구간으로 (오디오가 끝나지 않아도)
                setTimeout(() => {
                  if (!resolved && audio && !audio.ended) {
                    clearInterval(progressInterval)
                    audio.pause()
                    finish()
                  }
                }, targetDuration)
              })
            } else {
              // 오디오가 없어도 duration만큼 대기
              console.warn(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생할 오디오 없음, duration만큼 대기: ${part.durationSec}초`)
              await new Promise(resolve => setTimeout(resolve, targetDuration))
            }

            // 다음 구간 재생 또는 다음 씬으로 이동 (리스트 순서대로만)
            if (!isPlayingRef.current) {
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
                lastRenderedSceneIndexRef.current = nextIndex

                updateCurrentScene(false, currentIndex, undefined, () => {
                  void playNextScene(nextIndex)
                })
              } else {
                // 다른 그룹으로 넘어갈 때는 일반 재생
                await playNextScene(currentIndex + 1)
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
      
      // TTS를 씬 시작 시점에 즉시 재생 (첫 번째 구간이 재생되기 시작하면 씬 전환)
      const ttsStarted = await playTts()
      
      // TTS가 시작되지 않았으면 (빈 텍스트 등) 씬 전환만 수행
      if (!ttsStarted) {
        selectScene(sceneIndex, true, () => {
          // 전환 효과 완료 콜백
        })
        // 첫 번째 씬에서만 BGM 재생 시작
        if (!bgmStarted && bgmTemplate && bgmAudioRef.current) {
          bgmStarted = true
          const audio = bgmAudioRef.current
          bgmStartTimeRef.current = Date.now()
          audio.play().catch(() => {})
          // BGM 페이드 아웃 시작 (첫 번째 씬에서만)
          setupBgmFadeOut()
        }
      }
    }
    
    void playNextScene(currentSceneIndex)
  }, [timeline, currentSceneIndex, voiceTemplate, bgmTemplate, playbackSpeed, buildSceneMarkup, makeTtsKey, selectScene, stopBgmAudio, stopTtsAudio, setCurrentSceneIndex, currentSceneIndexRef, lastRenderedSceneIndexRef, updateCurrentScene, setTimeline, textsRef, getMp3DurationSec, setShowReadyMessage, setCurrentTime])

  // 재생/일시정지 토글
  const handlePlayPause = useCallback(async () => {
    if (!isPlaying) {
      // 준비 중이면 아무것도 하지 않음
      if (isPreparing) {
        return
      }
      
      // 재생 시작: 모든 씬의 TTS 합성 및 BGM 로드
      if (!timeline) return
      
      // voiceTemplate 미선택 가드
      if (!voiceTemplate) {
        alert('목소리를 선택해주세요.')
        return
      }
      
      if (pixiReady !== undefined && !pixiReady) {
        return
      }
      if (spritesRef && spritesRef.current.size === 0) {
        return
      }
      
      // 현재 씬의 스프라이트가 로드되었는지 확인
      if (spritesRef) {
        const currentSprite = spritesRef.current.get(currentSceneIndex)
        if (!currentSprite) {
          // 스프라이트가 없으면 로드 시도
          if (pixiReady && appRef.current && loadAllScenes) {
            loadAllScenes().then(() => {
              // 로드 완료 후 재생 시작
              setTimeout(() => {
                handlePlayPause()
              }, 100)
            })
          }
          return
        }
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
      const ttsPromises = []

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
          console.log(`[TTS] 씬 ${i} 합성 필요: ${cachedCount}/${markups.length}개 구간 캐시됨`)
          scenesToSynthesize.push(i)
        } else {
          console.log(`[TTS] 씬 ${i} 이미 캐시됨 (${markups.length}개 구간 모두) - 스킵`)
        }
      }

      // 캐시되지 않은 씬만 배치 처리
      if (ensureSceneTts) {
        for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
          const batch = []
          for (let j = 0; j < batchSize && i + j < scenesToSynthesize.length; j++) {
            const sceneIndex = scenesToSynthesize[i + j]
            batch.push(
              ensureSceneTts(sceneIndex, undefined, changedScenesRef?.current.has(sceneIndex) || false)
                .then((result) => {
                  return result
                })
                .catch(() => {
                  return null
                })
            )
          }
          // 각 배치를 순차적으로 처리
          const batchResult = await Promise.allSettled(batch)
          ttsPromises.push(...batchResult.map(r => r.status === 'fulfilled' ? r.value : null))
          
          // 마지막 배치가 아니면 딜레이 추가
          if (i + batchSize < scenesToSynthesize.length) {
            await new Promise(resolve => setTimeout(resolve, batchDelay))
          }
        }
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
      
      // 모든 준비 완료 대기
      Promise.all([...ttsPromises, bgmPromise])
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
          
          // 로딩 완료 후 바로 재생 시작
          startPlayback()
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
          alert('재생 준비 중 오류가 발생했어요.')
        })
    } else {
      // 재생 중지
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current)
        playTimeoutRef.current = null
      }
      if (bgmStopTimeoutRef.current) {
        clearTimeout(bgmStopTimeoutRef.current)
        bgmStopTimeoutRef.current = null
      }
      bgmStartTimeRef.current = null
      setIsPlaying(false)
      isPlayingRef.current = false
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
      resetTtsSession()
      stopBgmAudio()
    }
  }, [isPlaying, isPreparing, timeline, voiceTemplate, bgmTemplate, playbackSpeed, pixiReady, spritesRef, currentSceneIndex, appRef, loadAllScenes, buildSceneMarkup, makeTtsKey, ensureSceneTts, changedScenesRef, startBgmAudio, startPlayback, resetTtsSession, stopBgmAudio, setIsTtsBootstrapping, setIsBgmBootstrapping, isTtsBootstrappingRef, isBgmBootstrappingRef])

  // 재생 중지 시 timeout 정리
  useEffect(() => {
    if (!isPlaying && playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current)
      playTimeoutRef.current = null
    }
  }, [isPlaying])

  return {
    isPlaying,
    setIsPlaying,
    isPreparing,
    play: handlePlayPause,
    pause: () => {
      if (isPlaying) {
        handlePlayPause()
      }
    },
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

