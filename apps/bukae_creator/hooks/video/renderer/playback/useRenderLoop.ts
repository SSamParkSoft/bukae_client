/**
 * 렌더링 루프 훅
 * 재생 중 렌더링 루프 관리
 */

'use client'

import { useEffect, useRef } from 'react'
import type { ITransport } from '../../transport/types'
import type { TransportState } from '../transport/useTransportState'

/**
 * 렌더링 루프 훅 파라미터
 */
export interface UseRenderLoopParams {
  /** Transport 인스턴스 */
  transport: ITransport | null
  /** Transport 상태 */
  transportState: TransportState
  /** renderAt 함수 */
  renderAt: (tSec: number, options?: { skipAnimation?: boolean }) => void
  /** 씬 재생 중인 씬 인덱스 (null이면 전체 재생) */
  playingSceneIndex?: number | null | undefined
  /** 그룹 재생 중인 그룹 sceneId (null이면 전체 재생) */
  playingGroupSceneId?: number | null | undefined
}

/**
 * 렌더링 루프 훅
 */
export function useRenderLoop({
  transport,
  transportState,
  renderAt,
  playingSceneIndex,
  playingGroupSceneId,
}: UseRenderLoopParams): void {
  const renderLoopRef = useRef<number | null>(null)
  const frameCountRef = useRef<number>(0) // 디버깅용 프레임 카운터
  
  useEffect(() => {
    // 씬/그룹 재생 중일 때는 렌더링 루프를 중지 (useStep3Container에서 직접 renderAt 호출)
    if ((playingSceneIndex !== null && playingSceneIndex !== undefined) || 
        (playingGroupSceneId !== null && playingGroupSceneId !== undefined)) {
      if (renderLoopRef.current) {
        cancelAnimationFrame(renderLoopRef.current)
        renderLoopRef.current = null
      }
      return
    }
    
    if (!transport || !transportState.isPlaying) {
      // 재생 중이 아니면 렌더링 루프 중지
      if (renderLoopRef.current) {
        cancelAnimationFrame(renderLoopRef.current)
        renderLoopRef.current = null
      }
      return
    }
    

    const renderLoop = () => {
      // transportState를 매번 새로 가져와서 최신 상태 확인
      const currentTransportState = transport?.getState()
      if (!transport || !currentTransportState?.isPlaying) {
        renderLoopRef.current = null
        return
      }

      // 씬/그룹 재생 중이면 렌더링 루프 중지
      if ((playingSceneIndex !== null && playingSceneIndex !== undefined) || 
          (playingGroupSceneId !== null && playingGroupSceneId !== undefined)) {
        renderLoopRef.current = null
        return
      }

      // 매 프레임마다 렌더링 (지연 없이 즉시 반영)
      // renderAt 내부의 중복 렌더링 방지 로직이 불필요한 렌더링을 막아줌
      const currentTime = transport.getTime()
      const totalDuration = currentTransportState.totalDuration
      
      // 재생이 끝났는지 확인 (currentTime이 totalDuration에 도달했거나 넘어섰을 때)
      if (totalDuration > 0 && currentTime >= totalDuration) {
        // 재생 종료: Transport를 일시정지하여 isPlaying을 false로 변경
        transport.pause()
        renderLoopRef.current = null
        return
      }
      
      // renderAt 호출 (내부에서 segmentChanged 체크하므로 여기서는 중복 체크 제거)
      renderAt(currentTime, { skipAnimation: false })
      
      renderLoopRef.current = requestAnimationFrame(renderLoop)
    }

    // 렌더링 루프 시작
    renderLoopRef.current = requestAnimationFrame(renderLoop)
    
    return () => {
      if (renderLoopRef.current) {
        cancelAnimationFrame(renderLoopRef.current)
        renderLoopRef.current = null
      }
      frameCountRef.current = 0 // 프레임 카운터 리셋
    }
  }, [transport, transportState.isPlaying, renderAt, playingSceneIndex, playingGroupSceneId])
}
