'use client'

import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getSoundEffectStorageUrl } from '@/lib/utils/supabase-storage'

/**
 * 단일 씬 재생 로직 (훅 외부에서도 사용 가능)
 */
export async function playSceneLogic({
  timeline,
  voiceTemplate,
  playbackSpeed,
  sceneIndex,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  textsRef,
  spritesRef,
  ttsCacheRef,
  ttsAudioRef,
  ttsAudioUrlRef,
  renderSceneImage,
  renderSubtitlePart,
  prepareImageAndSubtitle,
  renderSceneContent,
  setCurrentTime,
  onComplete,
  onNextScene,
  abortSignal,
  isPlayingRef,
  ensureSceneTts,
  changedScenesRef,
}: {
  timeline: TimelineData
  voiceTemplate: string
  playbackSpeed: number
  sceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
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
  renderSubtitlePart: (
    sceneIndex: number,
    partIndex: number,
    options?: {
      skipAnimation?: boolean
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
  setCurrentTime?: (time: number) => void
  onComplete?: () => void
  onNextScene?: () => void
  abortSignal?: AbortSignal
  isPlayingRef?: React.MutableRefObject<boolean>
  ensureSceneTts?: (sceneIndex: number, signal?: AbortSignal, forceRegenerate?: boolean) => Promise<{ sceneIndex: number; parts: Array<{ blob: Blob; durationSec: number; url: string | null; partIndex: number; markup: string }> }>
  changedScenesRef?: React.MutableRefObject<Set<number>>
}): Promise<void> {
  const resolveSoundEffectUrl = (filePath: string): string => {
    return getSoundEffectStorageUrl(filePath) ?? `/sound-effects/${filePath}`
  }

  const scene = timeline.scenes[sceneIndex]
  if (!scene) {
    if (onComplete) onComplete()
    return
  }

  // AbortSignal 체크
  if (abortSignal?.aborted) {
    return
  }

  // 이전 씬의 모든 오디오 정지
  const stopTtsAudio = () => {
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
  }

  stopTtsAudio()

  // 텍스트 객체와 스프라이트가 준비되었는지 확인
  // 같은 그룹 내 첫 번째 씬의 텍스트 객체 확인
  let targetTextObj: PIXI.Text | null = null
  const sceneId = scene.sceneId
  if (sceneId !== undefined) {
    const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
    if (firstSceneIndexInGroup >= 0) {
      targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
    }
  }
  if (!targetTextObj) {
    targetTextObj = textsRef.current.get(sceneIndex) || null
  }
  
  const targetSprite = spritesRef.current.get(sceneIndex) || null

  // 텍스트 객체나 스프라이트가 없으면 먼저 씬을 렌더링
  if (!targetTextObj || !targetSprite) {
    // 씬이 한 번도 렌더링되지 않았으므로 먼저 렌더링
    // updateCurrentScene을 직접 호출하여 씬을 초기화
    // currentSceneIndexRef를 먼저 설정
    currentSceneIndexRef.current = sceneIndex
    
    // updateCurrentScene을 사용하여 씬을 초기화 (skipAnimation: true로 즉시 표시)
    // isPlaying: true로 설정하여 updateCurrentScene이 텍스트를 업데이트하지 않도록 함
    // (renderSubtitlePart가 텍스트를 관리하므로)
    if (renderSceneContent) {
      await new Promise<void>((resolve) => {
        renderSceneContent(sceneIndex, null, {
          skipAnimation: true,
          updateTimeline: true, // 초기 렌더링이므로 timeline 업데이트 허용
          isPlaying: true, // 재생 중으로 설정하여 텍스트 업데이트 방지
          onComplete: () => {
            resolve()
          },
        })
      })
    } else {
      // fallback: renderSceneImage와 renderSubtitlePart 사용
      if (targetSprite) {
        targetSprite.visible = true
        targetSprite.alpha = 1
      }
      if (targetTextObj) {
        targetTextObj.visible = true
        targetTextObj.alpha = 1
      }
    }
    
    // 렌더링 후 다시 확인
    if (sceneId !== undefined) {
      const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
      if (firstSceneIndexInGroup >= 0) {
        targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
      }
    }
    if (!targetTextObj) {
      targetTextObj = textsRef.current.get(sceneIndex) || null
    }
    
    // 스프라이트도 다시 확인
    const targetSpriteAfter = spritesRef.current.get(sceneIndex) || null
    if (!targetSpriteAfter && sceneId !== undefined) {
      const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
      if (firstSceneIndexInGroup >= 0) {
        const firstSprite = spritesRef.current.get(firstSceneIndexInGroup)
        if (firstSprite) {
          // 같은 그룹의 첫 번째 씬 스프라이트 사용
        }
      }
    }
  }

  // 다른 모든 씬의 렌더링 중지 (현재 씬 제외)
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

  // 이전 씬 인덱스 계산
  // lastRenderedSceneIndexRef가 null이거나 현재 씬과 다르면 이전 씬으로 설정
  const previousSceneIndex = lastRenderedSceneIndexRef.current !== null 
    ? lastRenderedSceneIndexRef.current 
    : (currentSceneIndexRef.current !== sceneIndex ? currentSceneIndexRef.current : null)

  // 전환 효과 설정
  const transition = scene.transition || 'fade'
  const skipAnimation = transition === 'none'

  // prepareOnly 단계 제거: 최종 상태로 바로 렌더링하고 전환 효과 애니메이션만 적용
  // renderSceneContent가 없으면 prepareImageAndSubtitle 사용 (fallback)
  if (!renderSceneContent) {
    // fallback: 기존 방식 (renderSceneContent가 없는 경우)
    await new Promise<void>((resolve) => {
      prepareImageAndSubtitle(sceneIndex, 0, {
        onComplete: () => {
          resolve()
        },
      })
    })
  }

  // 3. TTS 재생 함수 정의 (renderSceneContent의 onComplete에서 호출)
  const playTts = async (): Promise<void> => {
    try {
      // 원본 텍스트 저장
      const originalText = scene.text?.content || ''

      // ||| 기준으로 텍스트 배열로 나누기
      const scriptParts = (originalText || '').split(/\s*\|\|\|\s*/).map(p => (p && typeof p === 'string' ? p.trim() : '')).filter(p => p.length > 0)

      if (scriptParts.length === 0) {
        // TTS가 없으면 fallback duration 사용
        const fallbackDuration = scene.duration
        const waitTime = (fallbackDuration * 1000) / playbackSpeed
        setTimeout(() => {
          if (!abortSignal?.aborted && (!isPlayingRef || isPlayingRef.current)) {
            if (onNextScene) {
              onNextScene()
            } else if (onComplete) {
              onComplete()
            }
          }
        }, waitTime)
        return
      }

      // 각 구간을 순차적으로 처리
      const playPart = async (partIndex: number): Promise<void> => {
        // AbortSignal 체크
        if (abortSignal?.aborted) {
          return
        }

        if ((isPlayingRef && !isPlayingRef.current) || partIndex >= scriptParts.length) {
          return
        }

        const currentPartText = scriptParts[partIndex]?.trim() || ''

        if (!currentPartText) {
          // 다음 구간으로
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          } else if (onNextScene) {
            onNextScene()
          } else if (onComplete) {
            onComplete()
          }
          return
        }

        // 자막 즉시 표시 (음성 재생과 동시에, 애니메이션 없이)
        if (currentPartText) {
          renderSubtitlePart(sceneIndex, partIndex, {
            skipAnimation: true,
            onComplete: () => {
              // 자막 업데이트 완료 (추가 렌더링 없음)
            },
          })
        }

        // 해당 구간의 TTS 파일 가져오기
        const markups = buildSceneMarkup(timeline, sceneIndex)
        if (partIndex >= markups.length) {
          // 다음 구간으로
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          } else if (onNextScene) {
            onNextScene()
          } else if (onComplete) {
            onComplete()
          }
          return
        }

        const markup = markups[partIndex]
        if (!markup) {
          // 다음 구간으로
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          } else if (onNextScene) {
            onNextScene()
          } else if (onComplete) {
            onComplete()
          }
          return
        }

        // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
        const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate

        // TTS 파일 가져오기 (캐시에서)
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        
        let cached = ttsCacheRef.current.get(key)

        // 키로 찾지 못했으면 마크업으로 직접 검색 시도
        if (!cached) {
          for (const [, cacheValue] of ttsCacheRef.current.entries()) {
            if (cacheValue.markup === markup) {
              cached = cacheValue
              break
            }
          }
        }

        if (!cached) {
          // ensureSceneTts가 있으면 동적으로 TTS 생성 시도
          if (ensureSceneTts && changedScenesRef) {
            try {
              const forceRegenerate = changedScenesRef.current.has(sceneIndex)
              const ttsResult = await ensureSceneTts(sceneIndex, abortSignal, forceRegenerate)
              
              // 생성된 TTS를 캐시에 저장
              const markups = buildSceneMarkup(timeline, sceneIndex)
              const scene = timeline.scenes[sceneIndex]
              // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
              const sceneVoiceTemplate = scene?.voiceTemplate || voiceTemplate
              
              for (let i = 0; i < ttsResult.parts.length; i++) {
                const part = ttsResult.parts[i]
                const partMarkup = markups[i]
                if (part && partMarkup) {
                  const partKey = makeTtsKey(sceneVoiceTemplate, partMarkup)
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
              if (!cached && partIndex < markups.length) {
                // 마크업으로 다시 검색
                for (const [, cacheValue] of ttsCacheRef.current.entries()) {
                  if (cacheValue.markup === markup) {
                    cached = cacheValue
                    break
                  }
                }
              }
            } catch (error) {
              console.error(`[playSceneLogic] 씬 ${sceneIndex} TTS 동적 생성 실패:`, error)
            }
          }
          
          // 여전히 캐시를 찾지 못하면 재생 중지
          if (!cached) {
            console.error(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 캐시 없음 - 재생 중지`)
            if (onComplete) {
              onComplete()
            }
            return
          }
        }
        

        const part = {
          blob: cached.blob,
          durationSec: cached.durationSec,
          url: cached.url,
          partIndex,
          markup,
        }

        if (!part || (!part.blob && !part.url)) {
          // 다음 구간으로
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          } else if (onNextScene) {
            onNextScene()
          } else if (onComplete) {
            onComplete()
          }
          return
        }

        if (!part.durationSec || part.durationSec <= 0) {
          console.error(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS duration이 없음`)
          // 다음 구간으로
          if (partIndex < scriptParts.length - 1) {
            await playPart(partIndex + 1)
          } else if (onNextScene) {
            onNextScene()
          } else if (onComplete) {
            onComplete()
          }
          return
        }

        // TTS 재생
        stopTtsAudio()
        let audioUrl: string | null = null
        if (part.url) {
          audioUrl = part.url
        } else if (part.blob) {
          audioUrl = URL.createObjectURL(part.blob)
        }

        const targetDuration = (part.durationSec * 1000) / playbackSpeed

        if (audioUrl) {
        // 효과음: 씬의 첫 구간에서 TTS 시작과 동시 재생
        if (partIndex === 0 && scene.soundEffect) {
          const effectUrl = resolveSoundEffectUrl(scene.soundEffect)
          const seAudio = new Audio(effectUrl)
          seAudio.volume = 0.4
          seAudio.play().catch((err) => {
            console.warn('[playSceneLogic] 효과음 재생 실패:', err)
          })
        }

          ttsAudioUrlRef.current = audioUrl
          const audio = new Audio(audioUrl)
          audio.playbackRate = playbackSpeed
          ttsAudioRef.current = audio

          await new Promise<void>((resolve) => {
            // AbortSignal 체크
            if (abortSignal?.aborted) {
              resolve()
              return
            }

            const handleEnded = () => {
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              stopTtsAudio()
              resolve()
            }

            const handleError = () => {
              console.error(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 오디오 재생 에러`)
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              stopTtsAudio()
              resolve()
            }

            audio.addEventListener('ended', handleEnded)
            audio.addEventListener('error', handleError)

            // 재생 중지 상태 확인
            if (abortSignal?.aborted || (isPlayingRef && !isPlayingRef.current)) {
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              stopTtsAudio()
              resolve()
              return
            }

            audio.play().catch((error) => {
              // AbortError는 재생 중지로 인한 정상적인 경우이므로 무시
              if (error.name !== 'AbortError' && !error.message?.includes('interrupted')) {
                console.error(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} audio.play() 실패:`, error)
              }
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              stopTtsAudio()
              resolve()
            })
          })
        } else {
          // 오디오가 없어도 duration만큼 대기
          await new Promise(resolve => setTimeout(resolve, targetDuration))
        }

        // 다음 구간 재생 또는 완료
        if (abortSignal?.aborted || (isPlayingRef && !isPlayingRef.current)) {
          return
        }

        if (partIndex < scriptParts.length - 1) {
          // 같은 씬의 다음 구간 재생
          await playPart(partIndex + 1)
        } else {
          // 모든 구간 재생 완료
          if (onNextScene) {
            onNextScene()
          } else if (onComplete) {
            onComplete()
          }
        }
      }

      // 첫 번째 구간부터 재생 시작
      await playPart(0)
    } catch (error) {
      console.error('[playSceneLogic] TTS 재생 실패:', error)
      // 에러 발생 시 fallback duration 사용
      const fallbackDuration = scene.duration
      const waitTime = (fallbackDuration * 1000) / playbackSpeed
      setTimeout(() => {
        if (!abortSignal?.aborted && (!isPlayingRef || isPlayingRef.current)) {
          if (onNextScene) {
            onNextScene()
          } else if (onComplete) {
            onComplete()
          }
        }
      }, waitTime)
    }
  }

  // renderSceneContent로 전환 효과 적용 (이미지 + 첫 번째 구간 자막)
  // TTS 재생은 전환 효과 완료 후 시작
  // prepareOnly 단계 제거: 최종 상태로 바로 렌더링하고 전환 효과 애니메이션만 적용
  if (renderSceneContent) {
    // 전환 효과 적용 (최종 상태로 바로 렌더링)
    // previousIndex를 명시적으로 전달하여 씬 전환으로 인식하도록 함
    // 전환 효과와 동시에 TTS 재생 시작 (await하지 않음)
    // 이미지는 전환 효과를 통해서만 렌더링됨 (전환 효과 완료 후 항상 숨김)
    renderSceneContent(sceneIndex, 0, {
      skipAnimation,
      forceTransition: transition,
      previousIndex: previousSceneIndex !== null ? previousSceneIndex : undefined, // null을 undefined로 변환하여 씬 전환으로 인식
      updateTimeline: false, // 재생 중에는 timeline 업데이트 안함 (다른 함수 영향 방지)
      prepareOnly: false, // 최종 상태로 바로 렌더링 (전환 효과 애니메이션은 usePixiEffects에서 처리)
      isPlaying: true, // 재생 중임을 명시
      onComplete: () => {
        // lastRenderedSceneIndexRef 업데이트는 전환 효과 완료 후에
        lastRenderedSceneIndexRef.current = sceneIndex
        setCurrentSceneIndex(sceneIndex)
        currentSceneIndexRef.current = sceneIndex
      },
    })
    
    // lastRenderedSceneIndexRef 업데이트 (전환 효과 시작과 동시에)
    lastRenderedSceneIndexRef.current = sceneIndex
    setCurrentSceneIndex(sceneIndex)
    currentSceneIndexRef.current = sceneIndex
    
    // 전환 효과와 동시에 TTS 재생 시작 (await하지 않음)
    await playTts()
  } else {
    // fallback: 기존 방식 (renderSceneContent가 없는 경우)
    // 1. 이미지 전환 효과 시작
    renderSceneImage(sceneIndex, {
      skipAnimation,
      forceTransition: transition,
      previousIndex: previousSceneIndex,
      onComplete: () => {},
      prepareOnly: false,
    })

    // 2. 첫 번째 구간 자막 렌더링 시작
    renderSubtitlePart(sceneIndex, 0, {
      skipAnimation,
      onComplete: () => {},
    })

    // lastRenderedSceneIndexRef 업데이트
    lastRenderedSceneIndexRef.current = sceneIndex
    setCurrentSceneIndex(sceneIndex)
    currentSceneIndexRef.current = sceneIndex

    // TTS 재생 시작
    await playTts()
  }
}

interface UseScenePlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  playbackSpeed: number
  sceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  appRef: React.RefObject<PIXI.Application | null>
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  ttsAudioRef: { current: HTMLAudioElement | null }
  ttsAudioUrlRef: { current: string | null }
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
  renderSubtitlePart: (
    sceneIndex: number,
    partIndex: number,
    options?: {
      skipAnimation?: boolean
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
  onComplete?: () => void
  onNextScene?: () => void
}

/**
 * 단일 씬 재생 훅
 * - 전환효과가 적용된 이미지 렌더링
 * - 자막 렌더링
 * - TTS 음성 실행
 * - 위 3가지를 싱크 맞춰서 처리
 */
export function useScenePlayback({
  timeline,
  voiceTemplate,
  playbackSpeed,
  sceneIndex,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  textsRef,
  spritesRef,
  appRef,
  ttsCacheRef,
  ttsAudioRef,
  ttsAudioUrlRef,
  renderSceneImage,
  renderSubtitlePart,
  prepareImageAndSubtitle,
  setCurrentTime,
  onComplete,
  onNextScene,
}: UseScenePlaybackParams) {
  const isPlayingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * TTS 오디오 정지
   */
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
  }, [ttsAudioRef, ttsAudioUrlRef])

  /**
   * 단일 씬 재생 함수
   * 이미지 렌더링, 자막 렌더링, TTS 재생을 싱크 맞춰서 처리
   */
  const playScene = useCallback(async (): Promise<void> => {
    if (!timeline || !voiceTemplate) {
      if (onComplete) onComplete()
      return
    }

    // AbortController 생성
    abortControllerRef.current = new AbortController()
    isPlayingRef.current = true

    // playSceneLogic 사용
    await playSceneLogic({
      timeline,
      voiceTemplate,
      playbackSpeed,
      sceneIndex,
      setCurrentSceneIndex,
      currentSceneIndexRef,
      lastRenderedSceneIndexRef,
      textsRef,
      spritesRef,
      ttsCacheRef,
      ttsAudioRef,
      ttsAudioUrlRef,
      renderSceneImage,
      renderSubtitlePart,
      prepareImageAndSubtitle,
      setCurrentTime,
      onComplete,
      onNextScene,
      abortSignal: abortControllerRef.current.signal,
      isPlayingRef,
    })
  }, [
    timeline,
    voiceTemplate,
    playbackSpeed,
    sceneIndex,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    textsRef,
    spritesRef,
    ttsCacheRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
    setCurrentTime,
    onComplete,
    onNextScene,
  ])

  /**
   * 재생 중지
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    isPlayingRef.current = false
    stopTtsAudio()
  }, [stopTtsAudio])

  return {
    playScene,
    stop,
    isPlaying: isPlayingRef,
  }
}

