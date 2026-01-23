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
  setCurrentSceneIndex: (index: number) => void
  updateCurrentScene: (explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, partIndex?: number | null, sceneIndex?: number, overrideTransitionDuration?: number) => void
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  ttsCacheRef?: React.RefObject<Map<string, { blob: Blob; durationSec: number; markup?: string; url?: string | null }>> | React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup?: string; url?: string | null }>>
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey?: (voiceName: string, markup: string) => string
  voiceTemplate?: string | null
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
}: UseTimelineInteractionParams) {
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const lastDragTimeRef = useRef<number>(0)

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
    
    const rect = timelineBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    
    if (isPlaying) setIsPlaying(false)
    
    const totalDuration = calculateTotalDuration(timeline)
    const targetTime = ratio * totalDuration
    
    // 구간 시작 지점으로 스냅
    const snappedTime = snapToPartStart(targetTime)
    setCurrentTime(snappedTime)
    
    const sceneIndex = calculateSceneIndexFromTime(timeline, snappedTime)
    setCurrentSceneIndex(sceneIndex)
    // 타임라인 클릭 시 즉시 표시 (전환 효과 없이)
    // skipAnimation 파라미터 제거: forceTransition === 'none'으로 처리
    updateCurrentScene(null, 'none')
    lastRenderedSceneIndexRef.current = sceneIndex
    previousSceneIndexRef.current = sceneIndex
  }, [timeline, timelineBarRef, isPlaying, setIsPlaying, setCurrentTime, setCurrentSceneIndex, updateCurrentScene, lastRenderedSceneIndexRef, previousSceneIndexRef, snapToPartStart])

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline) return
    if (isPlaying) setIsPlaying(false)
    setIsDraggingTimeline(true)
    handleTimelineClick(e)
  }, [timeline, isPlaying, setIsPlaying, setIsDraggingTimeline, handleTimelineClick])

  useEffect(() => {
    if (isDraggingTimeline) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingTimeline || !timeline || !timelineBarRef.current) return
        
        const rect = timelineBarRef.current.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const ratio = Math.max(0, Math.min(1, mouseX / rect.width))
        
        const totalDuration = calculateTotalDuration(timeline)
        const targetTime = ratio * totalDuration
        
        // 마지막 드래그 시간 저장
        lastDragTimeRef.current = targetTime
        
        // 드래그 중에는 스냅하지 않고 정확한 위치 사용 (마우스 업 시에만 스냅)
        setCurrentTime(targetTime)
        
        const sceneIndex = calculateSceneIndexFromTime(timeline, targetTime)
        setCurrentSceneIndex(sceneIndex)
        // 타임라인 드래그 시 즉시 표시 (전환 효과 없이)
        // skipAnimation 파라미터 제거: forceTransition === 'none'으로 처리
        updateCurrentScene(null, 'none')
        lastRenderedSceneIndexRef.current = sceneIndex
        previousSceneIndexRef.current = sceneIndex
      }

      const handleMouseUp = () => {
        if (!timeline) {
          setIsDraggingTimeline(false)
          return
        }
        
        // 마우스 업 시 구간 시작 지점으로 스냅
        const snappedTime = snapToPartStart(lastDragTimeRef.current)
        setCurrentTime(snappedTime)
        
        const sceneIndex = calculateSceneIndexFromTime(timeline, snappedTime)
        setCurrentSceneIndex(sceneIndex)
        updateCurrentScene(null, 'none')
        lastRenderedSceneIndexRef.current = sceneIndex
        previousSceneIndexRef.current = sceneIndex
        
        setIsDraggingTimeline(false)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingTimeline, timeline, timelineBarRef, setCurrentTime, setCurrentSceneIndex, updateCurrentScene, lastRenderedSceneIndexRef, previousSceneIndexRef, snapToPartStart])

  return {
    isDraggingTimeline,
    handleTimelineClick,
    handleTimelineMouseDown,
  }
}

