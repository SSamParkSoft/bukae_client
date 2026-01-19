'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { useSingleScenePlayback } from './useSingleScenePlayback'
import { useGroupPlayback } from './useGroupPlayback'
import { useTtsResources } from './useTtsResources'
import { formatTime, calculateTotalDuration } from '@/utils/timeline'

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
  setTimelineIsPlaying?: (playing: boolean) => void
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
  containerRef: React.RefObject<PIXI.Container | null>
  getMp3DurationSec: (blob: Blob) => Promise<number>
  setTimeline: (timeline: TimelineData) => void
  disableAutoTimeUpdateRef?: React.MutableRefObject<boolean>
  currentTimeRef?: React.MutableRefObject<number> // useTimelinePlayer의 currentTimeRef
  totalDuration?: number // 전체 재생 시간 (재생바 업데이트용)
  timelineBarRef?: React.RefObject<HTMLDivElement | null> // 재생바 DOM 요소 (직접 업데이트용)
  activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
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
  setTimelineIsPlaying,
  setIsPreparing,
  setIsTtsBootstrapping,
  startBgmAudio,
  stopBgmAudio,
  changedScenesRef,
  renderSceneContent,
  renderSceneImage,
  textsRef,
  spritesRef,
  containerRef,
  getMp3DurationSec,
  setTimeline,
  disableAutoTimeUpdateRef,
  activeAnimationsRef,
  currentTimeRef,
  totalDuration,
  timelineBarRef,
}: UseFullPlaybackParams) {
  // TTS 리소스 가져오기
  const { ttsCacheRef, ttsAudioRef, ttsAudioUrlRef, stopTtsAudio, resetTtsSession } = useTtsResources()
  
  // 타임라인 동기화를 위한 ref
  const groupPlaybackStartTimeRef = useRef<number | null>(null)
  const timelineRef = useRef<TimelineData | null>(timeline)

  // timeline ref 동기화
  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  // 재생 상태 관리
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreparing, setIsPreparingLocal] = useState(false)
  const isPlayingRef = useRef(false)
  const isPlayingAllRef = useRef(false)
  const playbackAbortControllerRef = useRef<AbortController | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  // useGroupPlayback에 전달할 별도의 isPlayingRef (전체 재생 중에는 변경되지 않음)
  const groupPlaybackIsPlayingRef = useRef(false)

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
    setIsPreparing,
    setIsTtsBootstrapping,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    renderSceneContent,
    renderSceneImage,
    textsRef,
    containerRef,
    getMp3DurationSec,
    setTimeline,
  })

  // useGroupPlayback 인스턴스 생성
  const groupPlayback = useGroupPlayback({
    timeline,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    ensureSceneTts,
    renderSceneContent,
    setTimeline,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    textsRef,
    spritesRef,
    containerRef,
    changedScenesRef,
    isPlayingRef: groupPlaybackIsPlayingRef,
    setIsPreparing,
    setIsTtsBootstrapping,
    activeAnimationsRef,
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
    // 진행 중인 전환 효과 애니메이션 중지
    if (activeAnimationsRef) {
      activeAnimationsRef.current.forEach((tl) => {
        if (tl && tl.isActive()) {
          tl.kill()
        }
      })
      activeAnimationsRef.current.clear()
    }
    
    // 현재 재생 중인 씬의 스프라이트와 텍스트를 alpha: 1로 복원
    const currentSceneIndex = currentSceneIndexRef.current
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
    
    // AbortController로 재생 중단
    if (playbackAbortControllerRef.current) {
      playbackAbortControllerRef.current.abort()
      playbackAbortControllerRef.current = null
    }

    // 재생 상태 초기화
    isPlayingAllRef.current = false
    setIsPlayingAll(false)
    setIsPlaying(false)
    groupPlaybackIsPlayingRef.current = false
    if (setTimelineIsPlaying) {
      setTimelineIsPlaying(false)
    }

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
  }, [setIsPlaying, setTimelineIsPlaying, stopBgmAudio, stopTtsAudio, cleanupProgressInterval, disableAutoTimeUpdateRef, activeAnimationsRef, spritesRef, textsRef, currentSceneIndexRef])

  // 전체 재생 함수
  const playAllScenes = useCallback(async () => {
    if (!timeline || !voiceTemplate) {
      return
    }
    // 모든 씬의 TTS가 준비되었는지 확인
    const scenesToSynthesize: number[] = []
    for (let i = 0; i < timeline.scenes.length; i++) {
      const scene = timeline.scenes[i]
      // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
      const sceneVoiceTemplate = scene?.voiceTemplate || voiceTemplate
      
      const markups = buildSceneMarkup(timeline, i)
      const cachedCount = markups.filter(markup => {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      }).length
      
      if (cachedCount < markups.length) {
        scenesToSynthesize.push(i)
      }
    }

    // TTS가 준비되지 않은 씬이 있으면 합성
    if (scenesToSynthesize.length > 0 && ensureSceneTts) {
      setIsPreparingLocal(true)
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
          
          const scene = timeline.scenes[sceneIndex]
          // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
          const sceneVoiceTemplate = scene?.voiceTemplate || voiceTemplate
          
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
            
            // 캐시에 명시적으로 저장 (씬별 voiceTemplate 사용)
            const markup = markups[partIndex]
            const key = makeTtsKey(sceneVoiceTemplate, markup)
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
        setIsPreparingLocal(false)
        setIsTtsBootstrapping?.(false)
        return
      }
      
      setIsPreparingLocal(false)
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
    // groupPlaybackIsPlayingRef도 true로 설정 (전체 재생 중에는 계속 true 유지)
    groupPlaybackIsPlayingRef.current = true
    if (setTimelineIsPlaying) {
      setTimelineIsPlaying(true)
    }

    // useTimelinePlayer의 자동 시간 업데이트 비활성화 (전체 재생 중에는 수동으로 관리)
    if (disableAutoTimeUpdateRef) {
      disableAutoTimeUpdateRef.current = true
    }

    // 첫 번째 씬으로 이동 (ref만 업데이트, 상태는 업데이트하지 않아서 중복 렌더링 방지)
    // setCurrentSceneIndex는 playGroup에서 자동으로 호출되므로 여기서는 호출하지 않음
    currentSceneIndexRef.current = 0

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

      // groupPlaybackStartTimeRef가 null이면 아직 첫 번째 그룹의 TTS 재생이 시작되지 않았으므로 업데이트하지 않음
      if (groupPlaybackStartTimeRef.current === null) {
        return
      }

      // 실제 TTS 재생 시작 시점부터 경과한 시간 계산
      const elapsed = (Date.now() - groupPlaybackStartTimeRef.current) / 1000
      
      // 최신 timeline의 totalDuration 계산 (TTS 합성으로 duration이 업데이트되었을 수 있음)
      const latestTimeline = timelineRef.current
      const latestTotalDuration = latestTimeline ? calculateTotalDuration(latestTimeline) : (totalDuration || 0)
      
      // TTS duration만 사용하여 currentTime 계산 (transition 제외)
      const rawCurrentTime = accumulatedTimeRef.current + Math.min(
        elapsed,
        currentGroupDurationRef.current
      )
      // totalDuration을 초과하지 않도록 clamp
      const currentTime = Math.min(rawCurrentTime, latestTotalDuration)
      
      // ref를 먼저 업데이트하여 useTimelinePlayer의 내부 로직과 동기화
      if (currentTimeRef) {
        currentTimeRef.current = currentTime
      }
      
      // 재생바 DOM을 직접 업데이트 (리렌더링 없이)
      if (timelineBarRef?.current && latestTotalDuration > 0) {
        const progressBar = timelineBarRef.current.querySelector('div[style*="width"]') as HTMLElement
        if (progressBar) {
          const progressRatio = Math.min(1, currentTime / latestTotalDuration)
          progressBar.style.width = `${progressRatio * 100}%`
        }
        
        // 시간 표시도 직접 업데이트 (리렌더링 없이)
        const timeContainer = timelineBarRef.current.parentElement?.querySelector('div.flex.items-center.justify-between') as HTMLElement
        if (timeContainer) {
          const timeSpans = timeContainer.querySelectorAll('span')
          if (timeSpans.length >= 2) {
            const speed = playbackSpeed ?? 1.0
            const actualTime = currentTime / speed
            const actualDuration = latestTotalDuration / speed
            const formattedCurrentTime = formatTime(actualTime)
            const formattedTotalTime = formatTime(actualDuration)
            timeSpans[0].textContent = formattedCurrentTime
            timeSpans[1].textContent = formattedTotalTime
          } else if (timeSpans.length >= 1) {
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
          groupPlaybackIsPlayingRef.current = false
          if (setTimelineIsPlaying) {
            setTimelineIsPlaying(false)
          }
          
          // useTimelinePlayer의 자동 시간 업데이트 다시 활성화
          if (disableAutoTimeUpdateRef) {
            disableAutoTimeUpdateRef.current = false
          }
          
          stopBgmAudio()
          stopTtsAudio()
          
          // 최종 시간 설정 (TTS duration만 사용)
          if (setCurrentTime) {
            const totalDuration = calculateTotalDuration(timeline)
            setCurrentTime(totalDuration)
          }
          
          return
        }

        const [sceneId, groupIndices] = groupEntries[groupIndex]
        
        // 실제 TTS 재생 시간 계산 (정확한 타임라인 동기화를 위해)
        // TTS 캐시에서 직접 duration을 가져와서 계산
        // Transition duration은 제외하고 TTS duration만 계산
        let groupDuration = 0
        if (sceneId !== undefined && groupIndices.length > 1) {
          // 그룹 재생: 실제 TTS duration 계산 (transition 제외)
          for (const sceneIndex of groupIndices) {
            const scene = timeline.scenes[sceneIndex]
            // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
            const sceneVoiceTemplate = scene?.voiceTemplate || voiceTemplate!
            
            const markups = buildSceneMarkup(timeline, sceneIndex)
            for (const markup of markups) {
              const key = makeTtsKey(sceneVoiceTemplate, markup)
              const cached = ttsCacheRef.current.get(key)
              if (cached?.durationSec) {
                groupDuration += cached.durationSec
              } else {
                // 캐시가 없으면 scene.duration 사용 (fallback)
                if (scene) {
                  groupDuration += scene.duration || 0
                }
              }
            }
          }
          // Transition duration은 제외 (TTS duration만 사용)
        } else {
          // 단일 씬 재생: 실제 TTS duration 계산 (transition 제외)
          for (const sceneIndex of groupIndices) {
            const scene = timeline.scenes[sceneIndex]
            // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
            const sceneVoiceTemplate = scene?.voiceTemplate || voiceTemplate!
            
            const markups = buildSceneMarkup(timeline, sceneIndex)
            let sceneTtsDuration = 0
            for (const markup of markups) {
              const key = makeTtsKey(sceneVoiceTemplate, markup)
              const cached = ttsCacheRef.current.get(key)
              if (cached?.durationSec) {
                sceneTtsDuration += cached.durationSec
              } else {
                // 캐시가 없으면 scene.duration 사용 (fallback)
                if (scene) {
                  sceneTtsDuration += scene.duration || 0
                }
              }
            }
            groupDuration += sceneTtsDuration
            // Transition duration은 제외 (TTS duration만 사용)
          }
        }

        // 현재 그룹 duration 설정
        currentGroupDurationRef.current = groupDuration
        // 그룹 재생 시작 시간은 playGroup 내부에서 실제 TTS 재생 시작 시점에 설정
        // 여기서는 초기화만 함
        groupPlaybackStartTimeRef.current = null

        // BGM 재생 시작 (첫 번째 그룹만, 재생 시작 직전)
        if (!bgmStartedRef.current && bgmTemplate) {
          bgmStartedRef.current = true
          const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
          // BGM 재생 시작 (비동기로 시작만 하고 await하지 않음)
          startBgmAudio(bgmTemplate, speed, true).catch((error) => {
            console.error('[useFullPlayback] BGM 재생 시작 실패:', error)
          })
        }

        // 모든 재생을 useGroupPlayback으로 통일 (그룹 재생과 단일 씬 재생 모두)
        if (sceneId !== undefined && groupIndices.length > 1) {
          // 그룹 재생
          // 실제 TTS 재생 시작 시점을 추적하기 위해 재생 시작 전 시간 기록
          // playGroup 내부에서 실제 TTS 재생이 시작되면 이 시간을 사용
          const playbackStartTime = Date.now()
          groupPlaybackStartTimeRef.current = playbackStartTime
          
          await groupPlayback.playGroup(sceneId, groupIndices)
        } else {
          // 단일 씬 재생도 useGroupPlayback 사용
          for (const sceneIndex of groupIndices) {
            if (playbackAbortControllerRef.current?.signal.aborted || !isPlayingAllRef.current) {
              break
            }
            
            const scene = timeline.scenes[sceneIndex]
            if (scene) {
              // 단일 씬도 useGroupPlayback을 사용하여 재생
              // sceneId는 undefined로 전달하고, groupIndices는 [sceneIndex]로 전달
              const singleSceneId = scene.sceneId
              
              // 실제 TTS 재생 시작 시점을 추적하기 위해 재생 시작 전 시간 기록
              const playbackStartTime = Date.now()
              groupPlaybackStartTimeRef.current = playbackStartTime
              
              await groupPlayback.playGroup(singleSceneId, [sceneIndex])
            }
          }
        }

        // 그룹 재생 완료 후 누적 시간 업데이트 및 재생바 업데이트
        // 실제 재생된 시간을 정확히 계산
        let actualGroupDuration = 0
        if (groupPlaybackStartTimeRef.current !== null) {
          // 실제 재생된 시간 계산 (재생 시작 시점부터 현재까지)
          const actualElapsed = (Date.now() - groupPlaybackStartTimeRef.current) / 1000
          // groupDuration과 실제 경과 시간 중 작은 값 사용 (정확한 동기화)
          actualGroupDuration = Math.min(actualElapsed, groupDuration)
          accumulatedTimeRef.current += actualGroupDuration
        } else {
          // fallback: 계산된 duration 사용
          actualGroupDuration = groupDuration
          accumulatedTimeRef.current += actualGroupDuration
        }
        
        // 각 씬의 실제 재생 시간 설정 (그룹 전체 재생 시간을 각 씬의 TTS 재생 시간 비율로 할당)
        if (timeline && setTimeline && actualGroupDuration > 0) {
          // 각 씬의 TTS 재생 시간 계산
          const sceneTtsDurations = new Map<number, number>()
          let totalTtsDuration = 0
          
          for (const sceneIndex of groupIndices) {
            const scene = timeline.scenes[sceneIndex]
            // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
            const sceneVoiceTemplate = scene?.voiceTemplate || voiceTemplate!
            
            const markups = buildSceneMarkup(timeline, sceneIndex)
            let sceneTtsDuration = 0
            for (const markup of markups) {
              const key = makeTtsKey(sceneVoiceTemplate, markup)
              const cached = ttsCacheRef.current.get(key)
              if (cached?.durationSec) {
                sceneTtsDuration += cached.durationSec
              }
            }
            sceneTtsDurations.set(sceneIndex, sceneTtsDuration)
            totalTtsDuration += sceneTtsDuration
          }
          
          // 그룹 전체 재생 시간을 각 씬의 TTS 재생 시간 비율로 할당
          if (totalTtsDuration > 0) {
            const updatedScenes = timeline.scenes.map((s, idx) => {
              if (groupIndices.includes(idx)) {
                const sceneTtsDuration = sceneTtsDurations.get(idx) || 0
                // 각 씬의 비율 계산
                const ratio = sceneTtsDuration / totalTtsDuration
                // 그룹 전체 재생 시간을 비율로 할당
                const scenePlaybackDuration = actualGroupDuration * ratio
                if (scenePlaybackDuration > 0) {
                  return { ...s, actualPlaybackDuration: scenePlaybackDuration }
                }
              }
              return s
            })
            setTimeline({ ...timeline, scenes: updatedScenes })
          }
        }
        
        // currentGroupStartTimeRef 업데이트 (다음 그룹 재생을 위해)
        currentGroupStartTimeRef.current = Date.now()
        
          if (setCurrentTime) {
            setCurrentTime(accumulatedTimeRef.current)
        }
        
        // ref 초기화
        groupPlaybackStartTimeRef.current = null

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
      groupPlaybackIsPlayingRef.current = false
      if (setTimelineIsPlaying) {
        setTimelineIsPlaying(false)
      }
      
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
    setTimeline,
    makeTtsKey,
    ensureSceneTts,
    changedScenesRef,
    setIsTtsBootstrapping,
    startBgmAudio,
    stopBgmAudio,
    setIsPlaying,
    setTimelineIsPlaying,
    setCurrentTime,
    currentSceneIndexRef,
    groupPlayback,
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
    isPlaying,
    setIsPlaying,
    isPreparing,
    ttsCacheRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    stopTtsAudio,
    resetTtsSession,
    singleScenePlayback,
    groupPlayback,
  }
}

