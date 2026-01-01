'use client'

import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'

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
      skipImage?: boolean
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
  const scene = timeline.scenes[sceneIndex]
  if (!scene) {
    console.warn(`[playSceneLogic] 씬 ${sceneIndex}을 찾을 수 없습니다.`)
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
  const previousSceneIndex = lastRenderedSceneIndexRef.current

  // 전환 효과 설정
  const transition = scene.transition || 'fade'
  const skipAnimation = transition === 'none'

  // renderSceneContent 사용: 이미지와 자막을 alpha: 0으로 준비
  if (renderSceneContent) {
    await new Promise<void>((resolve) => {
      renderSceneContent(sceneIndex, 0, {
        skipAnimation: false, // 준비 단계에서는 애니메이션 스킵
        forceTransition: transition,
        previousIndex: previousSceneIndex,
        updateTimeline: false, // 재생 중에는 timeline 업데이트 안함 (다른 함수 영향 방지)
        prepareOnly: true, // alpha: 0으로 준비만
        onComplete: () => {
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 이미지/자막 준비 완료`)
          resolve()
        },
      })
    })
  } else {
    // fallback: 기존 방식 (renderSceneContent가 없는 경우)
    await new Promise<void>((resolve) => {
      prepareImageAndSubtitle(sceneIndex, 0, {
        onComplete: () => {
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 이미지/자막 준비 완료`)
          resolve()
        },
      })
    })
  }

  // 3. TTS 재생 함수 정의 (renderSceneContent의 onComplete에서 호출)
  const playTts = async (): Promise<void> => {
    console.log(`[playSceneLogic] playTts 호출됨 | sceneIndex: ${sceneIndex}`)
    try {
      // 원본 텍스트 저장
      const originalText = scene.text?.content || ''
      console.log(`[playSceneLogic] playTts | originalText: "${originalText.substring(0, 50)}..."`)

      // ||| 기준으로 텍스트 배열로 나누기
      const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
      console.log(`[playSceneLogic] playTts | scriptParts.length: ${scriptParts.length}`)

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
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex} 재생 중지됨`)
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

        // 자막 즉시 표시 (음성 재생과 동시에)
        if (currentPartText) {
          renderSubtitlePart(sceneIndex, partIndex, {
            skipAnimation: true,
          })
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 자막 렌더링: "${currentPartText.substring(0, 30)}..."`)
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

        // TTS 파일 가져오기 (캐시에서)
        const key = makeTtsKey(voiceTemplate, markup)
        console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 키 생성`)
        console.log(`[playSceneLogic] voiceTemplate: "${voiceTemplate}"`)
        console.log(`[playSceneLogic] markup: "${markup.substring(0, 100)}..."`)
        console.log(`[playSceneLogic] 생성된 키: "${key.substring(0, 150)}..."`)
        console.log(`[playSceneLogic] 캐시 크기: ${ttsCacheRef.current.size}`)
        
        let cached = ttsCacheRef.current.get(key)
        console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 캐시 확인: ${cached ? '있음' : '없음'}`)

        // 키로 찾지 못했으면 마크업으로 직접 검색 시도
        if (!cached) {
          console.warn(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 키로 캐시를 찾지 못함, 마크업으로 검색 시도`)
          for (const [cacheKey, cacheValue] of ttsCacheRef.current.entries()) {
            if (cacheValue.markup === markup) {
              console.log(`[playSceneLogic] 마크업으로 캐시 발견! 키: "${cacheKey.substring(0, 200)}..."`)
              cached = cacheValue
              break
            }
          }
        }

        if (!cached) {
          console.warn(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 캐시 없음 - 동적 생성 시도`)
          console.warn(`[playSceneLogic] 생성된 키 전체: "${key}"`)
          console.warn(`[playSceneLogic] 캐시된 키 목록 (총 ${ttsCacheRef.current.size}개):`)
          const cacheKeys = Array.from(ttsCacheRef.current.keys())
          cacheKeys.forEach((cacheKey, idx) => {
            console.warn(`[playSceneLogic] 캐시 키 ${idx + 1}: "${cacheKey.substring(0, 200)}..."`)
            // 키가 비슷한지 확인 (voiceTemplate 부분만 비교)
            if (cacheKey.includes(voiceTemplate)) {
              console.warn(`[playSceneLogic] 같은 voiceTemplate 발견: "${cacheKey.substring(0, 200)}..."`)
            }
          })
          
          // ensureSceneTts가 있으면 동적으로 TTS 생성 시도
          if (ensureSceneTts && changedScenesRef) {
            console.log(`[playSceneLogic] 씬 ${sceneIndex} TTS 동적 생성 시작`)
            try {
              const forceRegenerate = changedScenesRef.current.has(sceneIndex)
              const ttsResult = await ensureSceneTts(sceneIndex, abortSignal, forceRegenerate)
              console.log(`[playSceneLogic] 씬 ${sceneIndex} TTS 동적 생성 완료: ${ttsResult.parts.length}개 구간`)
              
              // 생성된 TTS를 캐시에 저장
              const markups = buildSceneMarkup(timeline, sceneIndex)
              for (let i = 0; i < ttsResult.parts.length; i++) {
                const part = ttsResult.parts[i]
                const partMarkup = markups[i]
                if (part && partMarkup) {
                  const partKey = makeTtsKey(voiceTemplate, partMarkup)
                  const scene = timeline.scenes[sceneIndex]
                  const cacheEntry = {
                    blob: part.blob,
                    durationSec: part.durationSec,
                    markup: part.markup || partMarkup,
                    url: part.url || null,
                    sceneId: scene?.sceneId,
                    sceneIndex,
                  }
                  ttsCacheRef.current.set(partKey, cacheEntry)
                  console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${i + 1} 동적 생성 후 캐시 저장 완료`)
                }
              }
              
              // 캐시에 저장했으니 다시 찾기
              cached = ttsCacheRef.current.get(key)
              if (!cached && partIndex < markups.length) {
                // 마크업으로 다시 검색
                for (const [, cacheValue] of ttsCacheRef.current.entries()) {
                  if (cacheValue.markup === markup) {
                    console.log(`[playSceneLogic] 동적 생성 후 마크업으로 캐시 발견!`)
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
        
        console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 캐시 발견 | duration: ${cached.durationSec}초, url: ${cached.url ? '있음' : '없음'}, blob: ${cached.blob ? '있음' : '없음'}`)

        const part = {
          blob: cached.blob,
          durationSec: cached.durationSec,
          url: cached.url,
          partIndex,
          markup,
        }

        if (!part || (!part.blob && !part.url)) {
          console.warn(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS 데이터 없음`)
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
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 저장소 URL 사용`)
        } else if (part.blob) {
          audioUrl = URL.createObjectURL(part.blob)
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} blob URL 생성`)
        }

        const targetDuration = (part.durationSec * 1000) / playbackSpeed
        console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} TTS duration: ${part.durationSec}초, 재생 시간: ${targetDuration}ms`)

        if (audioUrl) {
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
              console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 오디오 재생 완료`)
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
              console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생 중지됨 (play() 호출 전)`)
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              stopTtsAudio()
              resolve()
              return
            }

            audio.play().catch((error) => {
              // AbortError는 재생 중지로 인한 정상적인 경우이므로 무시
              if (error.name === 'AbortError' || error.message?.includes('interrupted')) {
                console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생 중단됨 (정상)`)
              } else {
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
          console.warn(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생할 오디오 없음, duration만큼 대기`)
          await new Promise(resolve => setTimeout(resolve, targetDuration))
        }

        // 다음 구간 재생 또는 완료
        if (abortSignal?.aborted || (isPlayingRef && !isPlayingRef.current)) {
          return
        }

        if (partIndex < scriptParts.length - 1) {
          // 같은 씬의 다음 구간 재생
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 구간 ${partIndex + 1} 완료, 다음 구간 ${partIndex + 2}로 이동`)
          await playPart(partIndex + 1)
        } else {
          // 모든 구간 재생 완료
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 모든 구간 재생 완료`)
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
  if (renderSceneContent) {
    // 먼저 이미지와 자막을 alpha: 0으로 준비
    await new Promise<void>((resolve) => {
      renderSceneContent(sceneIndex, 0, {
        skipAnimation: false, // 준비 단계에서는 애니메이션 스킵
        forceTransition: transition,
        previousIndex: previousSceneIndex !== null ? previousSceneIndex : undefined, // null을 undefined로 변환하여 씬 전환으로 인식
        updateTimeline: false, // 재생 중에는 timeline 업데이트 안함 (다른 함수 영향 방지)
        prepareOnly: true, // alpha: 0으로 준비만
        isPlaying: true, // 재생 중임을 명시
        onComplete: () => {
          console.log(`[playSceneLogic] 씬 ${sceneIndex} 이미지/자막 준비 완료`)
          resolve()
        },
      })
    })
    
    // 전환 효과 적용 (prepareOnly: false)
    // previousIndex를 명시적으로 전달하여 씬 전환으로 인식하도록 함
    // 전환 효과와 동시에 TTS 재생 시작 (await하지 않음)
    // skipImage: true로 설정하여 이미지 렌더링 스킵 (전환 효과와 자막만 렌더링)
    renderSceneContent(sceneIndex, 0, {
      skipAnimation,
      forceTransition: transition,
      previousIndex: previousSceneIndex !== null ? previousSceneIndex : undefined, // null을 undefined로 변환하여 씬 전환으로 인식
      updateTimeline: false, // 재생 중에는 timeline 업데이트 안함 (다른 함수 영향 방지)
      prepareOnly: false, // 전환 효과 적용 후 표시
      isPlaying: true, // 재생 중임을 명시
      skipImage: true, // 이미지 렌더링 스킵 (전환 효과와 자막만 렌더링)
      onComplete: () => {
        console.log(`[playSceneLogic] 씬 ${sceneIndex} 전환 효과/자막 렌더링 완료`)
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
    console.log(`[playSceneLogic] 씬 ${sceneIndex} 전환 효과와 동시에 TTS 재생 시작 | skipAnimation: ${skipAnimation}, transition: ${transition}`)
    await playTts()
  } else {
    // fallback: 기존 방식 (renderSceneContent가 없는 경우)
    // 1. 이미지 전환 효과 시작
    renderSceneImage(sceneIndex, {
      skipAnimation,
      forceTransition: transition,
      previousIndex: previousSceneIndex,
      onComplete: () => {
        console.log(`[playSceneLogic] 씬 ${sceneIndex} 이미지 전환 효과 완료`)
      },
      prepareOnly: false,
    })

    // 2. 첫 번째 구간 자막 렌더링 시작
    renderSubtitlePart(sceneIndex, 0, {
      skipAnimation,
      onComplete: () => {
        console.log(`[playSceneLogic] 씬 ${sceneIndex} 첫 번째 구간 자막 렌더링 완료`)
      },
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
      console.warn('[useScenePlayback] timeline 또는 voiceTemplate이 없습니다.')
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

