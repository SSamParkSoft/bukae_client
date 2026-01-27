'use client'

import { useCallback } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseSceneContentRendererParams {
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  setCurrentSceneIndex: ((index: number, options?: { skipSeek?: boolean }) => void) | undefined
  updateCurrentScene: (
    previousIndex: number,
    forceTransition?: string,
    onComplete?: () => void,
    isPlaying?: boolean,
    partIndex?: number | null,
    sceneIndex?: number
  ) => void
  renderSceneContentFromManager?: (
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
    }
  ) => void
  renderSubtitlePart?: (
    sceneIndex: number,
    partIndex: number | null,
    options?: {
      skipAnimation?: boolean
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  renderSceneImage?: (
    sceneIndex: number,
    options?: {
      skipAnimation?: boolean
      onComplete?: () => void
    }
  ) => void
}

/**
 * 씬 콘텐츠 렌더링 래퍼 훅
 * - 씬 콘텐츠 렌더링 로직
 * - 같은 씬 내 구간 전환 처리
 * - 다른 씬으로 이동 시 씬 전환 처리
 * - 타임라인 업데이트 및 자막/이미지 렌더링 보장
 */
export function useSceneContentRenderer({
  timeline,
  setTimeline,
  currentSceneIndexRef,
  setCurrentSceneIndex,
  updateCurrentScene,
  renderSceneContentFromManager,
  renderSubtitlePart,
  renderSceneImage,
}: UseSceneContentRendererParams) {
  // 자막과 이미지를 함께 렌더링하는 헬퍼 함수
  const renderImageAndSubtitle = useCallback((
    sceneIndex: number,
    partIndex: number | null | undefined,
    options?: {
      skipAnimation?: boolean
      onComplete?: () => void
    }
  ) => {
    // 이미지 렌더링 (항상 먼저)
    if (renderSceneImage) {
      renderSceneImage(sceneIndex, {
        skipAnimation: options?.skipAnimation ?? true,
      })
    }
    
    // 자막 렌더링
    if (renderSubtitlePart) {
      renderSubtitlePart(sceneIndex, partIndex ?? null, {
        skipAnimation: options?.skipAnimation ?? true,
        onComplete: options?.onComplete,
      })
    } else if (options?.onComplete) {
      options.onComplete()
    }
  }, [renderSceneImage, renderSubtitlePart])

  const renderSceneContent = useCallback((
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
    }
  ) => {
    if (renderSceneContentFromManager) {
      renderSceneContentFromManager(sceneIndex, partIndex, options)
      return
    }
    
    // 같은 씬 내 구간 전환인지 확인
    const isSameSceneTransition = currentSceneIndexRef.current === sceneIndex
    
    // timeline 업데이트 (필요한 경우)
    if (options?.updateTimeline && partIndex !== undefined && partIndex !== null && timeline) {
      const scene = timeline.scenes[sceneIndex]
      if (scene?.text?.content) {
        const originalText = scene.text.content
        if (originalText.includes('|||')) {
          const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
          const partText = scriptParts[partIndex]?.trim()
          
          if (partText && setTimeline && partText !== originalText) {
            setTimeline({
              ...timeline,
              scenes: timeline.scenes.map((s, i) =>
                i === sceneIndex
                  ? { ...s, text: { ...s.text, content: partText } }
                  : s
              ),
            })
          }
        }
      }
    }
    
    // 같은 씬 내 구간 전환: 이미지와 자막 모두 즉시 렌더링
    if (isSameSceneTransition) {
      renderImageAndSubtitle(sceneIndex, partIndex, {
        skipAnimation: true,
        onComplete: options?.onComplete,
      })
      return
    }
    
    // 다른 씬으로 이동: 씬 전환 처리
    if (!isSameSceneTransition && setCurrentSceneIndex && !options?.isPlaying) {
      currentSceneIndexRef.current = sceneIndex
      setCurrentSceneIndex(sceneIndex, { skipSeek: true })
    } else if (!isSameSceneTransition) {
      currentSceneIndexRef.current = sceneIndex
    }
    
    // updateCurrentScene 호출하여 씬 전환
    updateCurrentScene(
      (options?.previousIndex ?? currentSceneIndexRef.current) ?? 0,
      options?.forceTransition || (options?.skipAnimation ? 'none' : undefined),
      () => {
        // 전환 완료 후 이미지와 자막 모두 렌더링 보장
        renderImageAndSubtitle(sceneIndex, partIndex, {
          skipAnimation: true,
          onComplete: options?.onComplete,
        })
      },
      options?.isPlaying ?? false,
      partIndex,
      sceneIndex
    )
  }, [timeline, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, updateCurrentScene, renderSceneContentFromManager, renderImageAndSubtitle])

  return {
    renderSceneContent,
  }
}
