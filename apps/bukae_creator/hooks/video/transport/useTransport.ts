/**
 * useTransport - Transport React 훅
 * 
 * Transport 인스턴스를 React 컴포넌트에서 사용하기 위한 훅입니다.
 * useSyncExternalStore를 사용하여 Transport 상태를 구독합니다.
 */

'use client'

import { useSyncExternalStore, useRef, useEffect, useCallback, useState } from 'react'
import { Transport } from './Transport'
import type { ITransport, TransportState } from './types'

/**
 * Transport 인스턴스를 생성하고 관리하는 훅
 * 
 * @param audioContext 기존 AudioContext (선택사항, 없으면 새로 생성)
 * @returns Transport 인스턴스 및 제어 함수
 */
export function useTransport(audioContext?: AudioContext) {
  const transportRef = useRef<Transport | null>(null)
  const [isClient, setIsClient] = useState(false)

  // 클라이언트 마운트 확인 및 Transport 인스턴스 생성
  useEffect(() => {
    setIsClient(true)
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
  const getCurrentTimeSnapshot = useCallback(() => {
    const currentTransport = transportRefForTime.current
    if (!currentTransport) {
      // transport가 없으면 기본값 반환 (항상 같은 객체 참조)
      if (lastTimeSnapshotRef.current.value !== 0) {
        lastTimeSnapshotRef.current = { value: 0 }
      }
      return lastTimeSnapshotRef.current
    }
    const newTime = currentTransport.getTime()
    // 소수점 3자리까지 반올림하여 안정적인 값 반환 (약 1ms 단위)
    // 이렇게 하면 너무 자주 업데이트되지 않음
    const roundedTime = Math.round(newTime * 1000) / 1000
    
    // 값이 변경되지 않았으면 이전 객체 참조 반환 (같은 참조 유지)
    if (roundedTime === lastTimeSnapshotRef.current.value) {
      return lastTimeSnapshotRef.current
    }
    
    // 값이 변경되었으면 새 객체 생성 및 반환
    lastTimeSnapshotRef.current = { value: roundedTime }
    return lastTimeSnapshotRef.current
  }, []) // 의존성 배열 비움 - transport는 ref로 접근
  
  // 서버 사이드 렌더링용 스냅샷 (항상 같은 객체 참조 반환)
  const serverTimeSnapshotRef = useRef<{ value: number }>({ value: 0 })
  const getServerTimeSnapshot = useCallback(() => {
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
  
  const getServerSnapshot = useCallback(() => {
    // 서버에서는 더미 상태 반환
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
