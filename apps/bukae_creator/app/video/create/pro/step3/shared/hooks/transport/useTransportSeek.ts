'use client'

import type { useTransport } from '@/hooks/video/transport/useTransport'
import type { useTtsTrack } from '@/hooks/video/audio/useTtsTrack'

type UseTransportReturnType = ReturnType<typeof useTransport>
type UseTtsTrackReturnType = ReturnType<typeof useTtsTrack>

interface UseTransportSeekParams {
  transport: UseTransportReturnType
  ttsTrack: UseTtsTrackReturnType
  audioContext: AudioContext | undefined
  confirmedBgmTemplate: string | null
  seekBgmAudio: (time: number) => void
  renderAtRef: React.MutableRefObject<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>
}

/**
 * Transport seek 로직을 관리하는 훅
 * - Transport seek 처리
 * - TTS seek 동기화
 * - BGM seek 동기화
 * - 렌더링 업데이트
 */
export function useTransportSeek({
  transport,
  ttsTrack,
  audioContext,
  confirmedBgmTemplate,
  seekBgmAudio,
  renderAtRef,
}: UseTransportSeekParams): React.Dispatch<React.SetStateAction<number>> {
  const setCurrentTime = ((time: number | ((prev: number) => number)) => {
    const targetTime = typeof time === 'function' ? time(transport.currentTime) : time
    const wasPlaying = transport.isPlaying
    transport.seek(targetTime)
    // TtsTrack도 seek (재생 중일 때만, 클라이언트에서만)
    // 재생 중이 아닐 때는 TTS 재생하지 않음 (씬 클릭 시 음성 재생 방지)
    if (wasPlaying && typeof window !== 'undefined' && transport.transport && audioContext) {
      const audioCtxTime = audioContext.currentTime
      ttsTrack.playFrom(targetTime, audioCtxTime)
    } else {
      // 재생 중이 아닐 때는 TTS 정지 (씬 클릭 시 음성 재생 방지)
      if (typeof window !== 'undefined') {
        ttsTrack.stopAll()
      }
    }
    // BGM도 타임라인 시간에 맞춰 seek (재생 중일 때만)
    if (wasPlaying && typeof window !== 'undefined' && confirmedBgmTemplate) {
      seekBgmAudio(targetTime)
    }
    // 시각적 렌더링 업데이트
    // 재생 중이 아닐 때는 애니메이션 적용 (미리보기 목적)
    // 재생 중일 때는 기존 동작 유지 (skipAnimation: true)
    if (renderAtRef.current) {
      const shouldSkipAnimation = wasPlaying // 재생 중이면 애니메이션 스킵 (기존 동작 유지)
      renderAtRef.current(targetTime, { skipAnimation: shouldSkipAnimation })
    }
  }) as React.Dispatch<React.SetStateAction<number>>

  return setCurrentTime
}
