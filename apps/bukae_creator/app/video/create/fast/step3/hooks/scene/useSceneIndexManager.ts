'use client'

import { useEffect, useState } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { calculateSceneIndexFromTime } from '@/utils/timeline'
import { getPreviousSegmentEndTime } from '@/utils/timeline'

interface UseSceneIndexManagerParams {
  // Timeline and TTS
  timeline: TimelineData | null
  ttsTrack: ReturnType<typeof import('@/hooks/video/audio/useTtsTrack').useTtsTrack>
  transport: ReturnType<typeof import('@/hooks/video/transport/useTransport').useTransport>
  isPlaying: boolean
  
  // Refs
  currentSceneIndexRef: React.MutableRefObject<number>
}

export function useSceneIndexManager({
  timeline,
  ttsTrack,
  transport,
  isPlaying,
  currentSceneIndexRef,
}: UseSceneIndexManagerParams) {
  // currentSceneIndex를 상태로 관리하여 씬 카드 클릭 시 수동 선택을 추적
  // 재생 중일 때는 계산된 값을 사용, 재생 중이 아닐 때는 수동 선택을 우선
  const [manualSceneIndex, setManualSceneIndex] = useState<number | null>(null)
  
  // 실제 재생 중일 때만 TTS 세그먼트를 사용하고,
  // 그 외에는 timeline 시간 기반 계산을 사용합니다.
  // (보이스 일괄 변경 직후 임시 0초 세그먼트가 있을 때 마지막 씬으로 튀는 현상 방지)
  const calculatedSceneIndex = (() => {
    if (!timeline) {
      return 0
    }

    if (isPlaying && ttsTrack.getActiveSegment) {
      const activeSegment = ttsTrack.getActiveSegment(transport.currentTime)
      if (activeSegment?.segment.sceneIndex !== undefined) {
        return activeSegment.segment.sceneIndex
      }
    }

    return calculateSceneIndexFromTime(timeline, transport.currentTime)
  })()
  
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
