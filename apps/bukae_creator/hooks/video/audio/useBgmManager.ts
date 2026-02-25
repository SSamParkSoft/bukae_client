import { useState, useRef, useCallback } from 'react'
import { bgmTemplates, getBgmTemplateUrlSync } from '@/lib/data/templates'

interface UseBgmManagerParams {
  bgmTemplate: string | null
  playbackSpeed?: number // 배속 설정 (호환성을 위해 유지하지만 BGM에는 적용되지 않음)
  isPlaying?: boolean // 사용되지 않지만 인터페이스 호환성을 위해 유지
}

/**
 * BGM 관리 hook
 * BGM 오디오 재생, 확정 처리, 부트스트래핑 상태 관리를 담당합니다.
 * BGM은 배속 설정과 무관하게 항상 1.0x 속도로 재생됩니다.
 */
export function useBgmManager({
  bgmTemplate,
  playbackSpeed: _playbackSpeed,
  isPlaying: _isPlaying,
}: UseBgmManagerParams) {
  const [confirmedBgmTemplateOverride, setConfirmedBgmTemplateOverride] = useState<string | null | undefined>(undefined)
  const confirmedBgmTemplate = confirmedBgmTemplateOverride === undefined ? bgmTemplate : confirmedBgmTemplateOverride
  const [isBgmBootstrapping, setIsBgmBootstrapping] = useState(false)
  const isBgmBootstrappingRef = useRef(false)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
  const bgmAudioUrlRef = useRef<string | null>(null)
  const bgmStartTimeRef = useRef<number | null>(null)

  // 배속 변경 시 재생 중인 BGM의 playbackRate 업데이트 (비활성화: BGM은 배속 적용 안 함)
  // useEffect(() => {
  //   if (playbackSpeed !== undefined && bgmAudioRef.current) {
  //     bgmAudioRef.current.playbackRate = playbackSpeed
  //   }
  // }, [playbackSpeed])

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

  // BGM 일시정지 (재생 상태 유지)
  const pauseBgmAudio = useCallback(() => {
    const a = bgmAudioRef.current
    if (a) {
      try {
        a.pause()
      } catch {
        // ignore
      }
    }
  }, [])

  // BGM 재개 (일시정지된 위치에서 계속 재생)
  const resumeBgmAudio = useCallback(async () => {
    const a = bgmAudioRef.current
    if (a) {
      try {
        await a.play()
      } catch {
        // ignore
      }
    }
  }, [])

  const startBgmAudio = useCallback(async (templateId: string | null, playbackSpeed: number, shouldPlay: boolean = false, timelineTime?: number): Promise<void> => {
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
      audio.playbackRate = 1.0 // BGM은 배속 적용 안 함 (항상 1.0x 속도)
      audio.volume = 0.5 // 미리보기에서 볼륨 낮춤
      bgmAudioRef.current = audio
      
      // 재생해야 하는 경우에만 재생
      if (shouldPlay) {
        // BGM이 실제로 재생될 때까지 기다리는 Promise
        const playingPromise = new Promise<void>((resolve, reject) => {
          let resolved = false
          
          const handleLoadedMetadata = () => {
            // 메타데이터가 로드된 후 타임라인 시간에 맞춰 BGM 위치 설정
            if (timelineTime !== undefined && audio.duration > 0) {
              // BGM이 loop이므로 타임라인 시간을 BGM duration으로 나눈 나머지 사용
              const bgmTime = timelineTime % audio.duration
              audio.currentTime = bgmTime
            }
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
          }
          
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
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              stopBgmAudio()
              reject(new Error('BGM 재생 실패'))
            }
          }
          
          // 메타데이터 로드 이벤트 리스너 추가
          audio.addEventListener('loadedmetadata', handleLoadedMetadata)
          audio.addEventListener('playing', handlePlaying)
          audio.addEventListener('error', handleError)
          
          // play() 호출
          audio.play().catch((err) => {
            if (!resolved) {
              resolved = true
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
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

  const setConfirmedBgmTemplate = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplateOverride(templateId)
  }, [])

  const handleBgmConfirm = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplate(templateId)
  }, [setConfirmedBgmTemplate])

  // 타임라인 시간에 맞춰 BGM 재생 위치 업데이트
  const seekBgmAudio = useCallback((timelineTime: number) => {
    const audio = bgmAudioRef.current
    if (audio && audio.duration > 0) {
      // BGM이 loop이므로 타임라인 시간을 BGM duration으로 나눈 나머지 사용
      const bgmTime = timelineTime % audio.duration
      audio.currentTime = bgmTime
    }
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
    pauseBgmAudio,
    resumeBgmAudio,
    startBgmAudio,
    seekBgmAudio,
    handleBgmConfirm,
  }
}
