import { useState, useEffect, useCallback, useRef } from 'react'
import { calculateTotalDuration, calculateSceneIndexFromTime } from '@/utils/timeline'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseTimelineInteractionParams {
  timeline: TimelineData | null
  timelineBarRef: React.RefObject<HTMLDivElement | null>
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setCurrentSceneIndex: (index: number) => void
  updateCurrentScene: (skipAnimation?: boolean) => void
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  previousSceneIndexRef: React.MutableRefObject<number | null>
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
}: UseTimelineInteractionParams) {
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline || !timelineBarRef.current) return
    
    const rect = timelineBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    
    if (isPlaying) setIsPlaying(false)
    
    const totalDuration = calculateTotalDuration(timeline)
    const targetTime = ratio * totalDuration
    setCurrentTime(targetTime)
    
    const sceneIndex = calculateSceneIndexFromTime(timeline, targetTime)
    setCurrentSceneIndex(sceneIndex)
    // 타임라인 클릭 시 즉시 표시 (전환 효과 없이)
    updateCurrentScene(true)
    lastRenderedSceneIndexRef.current = sceneIndex
    previousSceneIndexRef.current = sceneIndex
  }, [timeline, timelineBarRef, isPlaying, setIsPlaying, setCurrentTime, setCurrentSceneIndex, updateCurrentScene, lastRenderedSceneIndexRef, previousSceneIndexRef])

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
        setCurrentTime(targetTime)
        
        const sceneIndex = calculateSceneIndexFromTime(timeline, targetTime)
        setCurrentSceneIndex(sceneIndex)
        // 타임라인 드래그 시 즉시 표시 (전환 효과 없이)
        updateCurrentScene(true)
        lastRenderedSceneIndexRef.current = sceneIndex
        previousSceneIndexRef.current = sceneIndex
      }

      const handleMouseUp = () => {
        setIsDraggingTimeline(false)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingTimeline, timeline, timelineBarRef, setCurrentTime, setCurrentSceneIndex, updateCurrentScene, lastRenderedSceneIndexRef, previousSceneIndexRef])

  return {
    isDraggingTimeline,
    handleTimelineClick,
    handleTimelineMouseDown,
  }
}

