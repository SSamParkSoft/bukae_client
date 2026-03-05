'use client'

import { useCallback, useEffect } from 'react'
import type { useTransport } from '@/hooks/video/transport/useTransport'

type UseTransportReturnType = ReturnType<typeof useTransport>

interface UseTtsDurationSyncParams {
  transport: UseTransportReturnType
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  ttsCacheRefShared: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  transportRendererRef: React.MutableRefObject<{ resetRenderCache?: () => void } | null>
  renderAtRef: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
  onDurationChangeRef: React.MutableRefObject<((sceneIndex: number, durationSec: number) => void) | undefined>
}

/**
 * TTS duration 변경 시 동기화를 관리하는 훅
 * - TTS duration 변경 감지
 * - TTS 캐시 동기화 (ttsCacheRef ↔ ttsCacheRefShared)
 * - 렌더링 캐시 리셋
 * - 즉시 렌더링 업데이트
 */
export function useTtsDurationSync({
  transport,
  ttsCacheRef,
  ttsCacheRefShared,
  transportRendererRef,
  renderAtRef,
  onDurationChangeRef,
}: UseTtsDurationSyncParams) {
  // TTS duration 변경 시 렌더링 즉시 업데이트를 위한 콜백
  const handleDurationChange = useCallback(() => {
    // TTS duration이 변경되면 ttsCacheRefShared를 먼저 동기화한 후 렌더링
    // useTtsManager의 ttsCacheRef가 업데이트되었으므로 ttsCacheRefShared에도 반영
    if (ttsCacheRef && ttsCacheRefShared) {
      // 최신 캐시를 ttsCacheRefShared에 동기화
      ttsCacheRef.current.forEach((value, key) => {
        if (!ttsCacheRefShared.current.has(key) || 
            ttsCacheRefShared.current.get(key)?.durationSec !== value.durationSec) {
          ttsCacheRefShared.current.set(key, value)
        }
      })
    }
    
    // 렌더링 캐시 리셋 (TTS duration 변경으로 인한 씬 경계 변경을 감지하기 위해)
    // 이렇게 하면 다음 renderAt 호출 시 중복 체크를 우회하여 강제 렌더링됨
    if (transportRendererRef.current?.resetRenderCache) {
      transportRendererRef.current.resetRenderCache()
    }
    
    // 캐시 동기화 및 캐시 리셋 후 현재 재생 시간에서 렌더링을 즉시 수행
    if (renderAtRef.current && transport) {
      const currentTime = transport.currentTime
      // 즉시 렌더링 (캐시 리셋으로 인해 중복 체크를 우회하여 TTS duration 변경 시 즉시 반영)
      renderAtRef.current(currentTime, { skipAnimation: false })
    }
    // renderAtRef는 ref이므로 의존성 배열에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, ttsCacheRef, ttsCacheRefShared])
  
  // handleDurationChange를 ref에 저장하여 useTtsManager에서 사용 가능하도록
  useEffect(() => {
    onDurationChangeRef.current = handleDurationChange
    // onDurationChangeRef는 ref이므로 의존성 배열에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleDurationChange])

  return {
    handleDurationChange,
  }
}
