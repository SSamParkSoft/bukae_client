'use client'

import { useCallback, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { useSingleScenePlayback } from './useSingleScenePlayback'
import { useGroupPlayback } from './useGroupPlayback'
import { formatTime } from '@/utils/timeline'

interface UseFullPlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  bgmTemplate: string | null
  playbackSpeed: number
  buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: (voiceName: string, markup: string) => string
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
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  setCurrentTime?: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setTimelineIsPlaying: (playing: boolean) => void
  setIsPreparing?: (preparing: boolean) => void
  setIsTtsBootstrapping?: (bootstrapping: boolean) => void
  startBgmAudio: (templateId: string | null, speed: number, shouldPlay: boolean) => Promise<void>
  stopBgmAudio: () => void
  changedScenesRef: React.MutableRefObject<Set<number>>
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
      transitionDuration?: number
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
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  ttsAudioRef: React.MutableRefObject<HTMLAudioElement | null>
  ttsAudioUrlRef: React.MutableRefObject<string | null>
  stopTtsAudio: () => void
  getMp3DurationSec: (blob: Blob) => Promise<number>
  setTimeline: (timeline: TimelineData) => void
  disableAutoTimeUpdateRef?: React.MutableRefObject<boolean>
  currentTimeRef?: React.MutableRefObject<number> // useTimelinePlayer의 currentTimeRef
  totalDuration?: number // 전체 재생 시간 (재생바 업데이트용)
  timelineBarRef?: React.RefObject<HTMLDivElement | null> // 재생바 DOM 요소 (직접 업데이트용)
}

export function useFullPlayback({
  timeline,
  voiceTemplate,
  bgmTemplate,
  playbackSpeed,
  buildSceneMarkup,
  makeTtsKey,
  ensureSceneTts,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  setCurrentTime,
  setIsPlaying,
  setTimelineIsPlaying,
  setIsPreparing,
  setIsTtsBootstrapping,
  startBgmAudio,
  stopBgmAudio,
  changedScenesRef,
  renderSceneContent,
  renderSceneImage,
  renderSubtitlePart,
  prepareImageAndSubtitle,
  textsRef,
  spritesRef,
  ttsCacheRef,
  ttsAudioRef,
  ttsAudioUrlRef,
  stopTtsAudio,
  getMp3DurationSec,
  setTimeline,
  disableAutoTimeUpdateRef,
  currentTimeRef,
  totalDuration,
  timelineBarRef,
}: UseFullPlaybackParams) {
  // 재생 상태 관리
  const isPlayingAllRef = useRef(false)
  const playbackAbortControllerRef = useRef<AbortController | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isPlayingAll, setIsPlayingAll] = useState(false)

  // 재생바 업데이트를 위한 상태
  const accumulatedTimeRef = useRef(0)
  const currentGroupStartTimeRef = useRef(0)
  const currentGroupDurationRef = useRef(0)
  const bgmStartedRef = useRef(false)
  const lastUpdateTimeRef = useRef(0) // 마지막 업데이트 시간 (중복 호출 방지)

  // useSingleScenePlayback 인스턴스 생성
  const singleScenePlayback = useSingleScenePlayback({
    timeline,
    voiceTemplate,
    makeTtsKey,
    ttsCacheRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    setIsPreparing,
    setIsTtsBootstrapping,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    renderSceneContent,
    renderSceneImage,
    textsRef,
    getMp3DurationSec,
  })

  // useGroupPlayback 인스턴스 생성
  const groupPlayback = useGroupPlayback({
    timeline,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    ttsCacheRef,
    ensureSceneTts,
    renderSceneContent,
    setTimeline,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    textsRef,
    spritesRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    changedScenesRef,
    isPlayingRef: isPlayingAllRef,
    setIsPreparing,
    setIsTtsBootstrapping,
  })

  // 재생바 업데이트 interval 정리
  const cleanupProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  // 재생 중지 함수
  const stopAllScenes = useCallback(() => {
    // AbortController로 재생 중단
    if (playbackAbortControllerRef.current) {
      playbackAbortControllerRef.current.abort()
      playbackAbortControllerRef.current = null
    }

    // 재생 상태 초기화
    isPlayingAllRef.current = false
    setIsPlayingAll(false)
    setIsPlaying(false)
    setTimelineIsPlaying(false)

    // useTimelinePlayer의 자동 시간 업데이트 다시 활성화
    if (disableAutoTimeUpdateRef) {
      disableAutoTimeUpdateRef.current = false
    }

    // 재생바 업데이트 interval 정리
    cleanupProgressInterval()

    // 오디오 정지
    stopBgmAudio()
    stopTtsAudio()

    // 상태 초기화
    accumulatedTimeRef.current = 0
    currentGroupStartTimeRef.current = 0
    currentGroupDurationRef.current = 0
    bgmStartedRef.current = false
  }, [setIsPlaying, setTimelineIsPlaying, stopBgmAudio, stopTtsAudio, cleanupProgressInterval, disableAutoTimeUpdateRef])

  // 전체 재생 함수
  const playAllScenes = useCallback(async () => {
    if (!timeline || !voiceTemplate) {
      return
    }

    // 모든 씬의 TTS가 준비되었는지 확인
    const scenesToSynthesize: number[] = []
    for (let i = 0; i < timeline.scenes.length; i++) {
      const markups = buildSceneMarkup(timeline, i)
      const cachedCount = markups.filter(markup => {
        const key = makeTtsKey(voiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      }).length
      
      if (cachedCount < markups.length) {
        scenesToSynthesize.push(i)
      }
    }

    // TTS가 준비되지 않은 씬이 있으면 합성
    if (scenesToSynthesize.length > 0 && ensureSceneTts) {
      setIsPreparing?.(true)
      setIsTtsBootstrapping?.(true)
      
      try {
        const ttsResults = await Promise.all(
          scenesToSynthesize.map(sceneIndex =>
            ensureSceneTts(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex) || false)
          )
        )
        
        // ensureSceneTts 결과를 명시적으로 캐시에 저장
        for (const ttsResult of ttsResults) {
          const { sceneIndex, parts } = ttsResult
          if (!parts || parts.length === 0) {
            console.warn(`[useFullPlayback] 씬 ${sceneIndex} parts가 비어있음`)
            continue
          }
          
          const markups = buildSceneMarkup(timeline, sceneIndex)
          for (let partIndex = 0; partIndex < markups.length; partIndex++) {
            const part = parts[partIndex]
            if (!part) {
              console.warn(`[useFullPlayback] 씬 ${sceneIndex} 구간 ${partIndex + 1} part가 null`)
              continue
            }
            
            if (!part.blob && !part.url) {
              console.warn(`[useFullPlayback] 씬 ${sceneIndex} 구간 ${partIndex + 1} blob과 url이 모두 없음`)
              continue
            }
            
            if (!part.durationSec || part.durationSec <= 0) {
              console.warn(`[useFullPlayback] 씬 ${sceneIndex} 구간 ${partIndex + 1} durationSec가 없거나 0 이하`)
              continue
            }
            
            // 캐시에 명시적으로 저장
            const markup = markups[partIndex]
            const key = makeTtsKey(voiceTemplate, markup)
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
      } catch (error) {
        console.error('[useFullPlayback] TTS 합성 실패:', error)
        setIsPreparing?.(false)
        setIsTtsBootstrapping?.(false)
        return
      }
      
      setIsPreparing?.(false)
      setIsTtsBootstrapping?.(false)
    }

    // BGM 로드 (재생은 하지 않음)
    if (bgmTemplate) {
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      await startBgmAudio(bgmTemplate, speed, false)
    }

    // 재생 시작
    playbackAbortControllerRef.current = new AbortController()
    isPlayingAllRef.current = true
    setIsPlayingAll(true)
    setIsPlaying(true)
    setTimelineIsPlaying(true)

    // useTimelinePlayer의 자동 시간 업데이트 비활성화 (전체 재생 중에는 수동으로 관리)
    if (disableAutoTimeUpdateRef) {
      disableAutoTimeUpdateRef.current = true
    }

    // 첫 번째 씬으로 이동
    currentSceneIndexRef.current = 0
    setCurrentSceneIndex(0)

    // 상태 초기화
    accumulatedTimeRef.current = 0
    currentGroupStartTimeRef.current = 0
    currentGroupDurationRef.current = 0
    bgmStartedRef.current = false
    lastUpdateTimeRef.current = 0

    // 재생바 업데이트 interval 시작 (100ms마다 업데이트, DOM 직접 업데이트로 리렌더링 방지)
    // 실제 씬 렌더링은 TTS 재생 완료 시에만 발생
    cleanupProgressInterval()
    progressIntervalRef.current = setInterval(() => {
      if (!isPlayingAllRef.current || playbackAbortControllerRef.current?.signal.aborted) {
        cleanupProgressInterval()
        return
      }

      // currentGroupStartTimeRef가 0이면 아직 첫 번째 그룹이 시작되지 않았으므로 업데이트하지 않음
      if (currentGroupStartTimeRef.current === 0) {
        return
      }

      const elapsed = (Date.now() - currentGroupStartTimeRef.current) / 1000
      const currentTime = accumulatedTimeRef.current + Math.min(
        elapsed,
        currentGroupDurationRef.current
      )
      
      // ref를 먼저 업데이트하여 useTimelinePlayer의 내부 로직과 동기화
      if (currentTimeRef) {
        currentTimeRef.current = currentTime
      }
      
      // 재생바 DOM을 직접 업데이트 (리렌더링 없이)
      if (timelineBarRef?.current && totalDuration && totalDuration > 0) {
        const progressBar = timelineBarRef.current.querySelector('div[style*="width"]') as HTMLElement
        if (progressBar) {
          const progressRatio = Math.min(1, currentTime / totalDuration)
          progressBar.style.width = `${progressRatio * 100}%`
        }
        
        // 시간 표시도 직접 업데이트 (리렌더링 없이)
        const timeContainer = timelineBarRef.current.parentElement?.querySelector('div.flex.items-center.justify-between') as HTMLElement
        if (timeContainer) {
          const timeSpans = timeContainer.querySelectorAll('span')
          if (timeSpans.length >= 1) {
            const speed = playbackSpeed ?? 1.0
            const actualTime = currentTime / speed
            const formattedTime = formatTime(actualTime)
            timeSpans[0].textContent = formattedTime
          }
        }
      }
      
      lastUpdateTimeRef.current = currentTime
    }, 100)

    try {
      // 모든 씬을 그룹별로 분류
      const sceneGroups = new Map<number | undefined, number[]>()
      
      timeline.scenes.forEach((scene, index) => {
        const sceneId = scene.sceneId
        if (!sceneGroups.has(sceneId)) {
          sceneGroups.set(sceneId, [])
        }
        sceneGroups.get(sceneId)!.push(index)
      })

      // 그룹 엔트리를 배열로 변환 (순서 유지)
      const groupEntries = Array.from(sceneGroups.entries())

      // 그룹별로 순차 재생
      const playGroupsSequentially = async (
        groupEntries: Array<[number | undefined, number[]]>, 
        groupIndex: number
      ) => {
        if (playbackAbortControllerRef.current?.signal.aborted || !isPlayingAllRef.current) {
          return
        }

        if (groupIndex >= groupEntries.length) {
          // 모든 그룹 재생 완료
          cleanupProgressInterval()
          isPlayingAllRef.current = false
          setIsPlayingAll(false)
          setIsPlaying(false)
          setTimelineIsPlaying(false)
          
          // useTimelinePlayer의 자동 시간 업데이트 다시 활성화
          if (disableAutoTimeUpdateRef) {
            disableAutoTimeUpdateRef.current = false
          }
          
          stopBgmAudio()
          stopTtsAudio()
          
          // 최종 시간 설정
          if (setCurrentTime) {
            const totalDuration = timeline.scenes.reduce((sum, scene, index) => {
              const isLastScene = index === timeline.scenes.length - 1
              const nextScene = !isLastScene ? timeline.scenes[index + 1] : null
              const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
              const transitionDuration = isLastScene 
                ? 0 
                : (isSameSceneId ? 0 : (scene.transitionDuration || 0.5))
              return sum + scene.duration + transitionDuration
            }, 0)
            setCurrentTime(totalDuration)
          }
          return
        }

        const [sceneId, groupIndices] = groupEntries[groupIndex]
        
        // 현재 그룹/씬의 총 duration 계산
        let groupDuration = 0
        if (sceneId !== undefined && groupIndices.length > 1) {
          // 그룹 재생: 모든 씬의 duration 합산
          for (const sceneIndex of groupIndices) {
            const scene = timeline.scenes[sceneIndex]
            if (scene) {
              groupDuration += scene.duration || 0
            }
          }
          // 첫 번째 씬의 transitionDuration만 추가 (그룹 내 전환은 0)
          const firstScene = timeline.scenes[groupIndices[0]]
          if (firstScene) {
            groupDuration += firstScene.transitionDuration || 0.5
          }
        } else {
          // 단일 씬 재생
          for (const sceneIndex of groupIndices) {
            const scene = timeline.scenes[sceneIndex]
            if (scene) {
              const isLastScene = sceneIndex === timeline.scenes.length - 1
              const nextScene = !isLastScene ? timeline.scenes[sceneIndex + 1] : null
              const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
              const transitionDuration = isLastScene 
                ? 0 
                : (isSameSceneId ? 0 : (scene.transitionDuration || 0.5))
              groupDuration += (scene.duration || 0) + transitionDuration
            }
          }
        }

        // 현재 그룹 시작 시간 기록
        currentGroupStartTimeRef.current = Date.now()
        currentGroupDurationRef.current = groupDuration

        // BGM 재생 시작 (첫 번째 그룹만, 재생 시작 직전)
        if (!bgmStartedRef.current && bgmTemplate) {
          bgmStartedRef.current = true
          const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
          // BGM 재생 시작 (비동기로 시작만 하고 await하지 않음)
          startBgmAudio(bgmTemplate, speed, true).catch((error) => {
            console.error('[useFullPlayback] BGM 재생 시작 실패:', error)
          })
        }

        if (sceneId !== undefined && groupIndices.length > 1) {
          // 그룹 재생
          await groupPlayback.playGroup(sceneId, groupIndices)
        } else {
          // 단일 씬 재생
          for (const sceneIndex of groupIndices) {
            if (playbackAbortControllerRef.current?.signal.aborted || !isPlayingAllRef.current) {
              break
            }
            
            // 단일 씬의 duration 계산
            const scene = timeline.scenes[sceneIndex]
            if (scene) {
              const isLastScene = sceneIndex === timeline.scenes.length - 1
              const nextScene = !isLastScene ? timeline.scenes[sceneIndex + 1] : null
              const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
              const transitionDuration = isLastScene 
                ? 0 
                : (isSameSceneId ? 0 : (scene.transitionDuration || 0.5))
              
              const sceneDuration = (scene.duration || 0) + transitionDuration
              
              await singleScenePlayback.playScene(sceneIndex)
              
              // 재생 완료 후 누적 시간 업데이트 및 재생바 업데이트
              accumulatedTimeRef.current += sceneDuration
              if (setCurrentTime) {
                setCurrentTime(accumulatedTimeRef.current)
              }
            }
          }
        }

        // 그룹 재생 완료 후 누적 시간 업데이트 및 재생바 업데이트
        if (sceneId !== undefined && groupIndices.length > 1) {
          accumulatedTimeRef.current += groupDuration
          if (setCurrentTime) {
            setCurrentTime(accumulatedTimeRef.current)
          }
        }

        // 다음 그룹 재생
        if (!playbackAbortControllerRef.current?.signal.aborted && isPlayingAllRef.current) {
          await playGroupsSequentially(groupEntries, groupIndex + 1)
        }
      }

      // 첫 번째 그룹부터 재생 시작
      await playGroupsSequentially(groupEntries, 0)

    } catch (error) {
      console.error('[useFullPlayback] 전체 재생 오류:', error)
      cleanupProgressInterval()
      isPlayingAllRef.current = false
      setIsPlayingAll(false)
      setIsPlaying(false)
      setTimelineIsPlaying(false)
      
      // useTimelinePlayer의 자동 시간 업데이트 다시 활성화
      if (disableAutoTimeUpdateRef) {
        disableAutoTimeUpdateRef.current = false
      }
      
      stopBgmAudio()
      stopTtsAudio()
    } finally {
      playbackAbortControllerRef.current = null
    }
  }, [
    timeline,
    voiceTemplate,
    bgmTemplate,
    playbackSpeed,
    currentTimeRef,
    timelineBarRef,
    totalDuration,
    buildSceneMarkup,
    makeTtsKey,
    ensureSceneTts,
    changedScenesRef,
    setIsPreparing,
    setIsTtsBootstrapping,
    startBgmAudio,
    stopBgmAudio,
    setIsPlaying,
    setTimelineIsPlaying,
    setCurrentTime,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    groupPlayback,
    singleScenePlayback,
    stopTtsAudio,
    ttsCacheRef,
    cleanupProgressInterval,
    disableAutoTimeUpdateRef,
  ])

  // 항상 객체를 반환하도록 보장
  return {
    playAllScenes: playAllScenes || (async () => {}),
    stopAllScenes: stopAllScenes || (() => {}),
    isPlayingAll: isPlayingAll || false,
  }
}

