/**
 * Transport 상태 관리 훅
 * Transport 상태 구독 및 관리
 */

'use client'

import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useSyncExternalStore } from 'react'
import type { ITransport } from '../../transport/types'

/**
 * Transport 상태
 */
export interface TransportState {
  isPlaying: boolean
  timelineOffsetSec: number
  audioCtxStartSec: number
  playbackRate: number
  totalDuration: number
}

/**
 * Transport 상태 관리 훅 파라미터
 */
export interface UseTransportStateParams {
  /** Transport 인스턴스 */
  transport: ITransport | null
}

/**
 * Transport 상태 관리 훅 반환값
 */
export interface UseTransportStateReturn {
  /** Transport 상태 */
  transportState: TransportState
}

/**
 * Transport 상태 관리 훅
 */
export function useTransportState({
  transport,
}: UseTransportStateParams): UseTransportStateReturn {
  const transportStateRef = useRef<TransportState | null>(null)
  const transportRef = useRef(transport)
  
  // transport ref 업데이트
  useEffect(() => {
    transportRef.current = transport
  }, [transport])

  // getServerSnapshot을 상수로 캐싱하여 무한 루프 방지
  const defaultTransportState = useMemo(
    () => ({ isPlaying: false, timelineOffsetSec: 0, audioCtxStartSec: 0, playbackRate: 1.0, totalDuration: 0 }),
    []
  )

  // defaultTransportState를 ref에 저장하여 항상 같은 참조 유지
  const defaultStateRef = useRef(defaultTransportState)
  useEffect(() => {
    defaultStateRef.current = defaultTransportState
  }, [defaultTransportState])

  // getSnapshot을 안정적인 참조로 캐싱 (transport 변경 시에도 같은 함수 참조 유지)
  // 중요한 점: 같은 상태면 항상 같은 객체 참조를 반환해야 함
  const getTransportStateSnapshot = useCallback(() => {
    const currentTransport = transportRef.current
    if (!currentTransport) {
      // transport가 없으면 기본 상태 반환 (항상 같은 참조)
      if (!transportStateRef.current) {
        transportStateRef.current = defaultStateRef.current
      }
      return transportStateRef.current
    }
    const newState = currentTransport.getState()
    
    // 상태가 변경되지 않았으면 이전 참조 반환 (중요!)
    if (transportStateRef.current &&
        transportStateRef.current.isPlaying === newState.isPlaying &&
        transportStateRef.current.timelineOffsetSec === newState.timelineOffsetSec &&
        transportStateRef.current.audioCtxStartSec === newState.audioCtxStartSec &&
        transportStateRef.current.playbackRate === newState.playbackRate &&
        transportStateRef.current.totalDuration === newState.totalDuration) {
      return transportStateRef.current
    }
    
    // 상태가 변경되었으면 새 상태 저장 및 반환
    transportStateRef.current = newState
    return transportStateRef.current
  }, []) // 의존성 배열 비움 - transport는 ref로 접근

  const transportState = useSyncExternalStore(
    (onStoreChange) => {
      const currentTransport = transportRef.current
      if (!currentTransport) {
        return () => {}
      }
      return currentTransport.subscribe(() => {
        onStoreChange()
      }, true)
    },
    getTransportStateSnapshot,
    () => defaultStateRef.current
  )

  return {
    transportState,
  }
}
