'use client'

import { useEffect, useMemo } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { useTransport } from '@/hooks/video/transport/useTransport'

type UseTransportReturnType = ReturnType<typeof useTransport>

interface UseTimelineChangeHandlerParams {
  timeline: TimelineData | null
  renderAtRef: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
  pixiReady: boolean
  isPlaying: boolean
  transport: UseTransportReturnType
}

export function useTimelineChangeHandler({
  timeline,
  renderAtRef,
  pixiReady,
  isPlaying,
  transport,
}: UseTimelineChangeHandlerParams) {
  // timeline의 motion/transition 변경 감지 및 렌더링 업데이트
  // ANIMATION.md 표준: renderAt은 Transport 루프에서만 호출되어야 하지만,
  // timeline 변경 시에는 현재 시간에서 즉시 렌더링하여 변경사항 반영
  const timelineMotionTransitionKey = useMemo(() => {
    if (!timeline || !timeline.scenes) return ''
    return timeline.scenes.map((scene, idx) => {
      const motionKey = scene.motion 
        ? `${scene.motion.type}-${scene.motion.startSecInScene}-${scene.motion.durationSec}-${scene.motion.easing}`
        : 'none'
      const transitionKey = scene.transition || 'none'
      return `${idx}:motion:${motionKey}:transition:${transitionKey}`
    }).join('|')
  }, [timeline])

  useEffect(() => {
    // timeline이 준비되지 않았거나 renderAt이 설정되지 않았으면 스킵
    if (!timeline || !renderAtRef.current || !pixiReady) return
    
    // 재생 중이 아닐 때만 수동 렌더링 (재생 중에는 Transport 루프가 자동으로 처리)
    if (!isPlaying) {
      const currentTime = transport.currentTime
      // timeline 변경 시 현재 시간에서 렌더링하여 변경사항 반영
      renderAtRef.current(currentTime, { skipAnimation: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineMotionTransitionKey, pixiReady, isPlaying])
}
