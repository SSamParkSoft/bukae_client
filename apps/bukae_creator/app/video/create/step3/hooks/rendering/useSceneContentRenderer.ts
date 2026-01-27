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
 * - 타임라인 업데이트 및 자막 업데이트
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
      // renderSceneContent를 직접 사용
      renderSceneContentFromManager(sceneIndex, partIndex, options)
      return
    }
    
    // fallback: renderSceneContent가 없는 경우 직접 구현
    {
      
      // 같은 씬 내 구간 전환인지 확인
      const isSameSceneTransition = currentSceneIndexRef.current === sceneIndex
      
      // timeline 업데이트 (필요한 경우)
      if (options?.updateTimeline && partIndex !== undefined && partIndex !== null && timeline) {
        const scene = timeline.scenes[sceneIndex]
        if (scene) {
          const originalText = scene.text?.content || ''
          const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
          const partText = scriptParts[partIndex]?.trim()
          
          if (partText && setTimeline) {
            const updatedTimeline = {
              ...timeline,
              scenes: timeline.scenes.map((s, i) =>
                i === sceneIndex
                  ? {
                      ...s,
                      text: {
                        ...s.text,
                        content: partText,
                      },
                    }
                  : s
              ),
            }
            setTimeline(updatedTimeline)
          }
        }
      }
      
      // 텍스트 객체 업데이트 - renderSubtitlePart 훅 사용
      if (partIndex !== undefined && partIndex !== null && renderSubtitlePart) {
        // 같은 씬 내 구간 전환인 경우: 자막과 이미지 모두 업데이트 (전환 효과 없음)
        if (isSameSceneTransition) {
          // 이미지 렌더링 (이미지가 보이도록 보장)
          if (renderSceneImage) {
            renderSceneImage(sceneIndex, {
              skipAnimation: true,
            })
          }
          // 자막 업데이트
          renderSubtitlePart(sceneIndex, partIndex, {
            skipAnimation: true,
            onComplete: options?.onComplete,
          })
          return
        }
        
        // 다른 씬으로 이동하는 경우: 씬 전환 후 자막 업데이트는 updateCurrentScene 콜백에서 처리
        // 여기서는 자막만 미리 업데이트 (전환 효과는 updateCurrentScene에서 처리)
        renderSubtitlePart(sceneIndex, partIndex, {
          skipAnimation: true,
        })
      }
      
      // 다른 씬으로 이동하는 경우: 씬 전환
      // 재생 중일 때는 setCurrentSceneIndex를 호출하지 않아서 중복 렌더링 방지
      // 타임라인 클릭/드래그 시에는 skipSeek: true로 설정하여 정확한 시간 유지
      if (!isSameSceneTransition && setCurrentSceneIndex && !options?.isPlaying) {
        currentSceneIndexRef.current = sceneIndex
        // renderSceneContent는 씬 전환 시 호출되므로, 타임라인 클릭/드래그가 아닌 경우에만 seek 수행
        // 타임라인 클릭/드래그는 이미 setCurrentTime으로 시간이 설정되었으므로 skipSeek: true
        setCurrentSceneIndex(sceneIndex, { skipSeek: true })
      } else if (!isSameSceneTransition) {
        // 재생 중일 때는 ref만 업데이트
        currentSceneIndexRef.current = sceneIndex
      }
      
      // updateCurrentScene 호출하여 씬 전환
      // skipAnimation 파라미터 제거: forceTransition === 'none'으로 처리
      updateCurrentScene(
        (options?.previousIndex !== undefined ? options.previousIndex : currentSceneIndexRef.current) ?? 0,
        options?.forceTransition || (options?.skipAnimation ? 'none' : undefined),
        () => {
          // 전환 완료 후 구간 텍스트가 올바르게 표시되었는지 확인
          if (partIndex !== undefined && partIndex !== null && renderSubtitlePart) {
            // renderSubtitlePart를 호출하여 텍스트 업데이트
            renderSubtitlePart(sceneIndex, partIndex, {
              skipAnimation: true,
              onComplete: options?.onComplete,
            })
            return
          }
          if (options?.onComplete) {
            options.onComplete()
          }
        },
        options?.isPlaying ?? false, // isPlaying 옵션 전달
        partIndex, // partIndex 전달
        sceneIndex // sceneIndex 전달
      )
    }
  }, [timeline, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, updateCurrentScene, renderSceneContentFromManager, renderSubtitlePart, renderSceneImage])

  return {
    renderSceneContent,
  }
}
