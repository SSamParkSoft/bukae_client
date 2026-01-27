/**
 * useTransport - Transport React 훅
 * 
 * Transport 인스턴스를 React 컴포넌트에서 사용하기 위한 훅입니다.
 * useSyncExternalStore를 사용하여 Transport 상태를 구독합니다.
 */

'use client'

import { useSyncExternalStore, useRef, useEffect, useCallback } from 'react'
import { Transport } from './Transport'
import type { TransportState } from './types'

/**
 * Transport 인스턴스를 생성하고 관리하는 훅
 * 
 * @param audioContext 기존 AudioContext (선택사항, 없으면 새로 생성)
 * @returns Transport 인스턴스 및 제어 함수
 */
export function useTransport(audioContext?: AudioContext) {
  const transportRef = useRef<Transport | null>(null)

  // 클라이언트 마운트 확인 및 Transport 인스턴스 생성
  useEffect(() => {
    // Transport 인스턴스 생성 (클라이언트에서만, 한 번만)
    // audioContext는 ref로 저장하여 dependency 문제 방지
    if (transportRef.current === null && typeof window !== 'undefined') {
      transportRef.current = new Transport(audioContext)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // audioContext는 dependency에서 제외 (한 번만 생성)

  const transport = transportRef.current

  // 서버 사이드 또는 클라이언트 마운트 전에는 더미 값 반환
  const dummyState: TransportState = {
    isPlaying: false,
    timelineOffsetSec: 0,
    audioCtxStartSec: 0,
    playbackRate: 1.0,
    totalDuration: 0,
  }

  // 컴포넌트 언마운트 시 정리 (항상 호출되어야 함)
  useEffect(() => {
    if (!transport) return
    return () => {
      transport.dispose()
    }
  }, [transport])

  // useSyncExternalStore로 시간 구독
  // getSnapshot은 항상 같은 값이면 같은 참조를 반환해야 함
  // primitive 값 대신 객체로 래핑하여 같은 값이면 같은 객체 참조 반환
  const lastTimeSnapshotRef = useRef<{ value: number }>({ value: 0 })
  const transportRefForTime = useRef(transport)
  
  // transport ref 업데이트
  useEffect(() => {
    transportRefForTime.current = transport
  }, [transport])
  
  // getCurrentTimeSnapshot을 안정적인 참조로 캐싱 (transport 변경 시에도 같은 함수 참조 유지)
  // useCallback을 사용하여 함수 참조를 안정적으로 유지
  // 성능 최적화: 더 큰 시간 간격(200ms)으로 업데이트하여 과도한 렌더링 방지
  const lastSnapshotTimeRef = useRef<number>(0)
  const lastSnapshotUpdateTimeRef = useRef<number>(0)
  const getCurrentTimeSnapshot = useCallback(() => {
    const currentTransport = transportRefForTime.current
    if (!currentTransport) {
      // transport가 없으면 기본값 반환 (항상 같은 객체 참조)
      if (lastTimeSnapshotRef.current.value !== 0) {
        lastTimeSnapshotRef.current = { value: 0 }
      }
      return lastTimeSnapshotRef.current
    }
    
    // 성능 최적화: 마지막 업데이트로부터 200ms가 지나지 않았으면 이전 값 반환
    const now = performance.now()
    const timeSinceLastUpdate = now - lastSnapshotUpdateTimeRef.current
    if (timeSinceLastUpdate < 200) {
      return lastTimeSnapshotRef.current
    }
    
    const newTime = currentTransport.getTime()
    
    // 소수점 1자리까지 반올림하여 안정적인 값 반환 (약 100ms 단위)
    const roundedTime = Math.round(newTime * 10) / 10
    
    // 값이 변경되지 않았으면 이전 객체 참조 반환 (같은 참조 유지)
    if (roundedTime === lastTimeSnapshotRef.current.value) {
      lastSnapshotUpdateTimeRef.current = now
      return lastTimeSnapshotRef.current
    }
    
    // 값이 변경되었으면 새 객체 생성 및 반환
    lastSnapshotTimeRef.current = newTime
    lastTimeSnapshotRef.current = { value: roundedTime }
    lastSnapshotUpdateTimeRef.current = now
    return lastTimeSnapshotRef.current
  }, []) // 의존성 배열 비움 - transport는 ref로 접근
  
  // 서버 스냅샷 함수 (useSyncExternalStore의 필수 인자)
  // 
  // 스냅샷이란? 외부 스토어(Transport)의 현재 상태를 읽은 값
  // 
  // 왜 필요한가?
  // 1. 서버 렌더링 시: 브라우저 API(AudioContext)가 없어 getSnapshot을 호출할 수 없음
  // 2. 하이드레이션 시: 서버와 클라이언트의 초기 렌더 결과가 일치해야 함
  // 
  // 현재 상황: 'use client' 지시어로 클라이언트 전용이지만,
  // React 18의 useSyncExternalStore는 세 번째 인자를 필수로 요구함
  const serverTimeSnapshotRef = useRef<{ value: number }>({ value: 0 })
  const getServerTimeSnapshot = useCallback(() => {
    // 서버에서는 항상 초기값(0) 반환
    // 클라이언트에서는 getCurrentTimeSnapshot이 실제로 사용됨
    return serverTimeSnapshotRef.current
  }, [])
  
  const currentTimeSnapshot = useSyncExternalStore(
    (onStoreChange) => {
      const currentTransport = transportRefForTime.current
      if (!currentTransport) {
        return () => {} // 더미 구독 함수
      }
      // skipImmediate=true로 설정하여 즉시 콜백 호출 방지 (무한 루프 방지)
      // useSyncExternalStore는 자체적으로 초기 스냅샷을 가져오므로 즉시 콜백이 필요 없음
      return currentTransport.subscribe(() => {
        onStoreChange()
      }, true)
    },
    getCurrentTimeSnapshot,
    getServerTimeSnapshot
  )
  
  // 객체에서 값 추출
  const currentTime = currentTimeSnapshot.value

  // 상태 구독 (메모이제이션된 getSnapshot 사용)
  // useSyncExternalStore의 getSnapshot은 같은 값이면 같은 참조를 반환해야 함
  const stateRef = useRef<TransportState | null>(null)
  const transportRefForState = useRef(transport)
  const dummyStateRef = useRef(dummyState)
  
  // transport ref 업데이트
  useEffect(() => {
    transportRefForState.current = transport
  }, [transport])
  
  // getSnapshot을 안정적인 참조로 캐싱 (transport 변경 시에도 같은 함수 참조 유지)
  const getSnapshot = useCallback(() => {
    const currentTransport = transportRefForState.current
    if (!currentTransport) {
      // transport가 없으면 기본 상태 반환 (항상 같은 참조)
      if (!stateRef.current) {
        stateRef.current = dummyStateRef.current
      }
      return stateRef.current
    }
    const newState = currentTransport.getState()
    // 이전 상태와 비교하여 변경되지 않았으면 이전 참조 반환
    if (stateRef.current && 
        stateRef.current.isPlaying === newState.isPlaying &&
        stateRef.current.timelineOffsetSec === newState.timelineOffsetSec &&
        stateRef.current.audioCtxStartSec === newState.audioCtxStartSec &&
        stateRef.current.playbackRate === newState.playbackRate &&
        stateRef.current.totalDuration === newState.totalDuration) {
      return stateRef.current
    }
    stateRef.current = newState
    return newState
  }, []) // 의존성 배열 비움 - transport는 ref로 접근
  
  // 서버 스냅샷 함수 (useSyncExternalStore의 필수 인자)
  // Transport 상태의 서버 렌더링용 초기값 제공
  const getServerSnapshot = useCallback(() => {
    // 서버에서는 더미 상태(초기값) 반환
    // 클라이언트에서는 getSnapshot이 실제로 사용됨
    if (!stateRef.current) {
      stateRef.current = dummyStateRef.current
    }
    return stateRef.current
  }, [])

  const state = useSyncExternalStore(
    (onStoreChange) => {
      const currentTransport = transportRefForState.current
      if (!currentTransport) {
        return () => {} // 더미 구독 함수
      }
      // skipImmediate=true로 설정하여 즉시 콜백 호출 방지 (무한 루프 방지)
      return currentTransport.subscribe(() => {
        onStoreChange()
      }, true)
    },
    getSnapshot,
    getServerSnapshot
  )

  // 제어 함수들 (항상 호출되어야 함)
  const play = useCallback(() => {
    transport?.play()
  }, [transport])

  const pause = useCallback(() => {
    transport?.pause()
  }, [transport])

  const seek = useCallback((tSec: number) => {
    transport?.seek(tSec)
  }, [transport])

  const setRate = useCallback((rate: number) => {
    transport?.setRate(rate)
  }, [transport])

  const setTotalDuration = useCallback((duration: number) => {
    transport?.setTotalDuration(duration)
  }, [transport])

  const getTime = useCallback(() => {
    return transport?.getTime() ?? 0
  }, [transport])

  const getAudioContext = useCallback(() => {
    if (!transport) {
      throw new Error('AudioContext not available in server environment')
    }
    return transport.getAudioContext()
  }, [transport])

  // 항상 같은 구조로 반환 (조건부 early return 제거)
  return {
    // 상태
    currentTime,
    isPlaying: state.isPlaying,
    playbackRate: state.playbackRate,
    totalDuration: state.totalDuration,
    
    // 제어 함수
    play,
    pause,
    seek,
    setRate,
    setTotalDuration,
    getTime,
    getAudioContext,
    
    // Transport 인스턴스 (고급 사용)
    transport,
  }
}
