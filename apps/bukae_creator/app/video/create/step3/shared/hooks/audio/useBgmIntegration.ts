'use client'

import { useEffect } from 'react'
import type { useTransport } from '@/hooks/video/transport/useTransport'

interface UseBgmIntegrationParams {
  isPlaying: boolean
  confirmedBgmTemplate: string | null
  playbackSpeed: number
  transport: ReturnType<typeof useTransport>
  bgmAudioRef: React.MutableRefObject<HTMLAudioElement | null>
  startBgmAudio: (templateId: string, speed: number, loop: boolean, startTime: number) => Promise<void>
  pauseBgmAudio: () => void
  resumeBgmAudio: () => Promise<void>
  stopBgmAudio: () => void
}

export function useBgmIntegration({
  isPlaying,
  confirmedBgmTemplate,
  playbackSpeed,
  transport,
  bgmAudioRef,
  startBgmAudio,
  pauseBgmAudio,
  resumeBgmAudio,
  stopBgmAudio,
}: UseBgmIntegrationParams) {
  // confirmedBgmTemplate이 변경되고 재생 중이면 BGM 재생
  // 타임라인 시간에 맞춰 BGM 재생 위치 설정
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (isPlaying && confirmedBgmTemplate) {
      const currentT = transport.getTime()
      const bgmAudio = bgmAudioRef.current
      if (bgmAudio && !bgmAudio.paused) {
        // 이미 재생 중이면 재개만 하면 됨 (템플릿 변경이 아닌 경우)
        resumeBgmAudio().catch(() => {
          // 재개 실패 시 다시 시작
          startBgmAudio(confirmedBgmTemplate, playbackSpeed, true, currentT).catch(() => {
            // BGM 재생 실패 시 무시
          })
        })
      } else {
        // 재생 중이 아니면 새로 시작
        startBgmAudio(confirmedBgmTemplate, playbackSpeed, true, currentT).catch(() => {
          // BGM 재생 실패 시 무시
        })
      }
    } else if (!isPlaying && confirmedBgmTemplate) {
      // 일시정지 (BGM은 유지)
      pauseBgmAudio()
    } else if (!confirmedBgmTemplate) {
      // BGM 템플릿이 없으면 완전히 정지
      stopBgmAudio()
    }
  }, [confirmedBgmTemplate, isPlaying, playbackSpeed, startBgmAudio, pauseBgmAudio, resumeBgmAudio, stopBgmAudio, transport, bgmAudioRef])
}
