'use client'

import { useCallback } from 'react'
import type { TimelineData, TimelineScene, SceneScript } from '@/store/useVideoCreateStore'

interface UseSceneEditHandlersParams {
  timeline: TimelineData | null
  scenes: SceneScript[]
  setTimeline: (timeline: TimelineData | null) => void
  setScenes: (scenes: SceneScript[]) => void
  timelineRef: React.MutableRefObject<TimelineData | null>
  changedScenesRef: React.MutableRefObject<Set<number>>
  invalidateSceneTtsCache: (sceneIndex: number) => void
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  stageDimensions: { width: number; height: number }
  loadAllScenes: () => Promise<void>
  recalculateCanvasSize: () => void
}

/**
 * 씬 편집 핸들러 훅
 * 그룹 복사, 삭제, voiceTemplate 변경, 템플릿 리사이즈 핸들러를 제공합니다.
 */
export function useSceneEditHandlers({
  timeline,
  scenes,
  setTimeline,
  setScenes,
  timelineRef,
  changedScenesRef,
  invalidateSceneTtsCache,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  stageDimensions,
  loadAllScenes,
  recalculateCanvasSize,
}: UseSceneEditHandlersParams) {
  // 씬별 voiceTemplate 설정 핸들러
  const handleSceneVoiceTemplateChange = useCallback(
    (sceneIndex: number, newVoiceTemplate: string | null) => {
      const currentTimeline = timelineRef.current
      if (!currentTimeline) return
      
      const scene = currentTimeline.scenes[sceneIndex]
      if (!scene) return
      
      // 씬의 voiceTemplate 업데이트 및 actualPlaybackDuration 초기화
      // (새로운 목소리로 재생성되므로 이전 재생 시간은 무효화)
      const updatedScenes = currentTimeline.scenes.map((s, idx) =>
        idx === sceneIndex
          ? { ...s, voiceTemplate: newVoiceTemplate, actualPlaybackDuration: undefined }
          : s
      )
      
      setTimeline({
        ...currentTimeline,
        scenes: updatedScenes,
      })
      
      // TTS 캐시 무효화 (새로운 목소리로 재생성 필요)
      changedScenesRef.current.add(sceneIndex)
      invalidateSceneTtsCache(sceneIndex)
    },
    [setTimeline, changedScenesRef, invalidateSceneTtsCache, timelineRef]
  )

  // 그룹 복사 핸들러
  const handleGroupDuplicate = useCallback((sceneId: number, groupIndices: number[]) => {
    const currentTimeline = timelineRef.current
    if (!currentTimeline || scenes.length === 0) return

    // 새로운 sceneId 할당
    const maxSceneId = Math.max(...scenes.map(s => s.sceneId || 0), ...currentTimeline.scenes.map(s => s.sceneId || 0))
    const newSceneId = maxSceneId + 1

    // 그룹 내 모든 씬 복사
    const duplicatedScenes: SceneScript[] = []
    const duplicatedTimelineScenes: TimelineScene[] = []
    
    groupIndices.forEach((index, idx) => {
      const originalScene = scenes[index]
      const originalTimelineScene = currentTimeline.scenes[index]
      
      duplicatedScenes.push({
        ...originalScene,
        sceneId: newSceneId, // 새로운 그룹의 sceneId
        splitIndex: idx + 1, // splitIndex 재할당 (1부터 시작)
      })
      
      duplicatedTimelineScenes.push({
        ...originalTimelineScene,
        sceneId: newSceneId, // 새로운 그룹의 sceneId
        splitIndex: idx + 1, // splitIndex 재할당
      })
    })

    // 그룹의 마지막 씬 다음에 삽입
    const lastGroupIndex = Math.max(...groupIndices)
    const insertIndex = lastGroupIndex + 1

    // scenes 배열에 삽입
    const newScenes = [
      ...scenes.slice(0, insertIndex),
      ...duplicatedScenes,
      ...scenes.slice(insertIndex),
    ]

    // timeline.scenes 배열에도 삽입
    const newTimelineScenes = [
      ...currentTimeline.scenes.slice(0, insertIndex),
      ...duplicatedTimelineScenes,
      ...currentTimeline.scenes.slice(insertIndex),
    ]

    setScenes(newScenes)
    setTimeline({
      ...currentTimeline,
      scenes: newTimelineScenes,
    })

    // 복사된 그룹의 첫 번째 씬 선택
    setCurrentSceneIndex(insertIndex)
    currentSceneIndexRef.current = insertIndex

    // 복사된 씬들을 변경 상태로 표시
    duplicatedScenes.forEach((_, idx) => {
      changedScenesRef.current.add(insertIndex + idx)
      invalidateSceneTtsCache(insertIndex + idx)
    })
  }, [scenes, setScenes, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, invalidateSceneTtsCache, changedScenesRef, timelineRef])

  // 그룹 삭제 핸들러
  const handleGroupDelete = useCallback((sceneId: number, groupIndices: number[]) => {
    const currentTimeline = timelineRef.current
    if (!currentTimeline || scenes.length === 0) return

    // 그룹 내 모든 씬 삭제 (역순으로 삭제하여 인덱스 변경 문제 방지)
    const sortedIndices = [...groupIndices].sort((a, b) => b - a)
    
    let newScenes = [...scenes]
    let newTimelineScenes = [...currentTimeline.scenes]

    sortedIndices.forEach(index => {
      newScenes = newScenes.filter((_, i) => i !== index)
      newTimelineScenes = newTimelineScenes.filter((_, i) => i !== index)
    })

    setScenes(newScenes)
    setTimeline({
      ...currentTimeline,
      scenes: newTimelineScenes,
    })
  }, [timeline, scenes, setScenes, setTimeline, timelineRef])

  // 되돌리기 핸들러
  const handleResizeTemplate = useCallback(() => {
    const currentTimeline = timelineRef.current
    if (!currentTimeline || scenes.length === 0) {
      return
    }
    
    const { width, height } = stageDimensions
    
    // 모든 씬에 되돌리기 적용
    const updatedScenes = currentTimeline.scenes.map((scene) => {
      // 이미지: imageTransform 제거하여 초기 상태로 되돌림
      // 자막: 하단 85% 위치로 설정
      const textY = height * 0.85 // 하단 85% 위치
      const textWidth = width * 0.75 // 화면 너비의 75%
      
      const textTransform = {
        x: width * 0.5, // 중앙 (50%)
        y: textY,
        width: textWidth,
        height: height * 0.07, // 화면 높이의 7%
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      }
      
      return {
        ...scene,
        imageTransform: undefined, // 초기 상태로 되돌림
        text: {
          ...scene.text,
          position: 'bottom',
          transform: textTransform,
        },
      }
    })
    
    const nextTimeline: TimelineData = {
      ...currentTimeline,
      scenes: updatedScenes,
    }
    
    setTimeline(nextTimeline)
    
    // 모든 씬을 다시 로드하여 Transform 적용
    setTimeout(() => {
      loadAllScenes()
      // Canvas 크기 재계산
      recalculateCanvasSize()
    }, 100)
  }, [timeline, scenes.length, stageDimensions, setTimeline, loadAllScenes, recalculateCanvasSize, timelineRef])

  return {
    handleGroupDuplicate,
    handleGroupDelete,
    handleSceneVoiceTemplateChange,
    handleResizeTemplate,
  }
}
