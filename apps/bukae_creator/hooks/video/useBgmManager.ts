import { useState, useRef, useCallback, useEffect } from 'react'
import { bgmTemplates, getBgmTemplateUrlSync } from '@/lib/data/templates'

interface UseBgmManagerParams {
  bgmTemplate: string | null
  playbackSpeed?: number // 배속 설정 (재생 중인 BGM의 playbackRate 업데이트에 사용)
  isPlaying?: boolean // 사용되지 않지만 인터페이스 호환성을 위해 유지
}

/**
 * BGM 관리 hook
 * BGM 오디오 재생, 확정 처리, 부트스트래핑 상태 관리를 담당합니다.
 */
export function useBgmManager({
  bgmTemplate,
  playbackSpeed,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isPlaying,
}: UseBgmManagerParams) {
  const [confirmedBgmTemplate, setConfirmedBgmTemplate] = useState<string | null>(bgmTemplate)
  const [isBgmBootstrapping, setIsBgmBootstrapping] = useState(false)
  const isBgmBootstrappingRef = useRef(false)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
  const bgmAudioUrlRef = useRef<string | null>(null)
  const bgmStartTimeRef = useRef<number | null>(null)

  // bgmTemplate이 변경되면 confirmedBgmTemplate도 초기화
  useEffect(() => {
    if (bgmTemplate !== confirmedBgmTemplate) {
      // bgmTemplate이 변경되었지만 아직 확정되지 않은 경우에만 초기화하지 않음
      // 사용자가 직접 확정한 경우는 유지
    }
  }, [bgmTemplate, confirmedBgmTemplate])

  // 배속 변경 시 재생 중인 BGM의 playbackRate 업데이트
  useEffect(() => {
    if (playbackSpeed !== undefined && bgmAudioRef.current) {
      bgmAudioRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const stopBgmAudio = useCallback(() => {
    const a = bgmAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    bgmAudioRef.current = null
    if (bgmAudioUrlRef.current) {
      URL.revokeObjectURL(bgmAudioUrlRef.current)
      bgmAudioUrlRef.current = null
    }
  }, [])

  const startBgmAudio = useCallback(async (templateId: string | null, playbackSpeed: number, shouldPlay: boolean = false): Promise<void> => {
    if (!templateId) {
      stopBgmAudio()
      return
    }

    const template = bgmTemplates.find(t => t.id === templateId)
    if (!template) {
      stopBgmAudio()
      return
    }

    try {
      const url = getBgmTemplateUrlSync(template)
      if (!url) {
        stopBgmAudio()
        return
      }

      // URL이 유효한지 확인
      if (!url.startsWith('http') && !url.startsWith('/')) {
        stopBgmAudio()
        return
      }

      // URL이 실제로 접근 가능한지 확인
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (!response.ok) {
          stopBgmAudio()
          return
        }
      } catch {
        stopBgmAudio()
        return
      }

      stopBgmAudio()
      const audio = new Audio(url)
      audio.loop = true
      audio.playbackRate = playbackSpeed
      audio.volume = 0.5 // 미리보기에서 볼륨 낮춤
      bgmAudioRef.current = audio
      
      // 재생해야 하는 경우에만 재생
      if (shouldPlay) {
        // BGM이 실제로 재생될 때까지 기다리는 Promise
        const playingPromise = new Promise<void>((resolve, reject) => {
          let resolved = false
          
          const handlePlaying = () => {
            if (!resolved) {
              resolved = true
              // BGM 재생 시작 시점 기록
              bgmStartTimeRef.current = Date.now()
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              resolve()
            }
          }
          
          const handleError = () => {
            if (!resolved) {
              resolved = true
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              stopBgmAudio()
              reject(new Error('BGM 재생 실패'))
            }
          }
          
          audio.addEventListener('playing', handlePlaying)
          audio.addEventListener('error', handleError)
          
          // play() 호출
          audio.play().catch((err) => {
            if (!resolved) {
              resolved = true
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              reject(err)
            }
          })
        })
        
        // 실제 재생이 시작될 때까지 기다림
        await playingPromise
      } else {
        // 로드만 하고 재생은 하지 않음
        // audio.load()를 호출하여 메타데이터 로드
        audio.load()
      }
    } catch {
      stopBgmAudio()
    }
  }, [stopBgmAudio])

  const handleBgmConfirm = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplate(templateId)
  }, [])

  return {
    confirmedBgmTemplate,
    setConfirmedBgmTemplate,
    isBgmBootstrapping,
    setIsBgmBootstrapping,
    isBgmBootstrappingRef,
    bgmAudioRef,
    bgmStartTimeRef,
    stopBgmAudio,
    startBgmAudio,
    handleBgmConfirm,
  }
}

