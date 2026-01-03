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
      transitionDuration?: number
    }
  ) => void
  setTimeline: (timeline: TimelineData) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  ttsAudioRef: React.MutableRefObject<HTMLAudioElement | null>
  ttsAudioUrlRef: React.MutableRefObject<string | null>
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
  setTimeline,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  textsRef,
  spritesRef,
  ttsAudioRef,
  ttsAudioUrlRef,
  changedScenesRef,
  isPlayingRef,
  setIsPreparing,
  setIsTtsBootstrapping,
}: UseGroupPlaybackParams) {
  const { getSceneStructure } = useSceneStructureStore()

  // TTS 캐시 확인 및 필요한 씬 찾기
  const findScenesToSynthesize = useCallback((groupIndices: number[]): number[] => {
    const scenesToSynthesize: number[] = []
    for (const sceneIndex of groupIndices) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      const hasAllCache = markups.every(markup => {
        const key = makeTtsKey(voiceTemplate!, markup)
        const cached = ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      })
      if (!hasAllCache) {
        scenesToSynthesize.push(sceneIndex)
      }
    }
    return scenesToSynthesize
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef])

  // TTS 합성 및 캐시 저장
  const synthesizeAndCacheTts = useCallback(async (scenesToSynthesize: number[]): Promise<boolean> => {
    if (!ensureSceneTtsParam || scenesToSynthesize.length === 0) {
      return true
    }

    setIsPreparing?.(true)
    setIsTtsBootstrapping?.(true)

    try {
      for (const sceneIndex of scenesToSynthesize) {
        const result = await ensureSceneTtsParam(
          sceneIndex,
          undefined,
          changedScenesRef.current.has(sceneIndex)
        )
        
        const markups = buildSceneMarkup(timeline!, sceneIndex)
        for (let i = 0; i < result.parts.length; i++) {
          const part = result.parts[i]
          const partMarkup = markups[i]
          if (part && partMarkup) {
            const partKey = makeTtsKey(voiceTemplate!, partMarkup)
            ttsCacheRef.current.set(partKey, {
              blob: part.blob,
              durationSec: part.durationSec,
              markup: part.markup || partMarkup,
              url: part.url || null,
            })
          }
        }
      }
      return true
    } catch (error) {
      console.error('[useGroupPlayback] TTS 생성 실패:', error)
      return false
    } finally {
      setIsPreparing?.(false)
      setIsTtsBootstrapping?.(false)
    }
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef, ensureSceneTtsParam, changedScenesRef, setIsPreparing, setIsTtsBootstrapping])

  // 그룹 TTS duration 계산
  const calculateGroupTtsDuration = useCallback((sceneId: number, groupIndices: number[]): number => {
    // 항상 최신 TTS 캐시에서 직접 계산하여 정확한 duration 보장
    let duration = 0
    if (voiceTemplate && timeline) {
      for (const sceneIndex of groupIndices) {
        const markups = buildSceneMarkup(timeline, sceneIndex)
        for (const markup of markups) {
          const key = makeTtsKey(voiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          if (cached?.durationSec) {
            duration += cached.durationSec
          }
        }
      }
    }
    return duration
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef])

  // 자막 파싱 및 병합
  const parseMergedTextParts = useCallback((groupIndices: number[], updatedTimeline: TimelineData): Array<{ text: string; sceneIndex: number; partIndex: number }> => {
    const mergedTextParts: Array<{ text: string; sceneIndex: number; partIndex: number }> = []
    const firstSceneIndex = groupIndices[0]
    const firstSceneStructure = getSceneStructure(firstSceneIndex)
    const fullSubtitleFromStore = firstSceneStructure?.fullSubtitle

    if (fullSubtitleFromStore) {
      // store의 fullSubtitle 사용 (자막 씬 분할 시 원본 전체 자막 포함)
      const scriptParts = splitSubtitleByDelimiter(fullSubtitleFromStore)
      for (let partIdx = 0; partIdx < scriptParts.length; partIdx++) {
        const partText = scriptParts[partIdx]?.trim()
        if (partText) {
          const sceneIndex = groupIndices[Math.min(partIdx, groupIndices.length - 1)]
          mergedTextParts.push({
            text: partText,
            sceneIndex,
            partIndex: 0,
          })
        }
      }
    } else {
      // 기존 방식: 각 씬의 자막을 개별적으로 파싱
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
    }

    return mergedTextParts
  }, [getSceneStructure])

  // 텍스트 객체 찾기
  const findTextObject = useCallback((sceneIndex: number, updatedTimeline: TimelineData): PIXI.Text | null => {
    const scene = updatedTimeline.scenes[sceneIndex]
    if (scene?.sceneId !== undefined) {
      const firstSceneIndexInGroup = updatedTimeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
      if (firstSceneIndexInGroup >= 0) {
        return textsRef.current.get(firstSceneIndexInGroup) || null
      }
    }
    return textsRef.current.get(sceneIndex) || null
  }, [textsRef])

  // 오디오 정리
  const cleanupAudio = useCallback(() => {
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
  }, [ttsAudioRef, ttsAudioUrlRef])

  /**
   * 그룹 재생 함수
   */
  const playGroup = useCallback(async (sceneId: number, groupIndices: number[]) => {
    if (!timeline || !voiceTemplate || !ensureSceneTtsParam) {
      return
    }

    // 1. 그룹화된 씬 확인
    const groupScenes = groupIndices.map(index => timeline.scenes[index]).filter(Boolean)
    if (groupScenes.length === 0) {
      console.warn('[useGroupPlayback] 그룹에 유효한 씬이 없습니다.')
      return
    }

    // 2. TTS 캐시 확인 및 합성
    const scenesToSynthesize = findScenesToSynthesize(groupIndices)
    const synthesisSuccess = await synthesizeAndCacheTts(scenesToSynthesize)
    if (!synthesisSuccess) {
      return
    }

    // 3. TTS Duration 계산 및 전환 효과 길이 설정
    const totalGroupTtsDuration = calculateGroupTtsDuration(sceneId, groupIndices)

    // 첫 번째 씬의 transitionDuration 업데이트
    const firstSceneIndex = groupIndices[0]
    const firstScene = timeline.scenes[firstSceneIndex]
    const originalTransitionDuration = firstScene?.transitionDuration
    
    let updatedTimeline = timeline
    if (firstScene && totalGroupTtsDuration > 0) {
      updatedTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === firstSceneIndex
            ? { ...scene, transitionDuration: totalGroupTtsDuration }
            : scene
        ),
      }
      setTimeline(updatedTimeline)
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }

    // 재생 준비
    const abortController = new AbortController()
    isPlayingRef.current = true

    try {
      // 오디오 정리
      cleanupAudio()
      
      // 첫 번째 씬: 전환 효과만 표시
      const firstSceneIndexForRender = groupIndices[0]
      const firstSceneForRender = updatedTimeline.scenes[firstSceneIndexForRender]
      currentSceneIndexRef.current = firstSceneIndexForRender
      
      // 그룹 재생 시작 전에 모든 씬의 이미지만 숨김 (자막은 유지)
      spritesRef.current.forEach((sprite) => {
        if (sprite) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      // 자막(텍스트)은 그대로 유지
      
      // 자막 파싱
      const mergedTextParts = parseMergedTextParts(groupIndices, updatedTimeline)
      if (mergedTextParts.length === 0) {
        return
      }

      // 텍스트 객체 찾기
      const textToUpdate = findTextObject(firstSceneIndex, updatedTimeline)
      
      if (renderSceneContent) {
        renderSceneContent(firstSceneIndexForRender, null, {
          skipAnimation: false,
          forceTransition: firstSceneForRender?.transition || 'none',
          updateTimeline: false,
          prepareOnly: false,
          isPlaying: true,
          skipImage: true,
          transitionDuration: totalGroupTtsDuration,
          onComplete: () => {
            lastRenderedSceneIndexRef.current = firstSceneIndexForRender
          },
        })
      } else {
        lastRenderedSceneIndexRef.current = firstSceneIndexForRender
      }

      
      // 각 구간을 순차적으로 처리하는 함수
      const playPart = async (globalPartIndex: number): Promise<void> => {
        if (abortController.signal.aborted || !isPlayingRef.current) {
          return
        }

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

        // 씬이 변경되면 씬리스트 패널만 업데이트 (렌더링은 하지 않음)
        // setCurrentSceneIndex를 호출하면 다른 곳에서 렌더링이 트리거될 수 있으므로
        // currentSceneIndexRef만 업데이트하고 setCurrentSceneIndex는 호출하지 않음
        // 또한 이미지가 렌더링되지 않도록 모든 이미지를 숨김
        if (currentSceneIndexRef.current !== targetSceneIndex) {
          currentSceneIndexRef.current = targetSceneIndex
        }

        // 자막 텍스트 업데이트 (텍스트가 변경될 때만)
        if (textToUpdate && currentPartText) {
          // 텍스트가 변경되는 경우에만 업데이트
          if (textToUpdate.text !== currentPartText) {
            textToUpdate.text = currentPartText
            textToUpdate.visible = true
            textToUpdate.alpha = 1
          }
          // 이미 올바른 상태면 건드리지 않음 (깜빡임 방지)
        }

        // 마크업 가져오기
        // TTS 캐시는 각 씬의 실제 자막으로 생성되므로, 각 씬의 buildSceneMarkup을 사용해야 함
        const markups = buildSceneMarkup(updatedTimeline, targetSceneIndex)
        if (scenePartIndex >= markups.length) {
          // 마크업이 없으면 다음 구간으로
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        const markup = markups[scenePartIndex]
        if (!markup) {
          // 마크업이 null이면 다음 구간으로
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

        // TTS 캐시 찾기 실패 시 다음 구간으로
        if (!cached) {
          console.warn(`[useGroupPlayback] 구간 ${globalPartIndex + 1} TTS 캐시 없음, 다음 구간으로 이동`)
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // TTS 재생
        if (!cached || (!cached.url && !cached.blob)) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // 오디오 정리
        cleanupAudio()

        // 오디오 URL 생성
        const audioUrl = cached.url || (cached.blob ? URL.createObjectURL(cached.blob) : null)
        if (!audioUrl) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        ttsAudioUrlRef.current = audioUrl
        const audio = new Audio(audioUrl)
        audio.playbackRate = updatedTimeline?.playbackSpeed ?? 1.0
        ttsAudioRef.current = audio
        
        // 오디오 로드 대기
        if (audio.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (audio.readyState >= 2) {
              resolve()
              return
            }
            
            const handleCanPlay = () => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }
            const handleLoadError = () => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }
            
            audio.addEventListener('canplay', handleCanPlay, { once: true })
            audio.addEventListener('error', handleLoadError, { once: true })
            setTimeout(() => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }, 100)
          })
        }

        // 오디오 재생
        await new Promise<void>((resolve) => {
          if (abortController.signal.aborted) {
            resolve()
            return
          }

          const cleanup = () => {
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('pause', handlePause)
          }

          const handleEnded = () => {
            cleanup()
            resolve()
          }
          
          const handleError = (event?: Event) => {
            console.error('[useGroupPlayback] TTS 재생 오류:', event)
            cleanup()
            resolve()
          }
          
          const handlePause = () => {
            // pause 이벤트는 무시
          }
          
          audio.addEventListener('ended', handleEnded)
          audio.addEventListener('error', handleError)
          audio.addEventListener('pause', handlePause)
          
          if (abortController.signal.aborted || !isPlayingRef.current) {
            cleanup()
            resolve()
            return
          }
          
          // 재생 시작
          try {
            const playPromise = audio.play()
            if (playPromise !== undefined) {
              playPromise
                .catch((error) => {
                  if (error.name !== 'AbortError' && !error.message?.includes('interrupted')) {
                    console.error('[useGroupPlayback] TTS 재생 시작 실패:', error)
                  }
                  handleError()
                })
            }
          } catch (error) {
            console.error('[useGroupPlayback] audio.play() 호출 실패:', error)
            handleError()
          }
        })

        // 다음 구간 재생 (현재 구간 재생 완료 후)
        if (globalPartIndex < mergedTextParts.length - 1) {
          await playPart(globalPartIndex + 1)
        } else {
          // 모든 구간 재생 완료 후 lastRenderedSceneIndexRef 업데이트
          lastRenderedSceneIndexRef.current = targetSceneIndex
        }
      }
      
      // TTS 재생 시작
      if (mergedTextParts.length > 0) {
        await playPart(0)
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
      
      // 그룹 재생이 끝나기 전에 마지막 씬의 이미지와 자막 유지
      const lastSceneIndex = groupIndices[groupIndices.length - 1]
      
      // 마지막 씬을 다시 렌더링하여 이미지와 자막 유지
      if (renderSceneContent && lastSceneIndex !== undefined) {
        renderSceneContent(lastSceneIndex, null, {
          skipAnimation: true,
          forceTransition: 'none',
          updateTimeline: false,
          prepareOnly: false,
          isPlaying: false,
          skipImage: false,
        })
      } else {
        // renderSceneContent가 없으면 직접 텍스트만 유지
        const lastText = textsRef.current.get(lastSceneIndex)
        if (lastText) {
          lastText.visible = true
          lastText.alpha = 1
        }
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
    setTimeline,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    textsRef,
    spritesRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    changedScenesRef,
    isPlayingRef,
    getSceneStructure,
    findScenesToSynthesize,
    synthesizeAndCacheTts,
    calculateGroupTtsDuration,
    parseMergedTextParts,
    findTextObject,
    cleanupAudio,
  ])

  return {
    playGroup,
  }
}

