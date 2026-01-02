'use client'

import { useCallback} from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseGroupPlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: (voiceName: string, markup: string) => string
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  ensureSceneTts?: (sceneIndex: number, signal?: AbortSignal, forceRegenerate?: boolean) => Promise<{ sceneIndex: number; parts: Array<{ blob: Blob; durationSec: number; url: string | null; partIndex: number; markup: string }> }>
  renderSceneContent: (
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
      skipImage?: boolean
    }
  ) => void
  renderSubtitlePart: (
    sceneIndex: number,
    partIndex: number,
    options?: {
      skipAnimation?: boolean
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  setTimeline: (timeline: TimelineData) => void
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  ttsAudioRef: React.MutableRefObject<HTMLAudioElement | null>
  ttsAudioUrlRef: React.MutableRefObject<string | null>
  renderSceneImage: (
    sceneIndex: number,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  prepareImageAndSubtitle: (
    sceneIndex: number,
    partIndex?: number,
    options?: {
      onComplete?: () => void
    }
  ) => void
  setCurrentTime?: (time: number) => void
  changedScenesRef: React.MutableRefObject<Set<number>>
  isPlayingRef: React.MutableRefObject<boolean>
  setIsPreparing?: (preparing: boolean) => void
  setIsTtsBootstrapping?: (bootstrapping: boolean) => void
}

export function useGroupPlayback({
  timeline,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
  ttsCacheRef,
  ensureSceneTts: ensureSceneTtsParam,
  renderSceneContent,
  renderSubtitlePart,
  setTimeline,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  textsRef,
  spritesRef,
  ttsAudioRef,
  ttsAudioUrlRef,
  renderSceneImage,
  prepareImageAndSubtitle,
  setCurrentTime,
  changedScenesRef,
  isPlayingRef,
  setIsPreparing,
  setIsTtsBootstrapping,
}: UseGroupPlaybackParams) {
  /**
   * 그룹 재생 함수
   * 1. 그룹화된 씬 확인
   * 2. TTS 캐시 확인 및 API 호출 (캐시 없으면 생성 후 저장)
   * 3. TTS duration 합산 및 전환 효과 길이 설정
   * 4. TTS 음성과 전환 효과 동시 시작
   * 5. 마지막 씬의 TTS가 끝나면 다음 씬으로 전환
   */
  const playGroup = useCallback(async (sceneId: number, groupIndices: number[]) => {
    if (!timeline || !voiceTemplate) {
      return
    }

    if (!ensureSceneTtsParam) {
      return
    }

    // 1. 그룹화된 씬 확인
    const groupScenes = groupIndices.map(index => timeline.scenes[index]).filter(Boolean)
    if (groupScenes.length === 0) {
      console.warn('[useGroupPlayback] 그룹에 유효한 씬이 없습니다.')
      return
    }

    // 2. TTS 캐시 상태 확인 및 API 호출
    const scenesToSynthesize: number[] = []
    for (const sceneIndex of groupIndices) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      const cachedCount = markups.filter(markup => {
        const key = makeTtsKey(voiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      }).length
      
      if (cachedCount < markups.length) {
        scenesToSynthesize.push(sceneIndex)
      }
    }

    // 캐시에 없으면 API 호출 후 저장
    if (scenesToSynthesize.length > 0) {
      if (setIsPreparing) setIsPreparing(true)
      if (setIsTtsBootstrapping) setIsTtsBootstrapping(true)
      
      try {
        for (const sceneIndex of scenesToSynthesize) {
          await ensureSceneTtsParam(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex) || false)
        }
      } catch {
        if (setIsPreparing) setIsPreparing(false)
        if (setIsTtsBootstrapping) setIsTtsBootstrapping(false)
        return
      }
      
      if (setIsPreparing) setIsPreparing(false)
      if (setIsTtsBootstrapping) setIsTtsBootstrapping(false)
    }

    // 3. TTS Duration 합산 및 전환 효과 길이 설정
    let totalGroupTtsDuration = 0
    
    for (const sceneIndex of groupIndices) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      let sceneTtsDuration = 0
      
      for (let partIndex = 0; partIndex < markups.length; partIndex++) {
        const markup = markups[partIndex]
        const key = makeTtsKey(voiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        
        if (cached && cached.durationSec > 0) {
          sceneTtsDuration += cached.durationSec
        }
      }
      
      totalGroupTtsDuration += sceneTtsDuration
    }

    // 첫 번째 씬의 transitionDuration을 그룹 전체 TTS duration 합으로 설정
    const firstSceneIndex = groupIndices[0]
    const firstScene = timeline.scenes[firstSceneIndex]
    const originalTransitionDuration = firstScene?.transitionDuration
    
    // 업데이트된 timeline 생성 (playSceneLogic에 전달하기 위해)
    let updatedTimeline = timeline
    if (firstScene && totalGroupTtsDuration > 0) {
      updatedTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === firstSceneIndex
            ? {
                ...scene,
                transitionDuration: totalGroupTtsDuration,
              }
            : scene
        ),
      }
      setTimeline(updatedTimeline)
    }

    // 재생 중지 가능하도록 AbortController 생성
    const abortController = new AbortController()
    isPlayingRef.current = true

    // TTS 재생 함수 (자막만 업데이트하고 TTS 재생, 같은 그룹 내 씬용)
    const playTtsOnly = async (sceneIndex: number): Promise<void> => {
      // 최신 timeline 사용 (업데이트된 timeline 반영)
      const currentTimeline = updatedTimeline || timeline
      const scene = currentTimeline.scenes[sceneIndex]
      if (!scene) return

      // 같은 그룹 내 첫 번째 씬의 텍스트 객체 사용
      const sceneId = scene.sceneId
      let textToUpdate: PIXI.Text | null = null
      if (sceneId !== undefined) {
        const firstSceneIndexInGroup = currentTimeline.scenes.findIndex((s) => s.sceneId === sceneId)
        if (firstSceneIndexInGroup >= 0) {
          textToUpdate = textsRef.current.get(firstSceneIndexInGroup) || null
        }
      }
      if (!textToUpdate) {
        textToUpdate = textsRef.current.get(sceneIndex) || null
      }

      const originalText = scene.text?.content || ''
      const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)

      if (scriptParts.length === 0) {
        const fallbackDuration = scene.duration
        const waitTime = (fallbackDuration * 1000) / (currentTimeline?.playbackSpeed ?? 1.0)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return
      }

      // 각 구간을 순차적으로 처리
      const playPart = async (partIndex: number): Promise<void> => {
        if (abortController.signal.aborted || !isPlayingRef.current) return

        if (partIndex >= scriptParts.length) return

        const currentPartText = scriptParts[partIndex]?.trim() || ''
        if (!currentPartText) {
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          }
          return
        }

        // 자막 즉시 표시
        if (textToUpdate && currentPartText) {
          textToUpdate.text = currentPartText
          textToUpdate.visible = true
          textToUpdate.alpha = 1
        } else if (renderSubtitlePart) {
          renderSubtitlePart(sceneIndex, partIndex, {
            skipAnimation: true,
            onComplete: () => {},
          })
        }

        // TTS 재생
        const markups = buildSceneMarkup(currentTimeline, sceneIndex)
        if (partIndex >= markups.length) {
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          }
          return
        }

        const markup = markups[partIndex]
        if (!markup) {
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          }
          return
        }

        // TTS 파일 가져오기
        const key = makeTtsKey(voiceTemplate, markup)
        let cached = ttsCacheRef.current.get(key)

        if (!cached) {
          // 마크업으로 직접 검색
          for (const [, cacheValue] of ttsCacheRef.current.entries()) {
            if (cacheValue.markup === markup) {
              cached = cacheValue
              break
            }
          }
        }

        // TTS 재생 (cached.url 또는 cached.blob 확인)
        if (cached && (cached.url || cached.blob)) {
          // 이전 오디오 완전히 정지 및 정리
          const prevAudio = ttsAudioRef.current
          if (prevAudio) {
            try {
              prevAudio.pause()
              prevAudio.currentTime = 0
              prevAudio.src = '' // src를 비워서 완전히 정리
            } catch {
              // ignore
            }
          }
          ttsAudioRef.current = null
          if (ttsAudioUrlRef.current) {
            URL.revokeObjectURL(ttsAudioUrlRef.current)
            ttsAudioUrlRef.current = null
          }

          // 새 오디오 재생 (url 우선, 없으면 blob으로 생성)
          let audioUrl: string | null = null
          if (cached.url) {
            audioUrl = cached.url
          } else if (cached.blob) {
            audioUrl = URL.createObjectURL(cached.blob)
          }

          if (!audioUrl) {
            console.warn(`[useGroupPlayback] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS URL 생성 실패`)
            // 다음 구간으로
            if (partIndex < scriptParts.length - 1) {
              await playPart(partIndex + 1)
            }
            return
          }

          ttsAudioUrlRef.current = audioUrl
          const audio = new Audio(audioUrl)
          audio.playbackRate = currentTimeline?.playbackSpeed ?? 1.0
          ttsAudioRef.current = audio
          
          await new Promise<void>((resolve) => {
            // AbortSignal 체크
            if (abortController.signal.aborted) {
              resolve()
              return
            }

            const handleEnded = () => {
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              resolve()
            }
            
            const handleError = () => {
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              resolve()
            }
            
            audio.addEventListener('ended', handleEnded)
            audio.addEventListener('error', handleError)
            
            // 재생 중지 상태 확인
            if (abortController.signal.aborted || !isPlayingRef.current) {
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              resolve()
              return
            }
            
            // audio.play() 호출 및 성공/실패 처리
            audio.play()
              .then(() => {
                // 재생 시작 성공 - ended 이벤트를 기다림
                // 이벤트 리스너가 이미 등록되어 있으므로 추가 처리 불필요
              })
              .catch((error) => {
                // AbortError는 재생 중지로 인한 정상적인 경우이므로 무시
                if (error.name !== 'AbortError' && !error.message?.includes('interrupted')) {
                  console.error(`[useGroupPlayback] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 재생 시작 실패:`, error)
                }
                audio.removeEventListener('ended', handleEnded)
                audio.removeEventListener('error', handleError)
                handleError()
              })
          })
        } else {
          // TTS 캐시가 없으면 동적 생성 시도
          if (ensureSceneTtsParam && changedScenesRef) {
            try {
              const forceRegenerate = changedScenesRef.current.has(sceneIndex)
              const ttsResult = await ensureSceneTtsParam(sceneIndex, abortController.signal, forceRegenerate)
              
              // 생성된 TTS를 캐시에 저장
              const generatedMarkups = buildSceneMarkup(currentTimeline, sceneIndex)
              for (let i = 0; i < ttsResult.parts.length; i++) {
                const part = ttsResult.parts[i]
                const partMarkup = generatedMarkups[i]
                if (part && partMarkup) {
                  const partKey = makeTtsKey(voiceTemplate, partMarkup)
                  const scene = currentTimeline.scenes[sceneIndex]
                  const cacheEntry = {
                    blob: part.blob,
                    durationSec: part.durationSec,
                    markup: part.markup || partMarkup,
                    url: part.url || null,
                    sceneId: scene?.sceneId,
                    sceneIndex,
                  }
                  ttsCacheRef.current.set(partKey, cacheEntry)
                }
              }
              
              // 캐시에 저장했으니 다시 찾기
              cached = ttsCacheRef.current.get(key)
              if (!cached && partIndex < generatedMarkups.length) {
                // 마크업으로 다시 검색
                for (const [, cacheValue] of ttsCacheRef.current.entries()) {
                  if (cacheValue.markup === markup) {
                    cached = cacheValue
                    break
                  }
                }
              }
              
              // 캐시를 찾았으면 재생 시도
              if (cached && (cached.url || cached.blob)) {
                // 이전 오디오 완전히 정지 및 정리
                const prevAudio = ttsAudioRef.current
                if (prevAudio) {
                  try {
                    prevAudio.pause()
                    prevAudio.currentTime = 0
                    prevAudio.src = ''
                  } catch {
                    // ignore
                  }
                }
                ttsAudioRef.current = null
                if (ttsAudioUrlRef.current) {
                  URL.revokeObjectURL(ttsAudioUrlRef.current)
                  ttsAudioUrlRef.current = null
                }

                // 새 오디오 재생
                let audioUrl: string | null = null
                if (cached.url) {
                  audioUrl = cached.url
                } else if (cached.blob) {
                  audioUrl = URL.createObjectURL(cached.blob)
                }

                if (audioUrl) {
                  ttsAudioUrlRef.current = audioUrl
                  const audio = new Audio(audioUrl)
                  audio.playbackRate = currentTimeline?.playbackSpeed ?? 1.0
                  ttsAudioRef.current = audio
                  
                  await new Promise<void>((resolve) => {
                    if (abortController.signal.aborted) {
                      resolve()
                      return
                    }

                    const handleEnded = () => {
                      audio.removeEventListener('ended', handleEnded)
                      audio.removeEventListener('error', handleError)
                      resolve()
                    }
                    
                    const handleError = () => {
                      audio.removeEventListener('ended', handleEnded)
                      audio.removeEventListener('error', handleError)
                      resolve()
                    }
                    
                    audio.addEventListener('ended', handleEnded)
                    audio.addEventListener('error', handleError)
                    
                    if (abortController.signal.aborted || !isPlayingRef.current) {
                      audio.removeEventListener('ended', handleEnded)
                      audio.removeEventListener('error', handleError)
                      resolve()
                      return
                    }
                    
                    audio.play()
                      .then(() => {
                        // 재생 시작 성공
                      })
                      .catch((error) => {
                        if (error.name !== 'AbortError' && !error.message?.includes('interrupted')) {
                          console.error(`[useGroupPlayback] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 재생 시작 실패:`, error)
                        }
                        audio.removeEventListener('ended', handleEnded)
                        audio.removeEventListener('error', handleError)
                        handleError()
                      })
                  })
                } else {
                  // URL 생성 실패 시 fallback duration 사용
                  const fallbackDuration = scene.duration / scriptParts.length
                  const waitTime = (fallbackDuration * 1000) / (currentTimeline?.playbackSpeed ?? 1.0)
                  await new Promise(resolve => setTimeout(resolve, waitTime))
                }
              } else {
                // 여전히 캐시를 찾지 못하면 fallback duration 사용
                const fallbackDuration = scene.duration / scriptParts.length
                const waitTime = (fallbackDuration * 1000) / (currentTimeline?.playbackSpeed ?? 1.0)
                await new Promise(resolve => setTimeout(resolve, waitTime))
              }
            } catch {
              // TTS 생성 실패 시 fallback duration 사용
              const fallbackDuration = scene.duration / scriptParts.length
              const waitTime = (fallbackDuration * 1000) / (currentTimeline?.playbackSpeed ?? 1.0)
              await new Promise(resolve => setTimeout(resolve, waitTime))
            }
          } else {
            // ensureSceneTts가 없으면 fallback duration 사용
            const fallbackDuration = scene.duration / scriptParts.length
            const waitTime = (fallbackDuration * 1000) / (currentTimeline?.playbackSpeed ?? 1.0)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }

        // 다음 구간 재생 (현재 구간 재생 완료 후)
        if (partIndex < scriptParts.length - 1) {
          await playPart(partIndex + 1)
        }
      }

      // 첫 번째 구간부터 재생 시작
      await playPart(0)
      
      // 모든 구간 재생 완료 후 오디오 정리
      const finalAudio = ttsAudioRef.current
      if (finalAudio) {
        try {
          finalAudio.pause()
          finalAudio.currentTime = 0
        } catch {
          // ignore
        }
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current)
        ttsAudioUrlRef.current = null
      }
    }

    // 4. 그룹 내 모든 씬의 TTS를 순차적으로 재생 (이미지 전환 효과 없이)
    try {
      // 모든 씬의 TTS를 순차적으로 재생
      for (let i = 0; i < groupIndices.length; i++) {
        const sceneIndex = groupIndices[i]
        
        // 중단 신호 확인
        if (abortController.signal.aborted || !isPlayingRef.current) {
          break
        }
        
        // 씬리스트 패널 업데이트
        currentSceneIndexRef.current = sceneIndex
        setCurrentSceneIndex(sceneIndex)
        
        // 자막 업데이트 및 TTS 재생
        await playTtsOnly(sceneIndex)
        
        // 재생 완료 후 lastRenderedSceneIndexRef 업데이트
        lastRenderedSceneIndexRef.current = sceneIndex
      }
    } catch {
      // 재생 실패 처리
    } finally {
      // 원래 transitionDuration 복원
      if (firstScene && originalTransitionDuration !== undefined) {
        const restoredTimeline = {
          ...timeline,
          scenes: timeline.scenes.map((scene, idx) =>
            idx === firstSceneIndex
              ? {
                  ...scene,
                  transitionDuration: originalTransitionDuration,
                }
              : scene
          ),
        }
        setTimeline(restoredTimeline)
      }
      
      isPlayingRef.current = false
    }
  }, [
    timeline,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    ttsCacheRef,
    ensureSceneTtsParam,
    renderSceneContent,
    renderSubtitlePart,
    setTimeline,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    textsRef,
    spritesRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    renderSceneImage,
    prepareImageAndSubtitle,
    setCurrentTime,
    changedScenesRef,
    isPlayingRef,
    setIsPreparing,
    setIsTtsBootstrapping,
  ])

  return {
    playGroup,
  }
}

