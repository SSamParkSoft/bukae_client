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
      // TTS 오디오 길이 기반으로 duration을 맞추기 위해 상한을 넉넉히 둠
      const clampedValue = Math.max(0.5, Math.min(120, value))
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
        scenes: timeline.scenes.map((scene, i) => {
          if (i !== index) return scene
          const nextDuration =
            value === 'none'
              ? 0
              : scene.transitionDuration && scene.transitionDuration > 0
                ? scene.transitionDuration
                : 0.5
          return {
            ...scene,
            transition: value,
            transitionDuration: nextDuration,
          }
        }),
      }
      setTimeline(nextTimeline)

      setIsPreviewingTransition(true)
      
      // 전환 효과 변경 시에는 현재 씬 인덱스를 유지
      // previousIndex는 현재 씬 인덱스와 같게 설정 (같은 씬에서 전환 효과만 변경)
      const targetSceneIndex = index
      
      // 현재 씬 인덱스가 변경된 씬과 다르면 현재 씬 인덱스 업데이트
      if (targetSceneIndex !== currentSceneIndex) {
        setCurrentSceneIndex(targetSceneIndex)
      }
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          // 전환 효과 변경 시에는 같은 씬에서 전환 효과만 변경하므로
          // previousIndex는 null로 설정하여 페이드 인 효과 적용
            updateCurrentScene(false, null, value)
          
          lastRenderedSceneIndexRef.current = targetSceneIndex

          const transitionDuration =
            nextTimeline.scenes[targetSceneIndex]?.transition === 'none'
              ? 0
              : nextTimeline.scenes[targetSceneIndex]?.transitionDuration || 0.5
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
      // imageFit이 변경되면 imageTransform을 제거하여 새로운 imageFit이 적용되도록 함
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) => 
          i === index 
            ? { ...scene, imageFit: value, imageTransform: undefined } 
            : scene
        ),
      }
      setTimeline(nextTimeline)

      if (pixiReady && appRef.current && containerRef.current) {
        loadAllScenes().then(() => {
          // 현재 씬이 변경된 씬이면 업데이트
          if (index === currentSceneIndex) {
            updateCurrentScene(true)
          }
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
    [appRef, containerRef, currentSceneIndex, isManualSceneSelectRef, loadAllScenes, pixiReady, setTimeline, timeline, updateCurrentScene],
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

