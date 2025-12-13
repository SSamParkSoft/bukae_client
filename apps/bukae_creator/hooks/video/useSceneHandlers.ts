'use client'

import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import * as PIXI from 'pixi.js'
import type { SceneScript, TimelineData } from '@/store/useVideoCreateStore'

interface UseSceneHandlersParams {
  scenes: SceneScript[]
  timeline: TimelineData | null
  setScenes: (scenes: SceneScript[]) => void
  setTimeline: (timeline: TimelineData | null) => void
  currentSceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  updateCurrentScene: (skipAnimation?: boolean, explicitPreviousIndex?: number | null, forceTransition?: string) => void
  setIsPreviewingTransition: (val: boolean) => void
  isPreviewingTransition: boolean // 전환 효과 미리보기 중인지 확인용
  isManualSceneSelectRef: MutableRefObject<boolean>
  lastRenderedSceneIndexRef: MutableRefObject<number | null> // 전환 효과 미리보기용
  pixiReady: boolean
  appRef: MutableRefObject<PIXI.Application | null>
  containerRef: MutableRefObject<PIXI.Container | null>
  loadAllScenes: () => Promise<void>
  setPlaybackSpeed: (speed: number) => void
}

export function useSceneHandlers({
  scenes,
  timeline,
  setScenes,
  setTimeline,
  currentSceneIndex,
  setCurrentSceneIndex,
  updateCurrentScene,
  setIsPreviewingTransition,
  isPreviewingTransition,
  isManualSceneSelectRef,
  lastRenderedSceneIndexRef,
  pixiReady,
  appRef,
  containerRef,
  loadAllScenes,
  setPlaybackSpeed,
}: UseSceneHandlersParams) {
  const handleSceneScriptChange = useCallback(
    (index: number, value: string) => {
      const updatedScenes = scenes.map((scene, i) => (i === index ? { ...scene, script: value } : scene))
      setScenes(updatedScenes)

      if (timeline) {
        const nextTimeline: TimelineData = {
          ...timeline,
          scenes: timeline.scenes.map((scene, i) =>
            i === index ? { ...scene, text: { ...scene.text, content: value } } : scene,
          ),
        }
        setTimeline(nextTimeline)
      }
    },
    [scenes, setScenes, setTimeline, timeline],
  )

  const handleSceneDurationChange = useCallback(
    (index: number, value: number) => {
      if (!timeline) return
      const clampedValue = Math.max(0.5, Math.min(10, value))
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => (i === index ? { ...scene, duration: clampedValue } : scene)),
      }
      setTimeline(nextTimeline)
    },
    [setTimeline, timeline],
  )

  const handleSceneTransitionChange = useCallback(
    (index: number, value: string) => {
      if (!timeline) return
      
      // 중복 호출 방지
      const currentTransition = timeline.scenes[index]?.transition
      if (currentTransition === value && isPreviewingTransition) {
        return
      }
      
      isManualSceneSelectRef.current = true
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => (i === index ? { ...scene, transition: value } : scene)),
      }
      setTimeline(nextTimeline)

      setIsPreviewingTransition(true)
      
      const previousIndex = lastRenderedSceneIndexRef.current !== null 
        ? lastRenderedSceneIndexRef.current 
        : currentSceneIndex
      
      if (index !== currentSceneIndex) {
        setCurrentSceneIndex(index)
      }
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (previousIndex !== null && previousIndex !== index) {
            updateCurrentScene(false, previousIndex, value)
          } else if (previousIndex === index) {
            updateCurrentScene(false, index, value)
          } else {
            updateCurrentScene(false, null, value)
          }
          
          lastRenderedSceneIndexRef.current = index

          const transitionDuration = nextTimeline.scenes[index]?.transitionDuration || 0.5
          setTimeout(() => {
            setIsPreviewingTransition(false)
            isManualSceneSelectRef.current = false
          }, transitionDuration * 1000 + 200)
        }, 50)
      })
    },
    [
      currentSceneIndex,
      isManualSceneSelectRef,
      lastRenderedSceneIndexRef,
      setCurrentSceneIndex,
      setIsPreviewingTransition,
      setTimeline,
      timeline,
      updateCurrentScene,
      isPreviewingTransition,
    ],
  )

  const handleSceneImageFitChange = useCallback(
    (index: number, value: 'cover' | 'contain' | 'fill') => {
      if (!timeline) return
      isManualSceneSelectRef.current = true
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => (i === index ? { ...scene, imageFit: value } : scene)),
      }
      setTimeline(nextTimeline)

      if (pixiReady && appRef.current && containerRef.current) {
        loadAllScenes().then(() => {
          setTimeout(() => {
            isManualSceneSelectRef.current = false
          }, 50)
        })
      } else {
        setTimeout(() => {
          isManualSceneSelectRef.current = false
        }, 50)
      }
    },
    [appRef, containerRef, isManualSceneSelectRef, loadAllScenes, pixiReady, setTimeline, timeline],
  )

  const handlePlaybackSpeedChange = useCallback(
    (value: number) => {
      setPlaybackSpeed(value)
      if (timeline) {
        const nextTimeline: TimelineData = {
          ...timeline,
          playbackSpeed: value,
        }
        setTimeline(nextTimeline)
      }
    },
    [setPlaybackSpeed, setTimeline, timeline],
  )

  return {
    handleSceneScriptChange,
    handleSceneDurationChange,
    handleSceneTransitionChange,
    handleSceneImageFitChange,
    handlePlaybackSpeedChange,
  }
}

