'use client'

import { useRef, useEffect, useMemo, useCallback } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { useTransport } from '@/hooks/video/transport/useTransport'
import { useTtsTrack } from '@/hooks/video/audio/useTtsTrack'
import { calculateTotalDuration } from '@/utils/timeline'
import { buildSceneMarkup } from '@/lib/utils/tts'
import type { MakeTtsKeyFunction } from '@/lib/utils/tts'

interface UseTransportTtsIntegrationParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: MakeTtsKeyFunction
}

export function useTransportTtsIntegration({
  timeline,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: UseTransportTtsIntegrationParams) {
  // TTS 캐시 ref를 먼저 생성 (useTransport와 useTtsManager에서 공유)
  const ttsCacheRefShared = useRef(
    new Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>()
  )

  // PHASE0: Transport 및 TtsTrack 통합
  const transport = useTransport()
  
  // 클라이언트에서만 audioContext 가져오기 (서버에서는 undefined)
  const audioContext = typeof window !== 'undefined' && transport.transport 
    ? transport.getAudioContext() 
    : undefined
  
  // Transport를 ref로 저장하여 안정적인 참조 유지
  const transportRef = useRef(transport)
  useEffect(() => {
    transportRef.current = transport
  }, [transport])
  
  // TTS 세그먼트 종료 콜백 (renderAtRef가 설정된 후 업데이트됨)
  const onSegmentEndRef = useRef<((segmentEndTime: number, sceneIndex: number) => void) | null>(null)
  // TTS 세그먼트 시작 콜백 (renderAtRef가 설정된 후 업데이트됨)
  const onSegmentStartRef = useRef<((segmentStartTime: number, sceneIndex: number) => void) | null>(null)
  
  // buildSceneMarkupWithTimeline을 먼저 선언
  const buildSceneMarkupWithTimeline = useCallback(
    (timelineParam: TimelineData | null, sceneIndex: number) => buildSceneMarkup(timelineParam, sceneIndex),
    [buildSceneMarkup]
  ) as (timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number; voiceTemplate?: string | null; text?: { content?: string } }> } | null, sceneIndex: number) => string[]
  
  const ttsTrack = useTtsTrack({
    timeline,
    voiceTemplate,
    ttsCacheRef: ttsCacheRefShared,
    audioContext: audioContext as AudioContext | undefined,
    transportTime: transport.currentTime,
    buildSceneMarkup: buildSceneMarkupWithTimeline,
    makeTtsKey,
    // TTS 세그먼트 시작 시 즉시 렌더링 업데이트 (TTS와 씬 전환 동기화)
    onSegmentStart: useCallback((segmentStartTime: number, sceneIndex: number) => {
      const callback = onSegmentStartRef.current
      if (callback) {
        callback(segmentStartTime, sceneIndex)
      }
    }, []),
    // TTS 세그먼트 종료 시 즉시 렌더링 업데이트 (실제로는 호출하지 않음 - Transport 렌더링 루프에 맡김)
    onSegmentEnd: useCallback((_segmentEndTime: number, _sceneIndex: number) => {
      const callback = onSegmentEndRef.current
      if (callback) {
        // 매개변수는 타입 호환성을 위해 전달하지만 실제로는 사용하지 않음
        callback(_segmentEndTime, _sceneIndex)
      }
    }, []),
  })

  // totalDuration 계산 (Transport에 설정)
  const calculatedTotalDuration = useMemo(() => {
    if (!timeline) return 0
    return calculateTotalDuration(timeline, {
      ttsCacheRef: ttsCacheRefShared,
      voiceTemplate,
      buildSceneMarkup: buildSceneMarkupWithTimeline,
      makeTtsKey,
    })
  }, [timeline, voiceTemplate, buildSceneMarkupWithTimeline, makeTtsKey])

  // Transport에 totalDuration 설정
  useEffect(() => {
    transport.setTotalDuration(calculatedTotalDuration)
  }, [transport, calculatedTotalDuration])

  // renderAt ref (Transport 렌더러에서 설정됨)
  const renderAtRef = useRef<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>(undefined)
  
  // TTS duration 변경 시 렌더링 즉시 업데이트를 위한 콜백 ref
  const onDurationChangeRef = useRef<((sceneIndex: number, durationSec: number) => void) | undefined>(undefined)

  return {
    transport,
    ttsTrack,
    audioContext,
    calculatedTotalDuration,
    renderAtRef,
    onDurationChangeRef,
    buildSceneMarkupWrapper: buildSceneMarkupWithTimeline,
    ttsCacheRefShared,
    onSegmentStartRef,
    onSegmentEndRef,
    transportRef,
  }
}
