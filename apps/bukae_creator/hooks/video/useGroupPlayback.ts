'use client'

import { useCallback} from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'

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
  const { getGroupTtsDuration } = useSceneStructureStore()
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

    // 3. TTS Duration 합산 및 전환 효과 길이 설정 (store에서 가져오기)
    const totalGroupTtsDuration = getGroupTtsDuration(sceneId)
    
    if (totalGroupTtsDuration === 0) {
      console.warn(`[useGroupPlayback] 그룹 sceneId ${sceneId}의 TTS duration이 0입니다. store를 확인해주세요.`)
    }

    // 첫 번째 씬의 transitionDuration을 그룹 전체 TTS duration 합으로 설정
    const firstSceneIndex = groupIndices[0]
    const firstScene = timeline.scenes[firstSceneIndex]
    const originalTransitionDuration = firstScene?.transitionDuration
    
    // 업데이트된 timeline 생성
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
      
      // React 상태 업데이트가 완료될 때까지 대기
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
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

    // 4. 첫 번째 씬: 이미지 전환 효과와 TTS 동시 시작
    // 5. 나머지 씬: TTS만 순차적으로 재생
    try {
      // 재생 시작 전 오디오 정리
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
      
      // 첫 번째 씬: 이미지 전환 효과와 TTS 동시 시작
      const firstSceneIndex = groupIndices[0]
      const firstScene = updatedTimeline.scenes[firstSceneIndex]
      
      // previousSceneIndex 결정: 같은 그룹 내 씬이면 null, 아니면 lastRenderedSceneIndexRef 사용
      let previousSceneIndex: number | null = null
      const lastRenderedIndex = lastRenderedSceneIndexRef.current
      if (lastRenderedIndex !== null && lastRenderedIndex !== firstSceneIndex) {
        const lastRenderedScene = updatedTimeline.scenes[lastRenderedIndex]
        // 같은 그룹 내 씬이 아니면 이전 씬으로 사용
        if (lastRenderedScene && lastRenderedScene.sceneId !== firstScene.sceneId) {
          previousSceneIndex = lastRenderedIndex
        }
      }
      
      // 씬리스트 패널 업데이트
      currentSceneIndexRef.current = firstSceneIndex
      setCurrentSceneIndex(firstSceneIndex)
      
      // 이미지 전환 효과 시작 (비동기로 시작하고 TTS 재생도 동시에 시작)
      let transitionPromise: Promise<void> | null = null
      if (renderSceneContent) {
        transitionPromise = new Promise<void>((resolve) => {
          renderSceneContent(firstSceneIndex, 0, {
            skipAnimation: false,
            forceTransition: firstScene?.transition || 'fade',
            previousIndex: previousSceneIndex !== null ? previousSceneIndex : undefined,
            updateTimeline: false,
            prepareOnly: false,
            isPlaying: true,
            skipImage: false, // 이미지 렌더링 포함
            onComplete: () => {
              lastRenderedSceneIndexRef.current = firstSceneIndex
              resolve()
            },
          })
        })
      } else if (renderSceneImage) {
        transitionPromise = new Promise<void>((resolve) => {
          renderSceneImage(firstSceneIndex, {
            skipAnimation: false,
            forceTransition: firstScene?.transition || 'fade',
            previousIndex: previousSceneIndex,
            onComplete: () => {
              lastRenderedSceneIndexRef.current = firstSceneIndex
              resolve()
            },
            prepareOnly: false,
          })
        })
        
        // 첫 번째 구간 자막 렌더링
        if (renderSubtitlePart) {
          renderSubtitlePart(firstSceneIndex, 0, {
            skipAnimation: true,
            onComplete: () => {},
          })
        }
      }
      
      // 이미지 전환 효과 시작 (비동기로 시작만 하고 await하지 않음)
      if (transitionPromise) {
        // 전환 효과는 시작만 하고 기다리지 않음
        void transitionPromise
      }
      
      // 그룹 내 모든 씬의 자막을 합쳐서 하나의 연속된 자막으로 파싱
      const mergedTextParts: Array<{ text: string; sceneIndex: number; partIndex: number }> = []
      
      // 각 씬의 자막을 파싱하고 씬 인덱스와 구간 인덱스를 추적
      for (const idx of groupIndices) {
        const scene = updatedTimeline.scenes[idx]
        if (!scene) continue
        
        const fullSubtitle = scene.text?.content || ''
        const scriptParts = splitSubtitleByDelimiter(fullSubtitle)
        
        for (let partIdx = 0; partIdx < scriptParts.length; partIdx++) {
          const partText = scriptParts[partIdx]?.trim()
          if (partText) {
            mergedTextParts.push({
              text: partText,
              sceneIndex: idx,
              partIndex: partIdx,
            })
          }
        }
      }
      
      if (mergedTextParts.length === 0) {
        return
      }

      // 각 구간을 순차적으로 처리
      const playPart = async (globalPartIndex: number): Promise<void> => {
        if (abortController.signal.aborted || !isPlayingRef.current) return

        if (globalPartIndex >= mergedTextParts.length) {
          return
        }

        const partInfo = mergedTextParts[globalPartIndex]
        const currentPartText = partInfo.text
        const targetSceneIndex = partInfo.sceneIndex
        const scenePartIndex = partInfo.partIndex

        if (!currentPartText) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // 씬이 변경되면 씬리스트 패널 업데이트
        if (currentSceneIndexRef.current !== targetSceneIndex) {
          currentSceneIndexRef.current = targetSceneIndex
          setCurrentSceneIndex(targetSceneIndex)
        }

        // TTS 파일이 재생될 때 해당 인덱스 자막 렌더링
        if (renderSubtitlePart) {
          renderSubtitlePart(targetSceneIndex, scenePartIndex, {
            skipAnimation: true,
            onComplete: () => {},
          })
        }

        // 해당 씬의 마크업 가져오기
        const markups = buildSceneMarkup(updatedTimeline, targetSceneIndex)
        if (scenePartIndex >= markups.length) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        const markup = markups[scenePartIndex]
        if (!markup) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
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

        // TTS 재생
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

          if (!audioUrl) {
            console.warn(`[useGroupPlayback] 씬 ${targetSceneIndex} 구간 ${scenePartIndex + 1} TTS URL 생성 실패`)
            // 다음 구간으로
            if (globalPartIndex < mergedTextParts.length - 1) {
              await playPart(globalPartIndex + 1)
            }
            return
          }

          ttsAudioUrlRef.current = audioUrl
          const audio = new Audio(audioUrl)
          audio.playbackRate = updatedTimeline?.playbackSpeed ?? 1.0
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
                // 재생 시작 성공
              })
              .catch((error) => {
                // AbortError는 재생 중지로 인한 정상적인 경우이므로 무시
                if (error.name !== 'AbortError' && !error.message?.includes('interrupted')) {
                  console.error(`[useGroupPlayback] 씬 ${targetSceneIndex} 구간 ${scenePartIndex + 1} TTS 재생 시작 실패:`, error)
                }
                audio.removeEventListener('ended', handleEnded)
                audio.removeEventListener('error', handleError)
                handleError()
              })
          })
        } else {
          // TTS 캐시가 없으면 fallback duration 사용
          const scene = updatedTimeline.scenes[targetSceneIndex]
          const fallbackDuration = scene?.duration ? scene.duration / (splitSubtitleByDelimiter(scene.text?.content || '').length || 1) : 2.5
          const waitTime = (fallbackDuration * 1000) / (updatedTimeline?.playbackSpeed ?? 1.0)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }

        // 다음 구간 재생 (현재 구간 재생 완료 후)
        if (globalPartIndex < mergedTextParts.length - 1) {
          await playPart(globalPartIndex + 1)
        } else {
          // 모든 구간 재생 완료 후 lastRenderedSceneIndexRef 업데이트
          lastRenderedSceneIndexRef.current = targetSceneIndex
        }
      }

      // 첫 번째 구간부터 재생 시작
      await playPart(0)
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
            getGroupTtsDuration,
          ])

  return {
    playGroup,
  }
}

