'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { useSingleScenePlayback } from './useSingleScenePlayback'
import { useGroupPlayback } from './useGroupPlayback'
import { useTtsResources } from '../tts/useTtsResources'
import { usePlaybackCore } from './usePlaybackCore'
import { useTtsCache } from '../tts/useTtsCache'
import { formatTime, calculateTotalDuration } from '@/utils/timeline'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'

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
  
  // 공통 재생 로직
  const { stopPlayback: stopPlaybackCore } = usePlaybackCore()
  
  // TTS 캐시 관리
  const { findScenesToSynthesize: findScenesToSynthesizeCore } = useTtsCache()
  
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
  // actualTotalDurationRef는 사용하지 않음 (TTS duration 합계를 정확히 사용)
  const actualTotalDurationRef = useRef<number | null>(null)

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
    // 일시정지 시 현재 재생 위치를 저장하기 위해 현재 시간 계산
    let finalCurrentTime = 0
    let targetSceneIndex = currentSceneIndexRef.current
    let partStartAbsoluteTime = 0
    
    if (isPlayingAllRef.current && groupPlaybackStartTimeRef.current !== null) {
      // 실제 TTS 재생 시작 시점부터 경과한 시간 계산
      const elapsed = (Date.now() - groupPlaybackStartTimeRef.current) / 1000
      const elapsedWithSpeed = elapsed * (playbackSpeed ?? 1.0)
      
      // 현재 그룹의 진행 시간 계산
      const currentGroupElapsed = Math.min(
        elapsedWithSpeed,
        currentGroupDurationRef.current
      )
      
      // 전체 재생 시간 = 누적 시간 + 현재 그룹 진행 시간
      finalCurrentTime = accumulatedTimeRef.current + currentGroupElapsed
    } else if (currentTimeRef) {
      // 재생이 시작되지 않았거나 이미 완료된 경우, ref에 저장된 현재 시간 사용
      finalCurrentTime = currentTimeRef.current
    }
    
    // 일시정지 시 구간의 시작으로 이동: 현재 시간에 맞는 씬과 구간 계산 (멈춘 음성 파일의 시작점)
    if (timeline && finalCurrentTime > 0 && buildSceneMarkup && makeTtsKey && voiceTemplate) {
      // TTS duration만 사용하여 씬 인덱스 계산 (전체 재생과 동일한 방식)
      let accumulated = 0
      targetSceneIndex = timeline.scenes.length - 1
      for (let i = 0; i < timeline.scenes.length; i++) {
        const sceneDuration = timeline.scenes[i].duration
        const sceneStart = accumulated
        const sceneEnd = accumulated + sceneDuration
        
        if (finalCurrentTime >= sceneStart && finalCurrentTime < sceneEnd) {
          targetSceneIndex = i
          break
        }
        
        if (i === timeline.scenes.length - 1 && finalCurrentTime >= sceneEnd) {
          targetSceneIndex = i
          break
        }
        
        accumulated += sceneDuration
      }
      
      const scene = timeline.scenes[targetSceneIndex]
      
      if (scene) {
        // 씬의 시작 시간 계산 (TTS duration만 사용, transition duration 제외)
        // 전체 재생에서는 TTS duration만 사용하므로 동일하게 계산
        let sceneStartTime = 0
        for (let i = 0; i < targetSceneIndex; i++) {
          sceneStartTime += timeline.scenes[i].duration
        }
        
        // 씬 내에서 경과 시간 계산
        const elapsedInScene = finalCurrentTime - sceneStartTime
        
        // 씬의 자막 구간 파싱
        const originalText = scene.text?.content || ''
        const scriptParts = splitSubtitleByDelimiter(originalText)
        
        // 각 구간의 duration을 누적하여 현재 구간 찾기
        let accumulatedPartTime = 0
        let targetPartIndex = 0
        
        const markups = buildSceneMarkup(timeline, targetSceneIndex)
        const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
        
        for (let partIdx = 0; partIdx < scriptParts.length && partIdx < markups.length; partIdx++) {
          const markup = markups[partIdx]
          if (markup) {
            const key = makeTtsKey(sceneVoiceTemplate, markup)
            const cached = ttsCacheRef.current.get(key)
            const partDuration = cached?.durationSec || scene.duration / scriptParts.length || 1
            
            // 현재 구간의 끝 시간
            const partEndTime = accumulatedPartTime + partDuration
            
            // 현재 시간이 이 구간 내에 있으면 이 구간의 시작으로 이동
            if (elapsedInScene >= accumulatedPartTime && elapsedInScene < partEndTime) {
              targetPartIndex = partIdx
              // 구간의 시작 시간 계산 (멈춘 음성 파일의 시작점)
              partStartAbsoluteTime = sceneStartTime + accumulatedPartTime
              break
            }
            
            accumulatedPartTime = partEndTime
          }
        }
        
        // 타임라인 안정화: 모든 상태를 한 번에 배치 업데이트 (리렌더링 최소화)
        // requestAnimationFrame을 사용하여 다음 프레임에 업데이트하여 불필요한 리렌더링 방지
        requestAnimationFrame(() => {
          // 1. 시간 업데이트 (구간의 시작 시간)
          if (partStartAbsoluteTime > 0) {
            if (setCurrentTime) {
              setCurrentTime(partStartAbsoluteTime)
            }
            if (currentTimeRef) {
              currentTimeRef.current = partStartAbsoluteTime
            }
          }
          
          // 2. 씬 인덱스 업데이트
          currentSceneIndexRef.current = targetSceneIndex
          lastRenderedSceneIndexRef.current = targetSceneIndex
          if (setCurrentSceneIndex) {
            setCurrentSceneIndex(targetSceneIndex)
          }
        })
        
        // 구간의 시작으로 이동: 텍스트와 이미지를 직접 업데이트하여 해당 구간 표시 (씬 전환 없이)
        // renderSceneContent를 호출하면 updateCurrentScene이 호출되어 위치가 변경될 수 있으므로
        // 직접 객체를 업데이트하는 방식 사용
        
        // 현재 씬의 이미지 표시
        const currentSprite = spritesRef.current.get(targetSceneIndex)
        if (currentSprite && containerRef.current) {
          // 같은 그룹 내 씬인 경우 첫 번째 씬의 스프라이트 사용
          let spriteToShow = currentSprite
          if (scene.sceneId !== undefined) {
            const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
            if (firstSceneIndexInGroup >= 0 && firstSceneIndexInGroup !== targetSceneIndex) {
              const firstSprite = spritesRef.current.get(firstSceneIndexInGroup)
              if (firstSprite) {
                spriteToShow = firstSprite
              }
            }
          }
          
          if (spriteToShow.parent !== containerRef.current) {
            if (spriteToShow.parent) {
              spriteToShow.parent.removeChild(spriteToShow)
            }
            containerRef.current.addChild(spriteToShow)
            containerRef.current.setChildIndex(spriteToShow, 0) // 이미지를 맨 뒤로
          }
          spriteToShow.visible = true
          spriteToShow.alpha = 1
        }
        
        // 다른 씬의 이미지 숨기기
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== targetSceneIndex) {
            // 같은 그룹이 아닌 경우에만 숨김
            const otherScene = timeline.scenes[idx]
            if (otherScene?.sceneId !== scene.sceneId) {
              sprite.visible = false
              sprite.alpha = 0
            }
          }
        })
        
        // 텍스트 업데이트
        if (scriptParts.length > 0 && targetPartIndex < scriptParts.length) {
          const partText = scriptParts[targetPartIndex]?.trim()
          if (partText) {
            // 같은 그룹 내 씬인 경우 첫 번째 씬의 텍스트 객체 사용
            let targetTextObj = textsRef.current.get(targetSceneIndex)
            if (scene.sceneId !== undefined) {
              const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
              if (firstSceneIndexInGroup >= 0 && firstSceneIndexInGroup !== targetSceneIndex) {
                targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || targetTextObj
              }
            }
            
            if (targetTextObj) {
              targetTextObj.text = partText
              targetTextObj.visible = true
              targetTextObj.alpha = 1
              
              // 컨테이너에 추가 (없는 경우)
              if (containerRef.current && targetTextObj.parent !== containerRef.current) {
                if (targetTextObj.parent) {
                  targetTextObj.parent.removeChild(targetTextObj)
                }
                containerRef.current.addChild(targetTextObj)
              }
              
              // 텍스트를 맨 위로 올림
              if (containerRef.current && targetTextObj.parent === containerRef.current) {
                const currentIndex = containerRef.current.getChildIndex(targetTextObj)
                const maxIndex = containerRef.current.children.length - 1
                if (currentIndex !== maxIndex) {
                  containerRef.current.setChildIndex(targetTextObj, maxIndex)
                }
              }
            }
          }
        }
        
        // 다른 씬의 텍스트 숨기기
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== targetSceneIndex) {
            // 같은 그룹이 아닌 경우에만 숨김
            const otherScene = timeline.scenes[idx]
            if (otherScene?.sceneId !== scene.sceneId) {
              text.visible = false
              text.alpha = 0
            }
          }
        })
      }
    }
    
    // 공통 재생 정지 로직 (애니메이션 정리, 스프라이트/텍스트 복원, 오디오 정지)
    stopPlaybackCore({
      sceneIndex: currentSceneIndexRef.current,
      activeAnimationsRef,
      spritesRef,
      textsRef,
      stopTtsAudio,
      stopBgmAudio,
    })
    
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

    // 타임라인 안정화: 모든 상태 업데이트 완료 후 자동 업데이트 재활성화
    // requestAnimationFrame을 사용하여 다음 프레임에 업데이트하여 리렌더링 최소화
    requestAnimationFrame(() => {
      // useTimelinePlayer의 자동 시간 업데이트 다시 활성화
      if (disableAutoTimeUpdateRef) {
        disableAutoTimeUpdateRef.current = false
      }
    })

    // 재생바 업데이트 interval 정리
    cleanupProgressInterval()

    // groupPlaybackStartTimeRef 초기화 (다음 재생 시작 시점을 위해)
    groupPlaybackStartTimeRef.current = null
    
    // 상태 초기화 (일시정지 시에는 accumulatedTimeRef를 유지하지 않음 - 재생 재개 시 다시 계산)
    // accumulatedTimeRef는 재생 재개 시 현재 씬부터 다시 계산되므로 여기서 초기화해도 됨
    currentGroupStartTimeRef.current = 0
    currentGroupDurationRef.current = 0
    bgmStartedRef.current = false
  }, [stopPlaybackCore, setTimelineIsPlaying, cleanupProgressInterval, disableAutoTimeUpdateRef, activeAnimationsRef, spritesRef, textsRef, currentSceneIndexRef, stopTtsAudio, stopBgmAudio, setIsPlaying, setCurrentTime, playbackSpeed, currentTimeRef, timeline, setCurrentSceneIndex, renderSceneContent, lastRenderedSceneIndexRef])

  // 전체 재생 함수
  const playAllScenes = useCallback(async () => {
    if (!timeline || !voiceTemplate) {
      return
    }
    // 모든 씬의 TTS가 준비되었는지 확인 (useTtsCache 사용)
    const allSceneIndices = timeline.scenes.map((_, i) => i)
    const scenesToSynthesize = findScenesToSynthesizeCore(
      timeline,
      allSceneIndices,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
      ttsCacheRef
    )

    // TTS가 준비되지 않은 씬이 있으면 합성
    if (scenesToSynthesize.length > 0 && ensureSceneTts) {
      setIsPreparingLocal(true)
      setIsTtsBootstrapping?.(true)
      
      try {
        // 병렬로 모든 씬의 TTS 합성 (Promise.allSettled 사용하여 일부 실패해도 계속 진행)
        const ttsResults = await Promise.allSettled(
          scenesToSynthesize.map(sceneIndex =>
            ensureSceneTts(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex) || false)
          )
        )
        
        // ensureSceneTts 결과를 명시적으로 캐시에 저장 (성공한 씬만)
        for (let i = 0; i < ttsResults.length; i++) {
          const result = ttsResults[i]
          
          if (result.status === 'rejected') {
            const failedSceneIndex = scenesToSynthesize[i]
            console.error(`[useFullPlayback] 씬 ${failedSceneIndex} TTS 생성 실패:`, result.reason)
            continue
          }
          
          const ttsResult = result.value
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

    // 현재 선택된 씬부터 재생 시작 (ref만 업데이트, 상태는 업데이트하지 않아서 중복 렌더링 방지)
    // setCurrentSceneIndex는 playGroup에서 자동으로 호출되므로 여기서는 호출하지 않음
    const startSceneIndex = currentSceneIndexRef.current
    currentSceneIndexRef.current = startSceneIndex

    // 현재 씬까지의 누적 시간 계산 (TTS duration만 사용)
    let accumulatedTime = 0
    for (let i = 0; i < startSceneIndex; i++) {
      accumulatedTime += timeline.scenes[i].duration
    }

    // 상태 초기화
    accumulatedTimeRef.current = accumulatedTime
    currentGroupStartTimeRef.current = 0
    currentGroupDurationRef.current = 0
    bgmStartedRef.current = false
    lastUpdateTimeRef.current = 0
    // 이전에 저장된 실제 재생 시간이 있으면 사용, 없으면 null로 초기화
    // (null이면 calculateTotalDuration 사용)

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
      // 배속 적용: 실제 경과 시간에 배속을 곱하여 타임라인 시간으로 변환
      // 예: 2배속에서 실제 4초 경과 = 타임라인 8초 진행
      const elapsedWithSpeed = elapsed * (playbackSpeed ?? 1.0)
      
      // 최신 timeline의 totalDuration 계산 (TTS 합성으로 duration이 업데이트되었을 수 있음)
      const latestTimeline = timelineRef.current
      // useTimelinePlayer의 totalDuration을 우선 사용 (동기화 보장)
      const calculatedTotalDuration = totalDuration ?? (latestTimeline ? calculateTotalDuration(latestTimeline) : 0)
      // actualTotalDurationRef는 실제 재생 시간이 예상보다 길 때만 사용
      const latestTotalDuration = actualTotalDurationRef.current ?? calculatedTotalDuration
      
      // TTS duration만 사용하여 currentTime 계산 (transition 제외)
      // 배속이 적용된 경과 시간 사용
      const rawCurrentTime = accumulatedTimeRef.current + Math.min(
        elapsedWithSpeed,
        currentGroupDurationRef.current
      )
      
      // currentTime은 rawCurrentTime 그대로 사용 (clamp하지 않음)
      // 실제 재생 시간이 예상 길이를 초과할 수 있도록 허용
      const currentTime = rawCurrentTime
      
      // ref를 먼저 업데이트하여 useTimelinePlayer의 내부 로직과 동기화
      if (currentTimeRef) {
        currentTimeRef.current = currentTime
      }
      
      // 재생바 DOM을 직접 업데이트 (리렌더링 없이)
      // latestTotalDuration이 0보다 크거나 currentTime이 0보다 클 때만 업데이트
      if (timelineBarRef?.current && (latestTotalDuration > 0 || currentTime > 0)) {
        const progressBar = timelineBarRef.current.querySelector('div[style*="width"]') as HTMLElement
        if (progressBar) {
          // latestTotalDuration이 0이면 currentTime을 사용 (초기 상태)
          const effectiveDuration = latestTotalDuration > 0 ? latestTotalDuration : Math.max(currentTime, 1)
          const progressRatio = Math.min(1, currentTime / effectiveDuration)
          progressBar.style.width = `${progressRatio * 100}%`
        }
        
        // 시간 표시도 직접 업데이트 (리렌더링 없이)
        const timeContainer = timelineBarRef.current.parentElement?.querySelector('div.flex.items-center.justify-between') as HTMLElement
        if (timeContainer) {
          const timeSpans = timeContainer.querySelectorAll('span')
          if (timeSpans.length >= 2) {
            const speed = playbackSpeed ?? 1.0
            const actualTime = currentTime / speed
            // latestTotalDuration이 0이면 currentTime을 사용 (초기 상태)
            const effectiveDuration = latestTotalDuration > 0 ? latestTotalDuration : Math.max(currentTime, 1)
            const actualDuration = effectiveDuration / speed
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

      // 현재 씬이 포함된 그룹 찾기
      let startGroupIndex = 0
      for (let i = 0; i < groupEntries.length; i++) {
        const [, groupIndices] = groupEntries[i]
        if (groupIndices.includes(startSceneIndex)) {
          startGroupIndex = i
          break
        }
      }

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
          
          // 최종 시간 설정 (TTS duration 합계 사용)
          if (setCurrentTime) {
            const finalTime = calculateTotalDuration(timeline)
            setCurrentTime(finalTime)
          }
          
          // 전체 재생 완료 후, actualPlaybackDuration이 있는 씬들은 duration으로 반영
          // (TTS duration 합계는 정확하므로 비례 조정하지 않음)
          if (timeline && setTimeline) {
            const updatedScenes = timeline.scenes.map((s) => {
              if (s.actualPlaybackDuration && s.actualPlaybackDuration > 0) {
                return { ...s, duration: s.actualPlaybackDuration }
              }
              return s
            })
            
            // 변경사항이 있으면 업데이트
            const hasChanges = updatedScenes.some((s, idx) => 
              s.duration !== timeline.scenes[idx]?.duration
            )
            if (hasChanges) {
              setTimeline({ ...timeline, scenes: updatedScenes })
            }
          }
          
          // TTS duration 합계를 정확히 사용하므로 actualTotalDurationRef 사용하지 않음
          
          return
        }

        const [sceneId, groupIndices] = groupEntries[groupIndex]
        
        // 현재 씬이 포함된 그룹인 경우, 현재 씬부터 시작하도록 필터링
        let filteredGroupIndices = groupIndices
        let groupStartOffset = 0 // 그룹 내에서 건너뛴 씬들의 duration
        if (groupIndex === startGroupIndex && groupIndices.includes(startSceneIndex)) {
          // 현재 씬부터 시작하도록 필터링
          const startIndexInGroup = groupIndices.indexOf(startSceneIndex)
          filteredGroupIndices = groupIndices.slice(startIndexInGroup)
          
          // 건너뛴 씬들의 duration 계산 (그룹 내에서)
          for (let i = 0; i < startIndexInGroup; i++) {
            const skippedSceneIndex = groupIndices[i]
            const skippedScene = timeline.scenes[skippedSceneIndex]
            if (skippedScene) {
              const sceneVoiceTemplate = skippedScene.voiceTemplate || voiceTemplate!
              const markups = buildSceneMarkup(timeline, skippedSceneIndex)
              for (const markup of markups) {
                const key = makeTtsKey(sceneVoiceTemplate, markup)
                const cached = ttsCacheRef.current.get(key)
                if (cached?.durationSec) {
                  groupStartOffset += cached.durationSec
                } else {
                  groupStartOffset += skippedScene.duration || 0
                }
              }
            }
          }
        }
        
        // 실제 TTS 재생 시간 계산 (정확한 타임라인 동기화를 위해)
        // TTS 캐시에서 직접 duration을 가져와서 계산
        // Transition duration은 제외하고 TTS duration만 계산
        let groupDuration = 0
        if (sceneId !== undefined && filteredGroupIndices.length > 1) {
          // 그룹 재생: 실제 TTS duration 계산 (transition 제외)
          for (const sceneIndex of filteredGroupIndices) {
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
          for (const sceneIndex of filteredGroupIndices) {
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

        // 현재 그룹 duration 설정 (그룹 내에서 건너뛴 부분 제외)
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
        if (sceneId !== undefined && filteredGroupIndices.length > 1) {
          // 그룹 재생
          // 실제 TTS 재생 시작 시점을 추적하기 위해 재생 시작 전 시간 기록
          // playGroup 내부에서 실제 TTS 재생이 시작되면 이 시간을 사용
          const playbackStartTime = Date.now()
          groupPlaybackStartTimeRef.current = playbackStartTime
          
          await groupPlayback.playGroup(sceneId, filteredGroupIndices)
        } else {
          // 단일 씬 재생도 useGroupPlayback 사용
          for (const sceneIndex of filteredGroupIndices) {
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
          // 배속 적용: 실제 경과 시간에 배속을 곱하여 타임라인 시간으로 변환
          const actualElapsedWithSpeed = actualElapsed * (playbackSpeed ?? 1.0)
          // 실제 재생 시간이 예상 길이보다 길 수 있으므로, 실제 경과 시간을 우선 사용
          // (예상 길이보다 실제 재생 시간이 길면, 예상 길이를 늘림)
          actualGroupDuration = Math.max(actualElapsedWithSpeed, groupDuration)
          accumulatedTimeRef.current += actualGroupDuration
          
          // TTS duration 합계를 정확히 사용하므로 actualTotalDurationRef 업데이트하지 않음
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
                  // actualPlaybackDuration과 duration 모두 업데이트
                  // duration도 실제 재생 시간에 맞춰 업데이트하여 개별 씬 재생 시에도 정확한 시간 사용
                  return { 
                    ...s, 
                    actualPlaybackDuration: scenePlaybackDuration,
                    duration: scenePlaybackDuration // duration도 실제 재생 시간으로 업데이트
                  }
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

      // 현재 씬이 포함된 그룹부터 재생 시작
      await playGroupsSequentially(groupEntries, startGroupIndex)

    } catch (error) {
      console.error('[useFullPlayback] 전체 재생 오류:', error)
      cleanupProgressInterval()
      
      // TTS duration 합계를 정확히 사용하므로 actualTotalDurationRef 업데이트하지 않음
      
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
    findScenesToSynthesizeCore,
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

