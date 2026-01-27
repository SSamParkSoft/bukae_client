import { useState, useEffect, useCallback, useRef } from 'react'
import { calculateTotalDuration, calculateSceneIndexFromTime } from '@/utils/timeline'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'

interface UseTimelineInteractionParams {
  timeline: TimelineData | null
  timelineBarRef: React.RefObject<HTMLDivElement | null>
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setCurrentSceneIndex: (index: number, options?: { skipSeek?: boolean }) => void
  updateCurrentScene: (explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, partIndex?: number | null, sceneIndex?: number, overrideTransitionDuration?: number) => void
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  ttsCacheRef?: React.RefObject<Map<string, { blob: Blob; durationSec: number; markup?: string; url?: string | null }>> | React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup?: string; url?: string | null }>>
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey?: (voiceName: string, markup: string) => string
  voiceTemplate?: string | null
  renderAtRef?: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
  transport?: { seek: (tSec: number) => void; getTime: () => number }
  ttsTrack?: { playFrom: (tSec: number, audioCtxTime: number) => void; stopAll: () => void }
  audioContext?: AudioContext | null
  totalDuration?: number // progressRatio 계산과 동일한 totalDuration 사용
}

/**
 * 타임라인 인터랙션 hook
 * 타임라인 클릭/드래그 처리를 담당합니다.
 */
export function useTimelineInteraction({
  timeline,
  timelineBarRef,
  isPlaying,
  setIsPlaying,
  setCurrentTime,
  setCurrentSceneIndex,
  updateCurrentScene,
  lastRenderedSceneIndexRef,
  previousSceneIndexRef,
  ttsCacheRef,
  buildSceneMarkup,
  makeTtsKey,
  voiceTemplate,
  renderAtRef,
  transport,
  ttsTrack,
  audioContext,
  totalDuration,
}: UseTimelineInteractionParams) {
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const lastDragTimeRef = useRef<number>(0)
  
  // 드래그 중 렌더링 쓰로틀링을 위한 ref
  const renderThrottleRef = useRef<number | null>(null)
  const lastRenderTimeRef = useRef<number>(0)
  const pendingRenderTimeRef = useRef<number | null>(null)
  const RENDER_THROTTLE_MS = 16 // 약 60fps (16ms = 60fps, 부드러운 드래그를 위해)

  // TTS 캐시가 모두 준비되었는지 확인하는 함수
  const hasAllTtsCache = useCallback((): boolean => {
    if (!timeline || !timeline.scenes || timeline.scenes.length === 0) {
      return false
    }
    
    // 필수 파라미터가 없으면 false 반환
    if (!ttsCacheRef || !buildSceneMarkup || !makeTtsKey) {
      return false
    }
    
    // ttsCacheRef.current가 없으면 false 반환
    if (!ttsCacheRef.current) {
      return false
    }
    
    // 모든 씬에 대해 TTS 캐시 확인
    const allScenesHaveTtsCache = timeline.scenes.every((scene, sceneIndex) => {
      if (!scene) return false
      
      const markups = buildSceneMarkup(timeline, sceneIndex)
      if (markups.length === 0) {
        // 마크업이 없으면 TTS가 필요 없으므로 캐시가 있다고 간주
        return true
      }
      
      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
      if (!sceneVoiceTemplate || sceneVoiceTemplate.trim() === '') {
        // voiceTemplate이 없으면 TTS가 필요 없으므로 캐시가 있다고 간주
        return true
      }
      
      // 모든 구간의 TTS 캐시가 있는지 확인
      const allPartsCached = markups.every((markup) => {
        if (!markup || markup.trim() === '') {
          return true // 빈 마크업은 무시
        }
        
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        
        // 캐시가 있고, blob 또는 url이 있으며, durationSec이 양수인지 확인
        if (!cached) {
          return false
        }
        
        // blob 또는 url이 있어야 함
        const hasAudio = cached.blob instanceof Blob || (cached.url && typeof cached.url === 'string' && cached.url.length > 0)
        if (!hasAudio) {
          return false
        }
        
        // durationSec이 양수여야 함
        if (!cached.durationSec || cached.durationSec <= 0) {
          return false
        }
        
        return true
      })
      
      return allPartsCached
    })
    
    return allScenesHaveTtsCache
  }, [timeline, ttsCacheRef, buildSceneMarkup, makeTtsKey, voiceTemplate])

  // 구간 시작 지점으로 스냅하는 함수
  const snapToPartStart = useCallback((targetTime: number): number => {
    if (!timeline || !buildSceneMarkup || !makeTtsKey || !voiceTemplate || !ttsCacheRef) {
      return targetTime
    }

    // 씬 인덱스 계산
    let accumulated = 0
    let targetSceneIndex = timeline.scenes.length - 1
    for (let i = 0; i < timeline.scenes.length; i++) {
      const sceneDuration = timeline.scenes[i].duration
      const sceneStart = accumulated
      const sceneEnd = accumulated + sceneDuration
      
      if (targetTime >= sceneStart && targetTime < sceneEnd) {
        targetSceneIndex = i
        break
      }
      
      if (i === timeline.scenes.length - 1 && targetTime >= sceneEnd) {
        targetSceneIndex = i
        break
      }
      
      accumulated += sceneDuration
    }

    const scene = timeline.scenes[targetSceneIndex]
    if (!scene) return targetTime

    // 씬의 시작 시간 계산
    let sceneStartTime = 0
    if (scene.startTime !== undefined) {
      sceneStartTime = scene.startTime
    } else {
      for (let i = 0; i < targetSceneIndex; i++) {
        sceneStartTime += timeline.scenes[i].duration
      }
    }

    // 씬 내에서 경과 시간 계산
    const elapsedInScene = targetTime - sceneStartTime

    // 카드에 구간 정보가 있는지 확인
    const hasPartTimes = scene.parts && Array.isArray(scene.parts) && scene.parts.length > 0

    if (hasPartTimes && scene.parts) {
      // 카드에 저장된 구간 정보 사용
      for (let partIdx = 0; partIdx < scene.parts.length; partIdx++) {
        const part = scene.parts[partIdx]
        if (part && part.startTime !== undefined && part.endTime !== undefined) {
          const partStartTime = part.startTime
          const partEndTime = part.endTime
          
          // 현재 시간이 이 구간 내에 있으면 이 구간의 시작으로 이동
          if (targetTime >= partStartTime && targetTime < partEndTime) {
            return partStartTime
          }
        }
      }
      // 구간을 찾지 못한 경우 마지막 구간의 시작 시간 사용
      if (scene.parts.length > 0) {
        const lastPart = scene.parts[scene.parts.length - 1]
        if (lastPart && lastPart.startTime !== undefined) {
          return lastPart.startTime
        }
      }
    } else {
      // 기존 로직: TTS duration을 계산하여 구간 찾기
      const originalText = scene.text?.content || ''
      const scriptParts = splitSubtitleByDelimiter(originalText)
      const markups = buildSceneMarkup(timeline, targetSceneIndex)
      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
      
      let accumulatedPartTime = 0
      for (let partIdx = 0; partIdx < scriptParts.length && partIdx < markups.length; partIdx++) {
        const markup = markups[partIdx]
        if (markup) {
          const key = makeTtsKey(sceneVoiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          const partDuration = cached?.durationSec || scene.duration / scriptParts.length || 1
          
          const partStartTime = sceneStartTime + accumulatedPartTime
          const partEndTime = accumulatedPartTime + partDuration
          
          // 현재 시간이 이 구간 내에 있으면 이 구간의 시작으로 이동
          if (elapsedInScene >= accumulatedPartTime && elapsedInScene < partEndTime) {
            return partStartTime
          }
          
          accumulatedPartTime = partEndTime
        }
      }
      // 구간을 찾지 못한 경우 씬의 시작 시간 사용
      return sceneStartTime
    }

    return targetTime
  }, [timeline, buildSceneMarkup, makeTtsKey, voiceTemplate, ttsCacheRef])

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline || !timelineBarRef.current) return
    
    // 전체 씬에 대한 TTS 캐시가 없으면 클릭 무시 (강화된 검증)
    if (!hasAllTtsCache()) {
      // TTS 캐시가 준비되지 않았으면 클릭 무시
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    // 타임라인 바의 정확한 위치와 크기 계산 (매번 최신 값 사용)
    const rect = timelineBarRef.current.getBoundingClientRect()
    // 마우스 위치를 타임라인 바의 왼쪽 가장자리 기준으로 계산 (정밀도 향상)
    const clickX = e.clientX - rect.left
    // 타임라인 바의 실제 사용 가능한 너비
    const availableWidth = Math.max(1, rect.width) // 0으로 나누기 방지
    // 0~1 사이의 정확한 비율 계산 (더 높은 정밀도, 소수점 6자리까지)
    const ratio = Math.max(0, Math.min(1, clickX / availableWidth))
    
    if (isPlaying) setIsPlaying(false)
    
    // progressRatio 계산과 동일한 totalDuration 사용 (정확도 향상)
    const effectiveTotalDuration = totalDuration ?? (timeline ? calculateTotalDuration(timeline, {
      ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup: buildSceneMarkup as ((timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number; voiceTemplate?: string | null; text?: { content?: string } }> } | null, sceneIndex: number) => string[]) | undefined,
      makeTtsKey,
    }) : 0)
    
    // 더 정밀한 시간 계산 (부동소수점 정밀도 향상, 소수점 3자리까지)
    // 클릭 시에는 스냅하지 않고 정확한 위치 사용 (정확도 향상)
    const targetTime = Math.max(0, Math.min(effectiveTotalDuration, Math.round((ratio * effectiveTotalDuration) * 1000) / 1000))
    
    // 씬 인덱스 계산 (렌더링 후 실제 씬 인덱스로 업데이트될 예정)
    // setCurrentSceneIndex를 호출하지 않음 - 내부에서 씬 시작 시간으로 seek하는 것을 방지
    const sceneIndex = calculateSceneIndexFromTime(timeline, targetTime)
    
    // setCurrentTime을 먼저 호출하여 Transport와 상태를 정확히 동기화
    // setCurrentTime 내부에서 transport.seek를 호출하므로 직접 호출 불필요
    setCurrentTime(targetTime)
    
    // Transport seek 후 시간이 정확히 설정되었는지 확인 및 보정
    if (transport) {
      // setCurrentTime 내부에서 이미 seek를 호출했지만, 정확도를 위해 다시 확인
      const actualTime = transport.getTime()
      if (Math.abs(actualTime - targetTime) > 0.001) {
        // 1ms 이상 차이나면 다시 seek (더 엄격한 정확도)
        transport.seek(targetTime)
        // 한 번 더 확인
        const finalTime = transport.getTime()
        if (Math.abs(finalTime - targetTime) > 0.001) {
          // 여전히 차이나면 강제로 timelineOffsetSec 설정
          transport.seek(targetTime)
        }
      }
    }
    
    // TTS 정지 (클릭 시에는 음성 재생 안 함)
    if (ttsTrack && typeof window !== 'undefined') {
      ttsTrack.stopAll()
    }
    
    // renderAt을 사용하여 렌더링 (이미지와 자막 모두 업데이트)
    // setCurrentTime 내부에서도 renderAt을 호출하지만, 정확도를 위해 한 번 더 호출
    if (renderAtRef?.current) {
      // Transport의 실제 시간을 사용하여 렌더링 (더 정확)
      // skipAnimation: false로 설정하여 애니메이션(Motion/Transition) 효과 표시
      const renderTime = transport ? transport.getTime() : targetTime
      renderAtRef.current(renderTime, { skipAnimation: false })
      
      // renderAt 후 실제 렌더링된 씬 인덱스를 사용하여 상태 업데이트
      // renderAt 내부에서 이미 currentSceneIndexRef를 업데이트하므로
      // 여기서는 manualSceneIndex만 업데이트 (skipSeek로 seek 방지)
      // requestAnimationFrame을 사용하지 않고 즉시 업데이트하여 타이밍 문제 방지
      if (timeline) {
        const actualTime = transport ? transport.getTime() : targetTime
        const actualSceneIndex = calculateSceneIndexFromTime(timeline, actualTime)
        // skipSeek: true로 설정하여 클릭한 정확한 시간을 유지 (씬 시작 시간으로 이동하지 않음)
        setCurrentSceneIndex(actualSceneIndex, { skipSeek: true })
        lastRenderedSceneIndexRef.current = actualSceneIndex
        previousSceneIndexRef.current = actualSceneIndex
      }
    } else {
      // renderAt이 없는 경우에만 updateCurrentScene 사용 (fallback)
      // skipSeek: true로 설정하여 클릭한 정확한 시간을 유지
      setCurrentSceneIndex(sceneIndex, { skipSeek: true })
      updateCurrentScene(null, 'none')
      lastRenderedSceneIndexRef.current = sceneIndex
      previousSceneIndexRef.current = sceneIndex
    }
    
    // 자동 재생하지 않음 (사용자 요청)
  }, [timeline, timelineBarRef, isPlaying, setIsPlaying, setCurrentTime, setCurrentSceneIndex, updateCurrentScene, lastRenderedSceneIndexRef, previousSceneIndexRef, transport, ttsTrack, renderAtRef, hasAllTtsCache, totalDuration, buildSceneMarkup, makeTtsKey, ttsCacheRef, voiceTemplate])

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline) return
    
    // 전체 씬에 대한 TTS 캐시가 없으면 드래그 시작 무시 (강화된 검증)
    if (!hasAllTtsCache()) {
      // TTS 캐시가 준비되지 않았으면 드래그 시작 무시
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (isPlaying) setIsPlaying(false)
    
    // 드래그 시작 시 TTS 정지 (드래그 중에는 음성 재생 안 함)
    if (ttsTrack && typeof window !== 'undefined') {
      ttsTrack.stopAll()
    }
    
    setIsDraggingTimeline(true)
    handleTimelineClick(e)
  }, [timeline, isPlaying, setIsPlaying, setIsDraggingTimeline, handleTimelineClick, ttsTrack, hasAllTtsCache])

  useEffect(() => {
    if (isDraggingTimeline) {
      // 쓰로틀링된 렌더링 함수
      const scheduleRender = (targetTime: number) => {
        const now = performance.now()
        const timeSinceLastRender = now - lastRenderTimeRef.current
        
        // 마지막 렌더링 시간 저장
        pendingRenderTimeRef.current = targetTime
        
        // 쓰로틀링 시간이 지나지 않았으면 스케줄링
        if (timeSinceLastRender < RENDER_THROTTLE_MS) {
          // 이미 스케줄된 렌더링이 있으면 취소
          if (renderThrottleRef.current !== null) {
            cancelAnimationFrame(renderThrottleRef.current)
          }
          
          // 다음 프레임에 렌더링 스케줄링
          renderThrottleRef.current = requestAnimationFrame(() => {
            const renderTime = pendingRenderTimeRef.current
            if (renderTime !== null && renderAtRef?.current) {
              lastRenderTimeRef.current = performance.now()
              // 드래그 중에도 애니메이션 적용 (미리보기 목적)
              renderAtRef.current(renderTime, { skipAnimation: false })
              renderThrottleRef.current = null
              pendingRenderTimeRef.current = null
            }
          })
        } else {
          // 즉시 렌더링
          lastRenderTimeRef.current = now
          if (renderAtRef?.current) {
            // 드래그 중에도 애니메이션 적용 (미리보기 목적)
            renderAtRef.current(targetTime, { skipAnimation: false })
          }
          renderThrottleRef.current = null
          pendingRenderTimeRef.current = null
        }
      }
      
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingTimeline || !timeline || !timelineBarRef.current) return
        
        // 전체 씬에 대한 TTS 캐시가 없으면 드래그 무시 (강화된 검증)
        if (!hasAllTtsCache()) {
          // TTS 캐시가 준비되지 않았으면 드래그 무시
          return
        }
        
        // 타임라인 바의 정확한 위치와 크기 계산 (드래그 중 매번 최신 값 사용)
        const rect = timelineBarRef.current.getBoundingClientRect()
        // 마우스 위치를 타임라인 바의 왼쪽 가장자리 기준으로 계산 (정밀도 향상)
        const mouseX = e.clientX - rect.left
        // 타임라인 바의 실제 사용 가능한 너비
        const availableWidth = Math.max(1, rect.width) // 0으로 나누기 방지
        // 0~1 사이의 정확한 비율 계산 (더 높은 정밀도, 소수점 6자리까지)
        const ratio = Math.max(0, Math.min(1, mouseX / availableWidth))
        
        // progressRatio 계산과 동일한 totalDuration 사용 (정확도 향상)
        const effectiveTotalDuration = totalDuration ?? (timeline ? calculateTotalDuration(timeline, {
          ttsCacheRef,
          voiceTemplate,
          buildSceneMarkup: buildSceneMarkup as ((timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number; voiceTemplate?: string | null; text?: { content?: string } }> } | null, sceneIndex: number) => string[]) | undefined,
          makeTtsKey,
        }) : 0)
        
        // 더 정밀한 시간 계산 (부동소수점 정밀도 향상, 소수점 3자리까지)
        // 드래그 중에는 스냅하지 않고 정확한 위치 사용
        const targetTime = Math.max(0, Math.min(effectiveTotalDuration, Math.round((ratio * effectiveTotalDuration) * 1000) / 1000))
        
        // 마지막 드래그 시간 저장
        lastDragTimeRef.current = targetTime
        
        // 드래그 중에는 스냅하지 않고 정확한 위치 사용 (마우스 업 시에만 스냅)
        // 타임라인 커서 위치는 즉시 업데이트 (사용자 피드백을 위해)
        setCurrentTime(targetTime)
        
        // Transport seek (드래그 중 시각적 업데이트를 위해)
        if (transport) {
          transport.seek(targetTime)
        }
        
        // TTS 재생하지 않음 (드래그 중에는 음성 재생 안 함)
        // 드래그 중에는 시각적 스크러빙만 수행
        
        const sceneIndex = calculateSceneIndexFromTime(timeline, targetTime)
        setCurrentSceneIndex(sceneIndex, { skipSeek: true })
        
        // 렌더링 업데이트 (쓰로틀링 적용)
        // renderAt을 사용하여 안전하게 렌더링 (텍스트 객체가 생성되지 않은 경우도 처리)
        scheduleRender(targetTime)
        
        // renderAt이 없는 경우에만 updateCurrentScene 사용 (fallback)
        if (!renderAtRef?.current) {
          updateCurrentScene(null, 'none')
        }
        
        lastRenderedSceneIndexRef.current = sceneIndex
        previousSceneIndexRef.current = sceneIndex
      }

      const handleMouseUp = (e: MouseEvent) => {
        if (!timeline) {
          setIsDraggingTimeline(false)
          return
        }
        
        // 전체 씬에 대한 TTS 캐시가 없으면 드래그 종료 무시 (강화된 검증)
        if (!hasAllTtsCache()) {
          // TTS 캐시가 준비되지 않았으면 드래그 종료 무시
          setIsDraggingTimeline(false)
          return
        }
        
        // 스케줄된 렌더링 취소
        if (renderThrottleRef.current !== null) {
          cancelAnimationFrame(renderThrottleRef.current)
          renderThrottleRef.current = null
        }
        
        // 마우스 업 시 구간 시작 지점으로 스냅
        // 드래그 종료 시 최종 위치를 정밀하게 계산
        let finalTime = lastDragTimeRef.current
        if (timelineBarRef.current) {
          const rect = timelineBarRef.current.getBoundingClientRect()
          const mouseX = e.clientX - rect.left
          const availableWidth = Math.max(1, rect.width)
          const ratio = Math.max(0, Math.min(1, mouseX / availableWidth))
          // progressRatio 계산과 동일한 totalDuration 사용 (정확도 향상)
          const effectiveTotalDuration = totalDuration ?? (timeline ? calculateTotalDuration(timeline, {
            ttsCacheRef,
            voiceTemplate,
            buildSceneMarkup: buildSceneMarkup as ((timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number; voiceTemplate?: string | null; text?: { content?: string } }> } | null, sceneIndex: number) => string[]) | undefined,
            makeTtsKey,
          }) : 0)
          finalTime = Math.max(0, Math.min(effectiveTotalDuration, Math.round((ratio * effectiveTotalDuration) * 1000) / 1000))
        }
        const snappedTime = snapToPartStart(finalTime)
        setCurrentTime(snappedTime)
        
        // Transport seek
        if (transport) {
          transport.seek(snappedTime)
        }
        
        const sceneIndex = calculateSceneIndexFromTime(timeline, snappedTime)
        setCurrentSceneIndex(sceneIndex, { skipSeek: true })
        
        // 드래그 종료 시 최종 위치로 즉시 렌더링 (쓰로틀링 없이)
        if (renderAtRef?.current) {
          renderAtRef.current(snappedTime, { skipAnimation: true })
        } else {
          // renderAt이 없는 경우에만 updateCurrentScene 사용 (fallback)
          updateCurrentScene(null, 'none')
        }
        
        lastRenderedSceneIndexRef.current = sceneIndex
        previousSceneIndexRef.current = sceneIndex
        
        // ref 초기화
        pendingRenderTimeRef.current = null
        lastRenderTimeRef.current = 0
        
        setIsDraggingTimeline(false)
        
        // 자동 재생하지 않음 (사용자 요청)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        
        // 정리: 스케줄된 렌더링 취소
        if (renderThrottleRef.current !== null) {
          cancelAnimationFrame(renderThrottleRef.current)
          renderThrottleRef.current = null
        }
        pendingRenderTimeRef.current = null
        lastRenderTimeRef.current = 0
      }
    }
  }, [isDraggingTimeline, timeline, timelineBarRef, setCurrentTime, setCurrentSceneIndex, updateCurrentScene, lastRenderedSceneIndexRef, previousSceneIndexRef, snapToPartStart, transport, ttsTrack, audioContext, renderAtRef, setIsPlaying, hasAllTtsCache, totalDuration, buildSceneMarkup, makeTtsKey, ttsCacheRef, voiceTemplate])

  return {
    isDraggingTimeline,
    handleTimelineClick,
    handleTimelineMouseDown,
  }
}

