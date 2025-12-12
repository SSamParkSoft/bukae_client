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
  updateCurrentScene: (skipAnimation?: boolean) => void
  setIsPreviewingTransition: (val: boolean) => void
  isManualSceneSelectRef: MutableRefObject<boolean>
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
  isManualSceneSelectRef,
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
      isManualSceneSelectRef.current = true
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => (i === index ? { ...scene, transition: value } : scene)),
      }
      setTimeline(nextTimeline)

      setIsPreviewingTransition(true)
      requestAnimationFrame(() => {
        if (index !== currentSceneIndex) {
          setCurrentSceneIndex(index)
        }
        updateCurrentScene(false)

        const transitionDuration = timeline.scenes[index]?.transitionDuration || 0.5
        setTimeout(() => {
          setIsPreviewingTransition(false)
          isManualSceneSelectRef.current = false
        }, transitionDuration * 1000 + 200)
      })
    },
    [
      currentSceneIndex,
      isManualSceneSelectRef,
      setCurrentSceneIndex,
      setIsPreviewingTransition,
      setTimeline,
      timeline,
      updateCurrentScene,
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

