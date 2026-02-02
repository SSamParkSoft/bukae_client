'use client'

import { useEffect, useState } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { calculateSceneIndexFromTime } from '@/utils/timeline'
import { calculateSceneFromTime } from '@/utils/timeline-render'
import { getSceneStartTime, getPreviousSegmentEndTime } from '@/utils/timeline'
import type { MakeTtsKeyFunction } from '@/lib/utils/tts'

interface UseSceneIndexManagerParams {
  // Timeline and TTS
  timeline: TimelineData | null
  ttsTrack: ReturnType<typeof import('@/hooks/video/audio/useTtsTrack').useTtsTrack>
  transport: ReturnType<typeof import('@/hooks/video/transport/useTransport').useTransport>
  isPlaying: boolean
  
  // Refs
  renderAtRef: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
  ttsCacheRefShared: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  voiceTemplate: string | null
  buildSceneMarkupWithTimeline: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: MakeTtsKeyFunction
  currentSceneIndexRef: React.MutableRefObject<number>
}

export function useSceneIndexManager({
  timeline,
  ttsTrack,
  transport,
  isPlaying,
  renderAtRef,
  ttsCacheRefShared,
  voiceTemplate,
  buildSceneMarkupWithTimeline,
  makeTtsKey,
  currentSceneIndexRef,
}: UseSceneIndexManagerParams) {
  // currentSceneIndex를 상태로 관리하여 씬 카드 클릭 시 수동 선택을 추적
  // 재생 중일 때는 계산된 값을 사용, 재생 중이 아닐 때는 수동 선택을 우선
  const [manualSceneIndex, setManualSceneIndex] = useState<number | null>(null)
  
  // 렌더링과 동일한 조건 사용: segmentChanged 감지 (TTS 파일 전환 시 즉시 업데이트)
  // getActiveSegment를 사용해서 실제 TTS 파일 전환 시 하이라이트도 즉시 업데이트
  const calculatedSceneIndex = timeline && ttsTrack.getActiveSegment
    ? (() => {
        // TTS 세그먼트에서 씬 인덱스 가져오기 (TTS 파일 전환 시 즉시 반영)
        const activeSegment = ttsTrack.getActiveSegment(transport.currentTime)
        if (activeSegment && activeSegment.segment.sceneIndex !== undefined) {
          return activeSegment.segment.sceneIndex
        }
        // fallback: calculateSceneFromTime 사용
        if (renderAtRef.current) {
          const calculated = calculateSceneFromTime(
            timeline,
            transport.currentTime,
            {
              ttsCacheRef: ttsCacheRefShared,
              voiceTemplate,
              buildSceneMarkup: buildSceneMarkupWithTimeline,
              makeTtsKey,
            }
          )
          return calculated.sceneIndex
        }
        return calculateSceneIndexFromTime(timeline, transport.currentTime)
      })()
    : (timeline ? calculateSceneIndexFromTime(timeline, transport.currentTime) : 0)
  
  // 재생 중일 때는 계산된 값 사용, 재생 중이 아닐 때는 수동 선택 우선
  const currentSceneIndex = isPlaying 
    ? calculatedSceneIndex 
    : (manualSceneIndex !== null ? manualSceneIndex : calculatedSceneIndex)
  
  const setCurrentSceneIndex = (index: number, options?: { skipSeek?: boolean }) => { 
    currentSceneIndexRef.current = index
    setManualSceneIndex(index) // 수동 선택 상태 업데이트
    // Transport seek: 이전 세그먼트 끝 시점으로 이동 (선택된 씬의 전환효과부터 시작)
    // 단, skipSeek 옵션이 true이면 seek하지 않음 (타임라인 클릭 시 정확한 시간 유지)
    if (!options?.skipSeek && timeline) {
      const seekTime = getPreviousSegmentEndTime(timeline, index, ttsTrack.segments || [])
      transport.seek(seekTime)
    }
  }
  
  // 재생 중일 때는 계산된 값으로 currentSceneIndexRef 동기화
  useEffect(() => {
    if (isPlaying && calculatedSceneIndex !== currentSceneIndexRef.current) {
      currentSceneIndexRef.current = calculatedSceneIndex
    }
  }, [isPlaying, calculatedSceneIndex, currentSceneIndexRef])

  return {
    currentSceneIndex,
    setCurrentSceneIndex,
    calculatedSceneIndex,
    manualSceneIndex,
  }
}
