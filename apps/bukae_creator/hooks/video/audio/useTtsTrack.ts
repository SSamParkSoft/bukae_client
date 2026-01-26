/**
 * useTtsTrack - TtsTrack React 훅
 * 
 * TtsTrack 인스턴스를 React 컴포넌트에서 사용하기 위한 훅입니다.
 * Timeline과 TTS 캐시를 기반으로 세그먼트 테이블을 자동 생성하고 관리합니다.
 */

'use client'

import { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useSyncExternalStore } from 'react'
import { TtsTrack } from './TtsTrack'
import type { TtsSegment, TtsTrackState } from './types'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseTtsTrackParams {
  /** 타임라인 데이터 */
  timeline: TimelineData | null
  /** 음성 템플릿 */
  voiceTemplate: string | null
  /** TTS 캐시 ref */
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup?: string; url?: string | null }>>
  /** AudioContext (Transport에서 가져옴) */
  audioContext: AudioContext | undefined
  /** Transport의 현재 시간 (초) */
  transportTime: number
  /** 씬 마크업 생성 함수 */
  buildSceneMarkup: (timeline: TimelineData, sceneIndex: number) => string[]
  /** TTS 키 생성 함수 */
  makeTtsKey: (voiceName: string, markup: string) => string
  /** 세그먼트 종료 시 렌더링 업데이트 콜백 (선택사항) */
  onSegmentEnd?: (segmentEndTime: number, sceneIndex: number) => void
  /** 세그먼트 시작 시 렌더링 업데이트 콜백 (선택사항) */
  onSegmentStart?: (segmentStartTime: number, sceneIndex: number) => void
}

/**
 * Timeline과 TTS 캐시로부터 세그먼트 테이블 생성
 */
function buildSegmentsFromTimeline(
  timeline: TimelineData,
  voiceTemplate: string,
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup?: string; url?: string | null }>>,
  buildSceneMarkup: (timeline: TimelineData, sceneIndex: number) => string[],
  makeTtsKey: (voiceName: string, markup: string) => string
): TtsSegment[] {
  const segments: TtsSegment[] = []
  let accumulatedTime = 0

  for (let sceneIndex = 0; sceneIndex < timeline.scenes.length; sceneIndex++) {
    const scene = timeline.scenes[sceneIndex]
    const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate

    if (!sceneVoiceTemplate) {
      continue
    }

    // 씬의 마크업 생성
    const markups = buildSceneMarkup(timeline, sceneIndex)

    for (let partIndex = 0; partIndex < markups.length; partIndex++) {
      const markup = markups[partIndex]
      if (!markup) continue

      const key = makeTtsKey(sceneVoiceTemplate, markup)
      const cached = ttsCacheRef.current.get(key)

      // 세그먼트 생성 (캐시가 없어도 생성하여 part 인식 가능하도록)
      const segmentId = `scene-${sceneIndex}-part-${partIndex}`
      
      if (!cached) {
        // 캐시에 없으면 임시 세그먼트 생성 (durationSec은 0으로 설정)
        // 나중에 TTS 파일이 생성되면 업데이트됨
        const segment: TtsSegment = {
          id: segmentId,
          url: '', // TTS 파일이 없으므로 빈 문자열로 설정
          startSec: accumulatedTime,
          durationSec: 0, // 임시로 0 설정
          sceneId: scene.sceneId,
          sceneIndex,
          partIndex,
          markup,
        }
        segments.push(segment)
        // durationSec이 0이므로 accumulatedTime은 증가하지 않음
        continue
      }

      // 캐시가 있으면 정상 세그먼트 생성
      // Supabase URL을 직접 사용하여 네트워크 요청이 발생하도록 함
      // cached.url이 없으면 에러 (서버 액션에서 항상 URL을 반환해야 함)
      if (!cached.url) {
        // URL이 없으면 빈 문자열로 설정하여 preload에서 건너뛰도록 함
        const segment: TtsSegment = {
          id: segmentId,
          url: '',
          startSec: accumulatedTime,
          durationSec: cached.durationSec || 0,
          sceneId: scene.sceneId,
          sceneIndex,
          partIndex,
          markup: cached.markup || markup,
        }
        segments.push(segment)
        accumulatedTime += cached.durationSec || 0
        continue
      }
      const segment: TtsSegment = {
        id: segmentId,
        url: cached.url, // Supabase URL 직접 사용 (네트워크 요청 발생)
        startSec: accumulatedTime,
        durationSec: cached.durationSec,
        sceneId: scene.sceneId,
        sceneIndex,
        partIndex,
        markup: cached.markup || markup,
      }

      segments.push(segment)
      accumulatedTime += cached.durationSec
    }
  }

  return segments
}

/**
 * TtsTrack 훅
 */
export function useTtsTrack({
  timeline,
  voiceTemplate,
  ttsCacheRef,
  audioContext,
  transportTime,
  buildSceneMarkup,
  makeTtsKey,
  onSegmentEnd,
  onSegmentStart,
}: UseTtsTrackParams) {
  const ttsTrackRef = useRef<TtsTrack | null>(null)
  // 클라이언트 마운트 확인 (useState 초기값으로 처리)
  const [isClient] = useState(() => typeof window !== 'undefined')
  
  // TtsTrack 인스턴스 생성 (클라이언트에서만, 한 번만)
  useEffect(() => {
    if (ttsTrackRef.current === null && audioContext && isClient) {
      ttsTrackRef.current = new TtsTrack(audioContext)
    }
  }, [audioContext, isClient])
  
  // 세그먼트 종료 콜백 설정
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current
    if (currentTtsTrack && onSegmentEnd) {
      currentTtsTrack.setOnSegmentEnd(onSegmentEnd)
    } else if (currentTtsTrack) {
      currentTtsTrack.setOnSegmentEnd(null)
    }
  }, [onSegmentEnd])

  // 세그먼트 시작 콜백 설정
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current
    if (currentTtsTrack && onSegmentStart) {
      currentTtsTrack.setOnSegmentStart(onSegmentStart)
    } else if (currentTtsTrack) {
      currentTtsTrack.setOnSegmentStart(null)
    }
  }, [onSegmentStart])

  // Timeline과 TTS 캐시로부터 세그먼트 테이블 생성
  // 폴링 방식 제거: TTS 파일 생성 완료 시점에만 업데이트하도록 변경
  const [cacheUpdateTrigger, setCacheUpdateTrigger] = useState(0)
  const refreshResolversRef = useRef<Set<() => void>>(new Set()) // refreshSegments 완료를 기다리는 resolver들
  
  // TTS 캐시가 업데이트되었을 때 세그먼트를 강제로 재계산하기 위한 트리거
  // Promise를 반환하여 segments 업데이트 및 preload 완료를 기다릴 수 있음
  const refreshSegments = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // segments 업데이트 후 preload 완료를 기다리기 위해 resolver 저장
      refreshResolversRef.current.add(resolve)
      
      // cacheUpdateTrigger를 증가시켜 segments useMemo를 재계산
      setCacheUpdateTrigger(prev => prev + 1)
    })
  }, [])
  
  // 세그먼트 계산: ref 접근을 피하기 위해 useState와 useEffect 사용
  // cacheUpdateTrigger가 변경될 때 재계산하여 최신 캐시 내용을 반영
  // 외부 시스템(TTS 캐시)과 동기화하는 경우이므로 useEffect에서 setState 사용이 적절함
  const [segments, setSegments] = useState<TtsSegment[]>([])
  
  // 외부 시스템(TTS 캐시) 상태 변화에 반응하여 state 업데이트 (일반적인 패턴)
  // 외부 시스템과 동기화하는 경우이므로 useEffect에서 setState 사용이 적절함
  // React Compiler 경고: 외부 시스템 동기화를 위한 정당한 사용이므로 무시 가능
  useEffect(() => {
    if (!timeline || !voiceTemplate || !isClient) {
      setSegments([])
      return
    }

    // useEffect 내부에서 ref 접근 (허용됨)
    const newSegments = buildSegmentsFromTimeline(timeline, voiceTemplate, ttsCacheRef, buildSceneMarkup, makeTtsKey)
    setSegments(newSegments)
    
    // 디버깅: segments에 URL이 포함되어 있는지 확인
    if (newSegments.length > 0) {
      const segmentsWithUrl = newSegments.filter(seg => seg.url && seg.url.trim() !== '')
      if (segmentsWithUrl.length === 0) {
        console.warn('[useTtsTrack] segments에 URL이 없습니다. TTS 캐시를 확인하세요.', {
          totalSegments: newSegments.length,
          cacheSize: ttsCacheRef.current.size,
          firstSegment: newSegments[0],
        })
      }
    }
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, isClient, cacheUpdateTrigger])

  // 세그먼트 테이블이 변경되면 TtsTrack에 반영 (항상 호출되어야 함)
  // segments 배열의 참조가 변경되지 않았으면 스킵 (무한 루프 방지)
  const lastPreloadSegmentsKeyRef = useRef<string>('')
  const preloadPromiseRef = useRef<Promise<void> | null>(null)
  
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current
    if (!currentTtsTrack) {
      return
    }

    // segments가 비어있으면 스킵 (초기화 중일 수 있음)
    if (segments.length === 0) {
      if (lastPreloadSegmentsKeyRef.current !== '') {
        // 이전에 세그먼트가 있었는데 지금 비어있으면 정리
        lastPreloadSegmentsKeyRef.current = ''
        preloadPromiseRef.current = null
      }
      return
    }

    // segments 배열의 실제 내용이 변경되었는지 확인 (키 기반 비교)
    // URL도 포함하여 TTS 파일이 생성되어 URL이 변경되었을 때도 감지
    const segmentsKey = segments.map(seg => 
      `${seg.id}:${seg.startSec}:${seg.durationSec}:${seg.url || ''}`
    ).join('|')

    if (segmentsKey === lastPreloadSegmentsKeyRef.current) {
      return // 변경사항 없음 (무한 루프 방지)
    }

    // 세그먼트 업데이트 (비동기 로딩)
    lastPreloadSegmentsKeyRef.current = segmentsKey
    const preloadPromise = currentTtsTrack.preload(segments)
    preloadPromiseRef.current = preloadPromise
      .then(() => {
        // preload 완료 후 refreshSegments를 기다리는 모든 resolver 호출
        refreshResolversRef.current.forEach(resolve => resolve())
        refreshResolversRef.current.clear()
      })
      .catch(error => {
        // 에러 발생 시에도 resolver 호출 (에러를 전파하지 않음)
        refreshResolversRef.current.forEach(resolve => resolve())
        refreshResolversRef.current.clear()
        // 에러는 로그만 남기고 전파하지 않음 (다른 세그먼트는 계속 재생 가능)
        console.error('[useTtsTrack] preload 실패:', error)
      })
  }, [segments])
  
  // preload 완료를 기다리는 함수 추가
  const waitForPreload = useCallback(async (): Promise<void> => {
    // segments가 업데이트되고 preload가 시작될 때까지 대기
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // preload가 완료될 때까지 대기 (최대 2초)
    let retries = 0
    const maxRetries = 40 // 40 * 50ms = 2초
    while (retries < maxRetries) {
      if (preloadPromiseRef.current) {
        try {
          await preloadPromiseRef.current
          return
        } catch {
          return
        }
      }
      await new Promise(resolve => setTimeout(resolve, 50))
      retries++
    }
  }, [])

  // 컴포넌트 언마운트 시 정리 (항상 호출되어야 함)
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current
    return () => {
      if (currentTtsTrack) {
        currentTtsTrack.dispose()
      }
    }
  }, [])

  // 상태 구독 (메모이제이션된 getSnapshot 사용)
  // useSyncExternalStore의 getSnapshot은 같은 값이면 같은 참조를 반환해야 함
  const stateRef = useRef<TtsTrackState | null>(null)
  const dummyState = useMemo<TtsTrackState>(() => ({
    segments: [],
    loadingCount: 0,
    activeSegmentIndex: null,
  }), [])
  
  const getSnapshot = useCallback(() => {
    const currentTtsTrack = ttsTrackRef.current
    if (!currentTtsTrack) {
      return dummyState
    }
    const newState = currentTtsTrack.getState()
    // 이전 상태와 비교하여 변경되지 않았으면 이전 참조 반환
    if (stateRef.current && 
        stateRef.current.segments.length === newState.segments.length &&
        stateRef.current.loadingCount === newState.loadingCount &&
        stateRef.current.activeSegmentIndex === newState.activeSegmentIndex) {
      // segments 배열 비교 (참조 비교로 충분 - TtsTrack이 새 배열을 반환하지 않으면)
      let segmentsEqual = true
      if (stateRef.current.segments.length === newState.segments.length) {
        for (let i = 0; i < stateRef.current.segments.length; i++) {
          if (stateRef.current.segments[i].id !== newState.segments[i].id ||
              stateRef.current.segments[i].startSec !== newState.segments[i].startSec ||
              stateRef.current.segments[i].durationSec !== newState.segments[i].durationSec) {
            segmentsEqual = false
            break
          }
        }
      } else {
        segmentsEqual = false
      }
      
      if (segmentsEqual) {
        return stateRef.current
      }
    }
    stateRef.current = newState
    return newState
  }, [dummyState])
  
  const getServerSnapshot = useCallback(() => {
    // 서버에서는 더미 상태 반환
    if (!stateRef.current) {
      stateRef.current = dummyState
    }
    return stateRef.current
  }, [dummyState])

  const state = useSyncExternalStore(
    (onStoreChange) => {
      // 간단한 구독 (실제로는 Transport 시간 변경 시 업데이트)
      const interval = setInterval(() => {
        onStoreChange()
      }, 100) // 100ms마다 체크

      return () => {
        clearInterval(interval)
      }
    },
    getSnapshot,
    getServerSnapshot
  )

  // 제어 함수들 (항상 호출되어야 함)
  const playFrom = useCallback((tSec: number, transportAudioCtxTimeSec: number) => {
    ttsTrackRef.current?.playFrom(tSec, transportAudioCtxTimeSec)
  }, [])

  const stopAll = useCallback(() => {
    ttsTrackRef.current?.stopAll()
  }, [])

  const getActiveSegment = useCallback((tSec: number) => {
    return ttsTrackRef.current?.getActiveSegment(tSec) ?? null
  }, [])

  const updateSegments = useCallback((updatedSegments: TtsSegment[], currentT?: number) => {
    ttsTrackRef.current?.updateSegments(updatedSegments, currentT ?? transportTime)
  }, [transportTime])

  const replaceSceneSegments = useCallback((sceneIndex: number, newSegments: TtsSegment[], currentT?: number) => {
    ttsTrackRef.current?.replaceSceneSegments(sceneIndex, newSegments, currentT ?? transportTime)
  }, [transportTime])

  // Transport 시간이 변경되면 자동으로 재생 위치 업데이트 (재생 중일 때)
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current
    if (!currentTtsTrack) return
    // 재생 중이 아니면 무시
    if (state.activeSegmentIndex === null) {
      return
    }

    // Transport 시간에 맞춰 세그먼트 확인
    const active = currentTtsTrack.getActiveSegment(transportTime)
    if (active) {
      // 세그먼트가 변경되었으면 재스케줄 (필요시)
      // 실제로는 Transport가 재생을 제어하므로 여기서는 모니터링만
    }
  }, [transportTime, state.activeSegmentIndex])

  // 항상 같은 구조로 반환 (조건부 early return 제거)
  return {
    // 상태
    segments: segments, // useMemo 결과 사용
    loadingCount: state.loadingCount,
    activeSegmentIndex: state.activeSegmentIndex,

    // 제어 함수
    playFrom,
    stopAll,
    getActiveSegment,
    updateSegments,
    replaceSceneSegments,
    refreshSegments, // TTS 캐시 업데이트 후 세그먼트 강제 재계산
    waitForPreload, // preload 완료를 기다리는 함수

    // TtsTrack 인스턴스 (고급 사용)
    // ref는 render 중 접근하지 않으므로 함수로 반환
    getTtsTrack: () => ttsTrackRef.current,
  }
}
