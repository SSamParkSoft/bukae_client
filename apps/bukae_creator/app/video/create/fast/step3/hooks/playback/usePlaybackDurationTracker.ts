'use client'

import { useRef, useEffect } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UsePlaybackDurationTrackerParams {
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
  renderAtRef: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
  transportRendererRef: React.MutableRefObject<{ renderAt: (tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void } | null>
}

/**
 * 씬별 실제 재생 시간(actualPlaybackDuration) 추적을 관리하는 훅
 * - 씬 시작 시간 캐싱 및 계산
 * - 씬 전환 시 actualPlaybackDuration 업데이트
 */
export function usePlaybackDurationTracker({
  timeline,
  setTimeline,
  renderAtRef,
  transportRendererRef,
}: UsePlaybackDurationTrackerParams) {
  // 씬별 실제 재생 시간 추적 (씬 전환 시 actualPlaybackDuration 업데이트)
  const sceneStartTimesRef = useRef<Map<number, number>>(new Map())
  const lastSceneIndexRef = useRef<number>(-1)

  // renderAt을 래핑하여 씬 전환 시 실제 재생 시간 업데이트
  useEffect(() => {
    const currentRenderer = transportRendererRef.current
    if (!currentRenderer?.renderAt) return

    const originalRenderAt = currentRenderer.renderAt
    const wrappedRenderAt = (tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => {
      // 원본 renderAt 호출
      originalRenderAt(tSec, options)
      
      // 성능 최적화: actualPlaybackDuration 업데이트는 씬 전환 시에만 비동기로 실행
      // requestAnimationFrame 핸들러 내부에서 무거운 계산과 setTimeline 호출 방지
      if (timeline && !options?.skipAnimation) {
        // setTimeout으로 지연시켜 requestAnimationFrame 핸들러 블로킹 방지
        setTimeout(() => {
          const currentSceneIndex = lastSceneIndexRef.current
          const previousSceneIndex = sceneStartTimesRef.current.size > 0 
            ? Array.from(sceneStartTimesRef.current.keys()).pop() ?? -1 
            : -1
          
          // 씬이 변경되었을 때만 actualPlaybackDuration 업데이트
          if (previousSceneIndex >= 0 && previousSceneIndex !== currentSceneIndex && previousSceneIndex < timeline.scenes.length) {
            // 이전 씬의 시작 시간 계산 (캐시 사용)
            let previousSceneStartTime = sceneStartTimesRef.current.get(previousSceneIndex)
            if (previousSceneStartTime === undefined) {
              previousSceneStartTime = 0
              for (let i = 0; i < previousSceneIndex; i++) {
                const prevScene = timeline.scenes[i]
                if (prevScene) {
                  const prevDuration = prevScene.actualPlaybackDuration && prevScene.actualPlaybackDuration > 0
                    ? prevScene.actualPlaybackDuration
                    : prevScene.duration || 0
                  previousSceneStartTime += prevDuration
                }
              }
              sceneStartTimesRef.current.set(previousSceneIndex, previousSceneStartTime)
            }
            
            const previousSceneActualDuration = tSec - previousSceneStartTime
            if (previousSceneActualDuration > 0 && previousSceneActualDuration < 1000) {
              const previousScene = timeline.scenes[previousSceneIndex]
              const currentActualDuration = previousScene?.actualPlaybackDuration ?? 0
              
              if (Math.abs(previousSceneActualDuration - currentActualDuration) >= 0.1) {
                const updatedScenes = timeline.scenes.map((scene, idx) =>
                  idx === previousSceneIndex
                    ? { ...scene, actualPlaybackDuration: previousSceneActualDuration }
                    : scene
                )
                setTimeline({
                  ...timeline,
                  scenes: updatedScenes,
                })
              }
            }
          }
        }, 0) // 다음 이벤트 루프에서 실행
      }
    }

    // renderAtRef에 래핑된 함수 저장 (다른 훅에서 추가로 래핑할 수 있도록)
    renderAtRef.current = wrappedRenderAt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, setTimeline, transportRendererRef])

  return {
    sceneStartTimesRef,
    lastSceneIndexRef,
  }
}
