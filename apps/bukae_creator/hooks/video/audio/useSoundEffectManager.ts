import { useRef, useCallback, useEffect } from 'react'
import { getSoundEffectStorageUrl } from '@/lib/utils/supabase-storage'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseSoundEffectManagerParams {
  timeline: TimelineData | null
  isPlaying: boolean
  currentTime: number
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number }>>
  voiceTemplate?: string | null
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey?: (voiceName: string, markup: string) => string
  getActiveSegment?: (tSec: number) => { segment: { sceneIndex?: number; partIndex?: number; startSec: number } } | null
}

/**
 * 효과음 관리 hook
 * 각 씬의 효과음을 타임라인에 맞춰 재생합니다.
 */
export function useSoundEffectManager({
  timeline,
  isPlaying,
  currentTime,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
  getActiveSegment,
}: UseSoundEffectManagerParams) {
  const soundEffectAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map()) // key: `${sceneIndex}-${partIndex}`
  const activeSoundEffectsRef = useRef<Set<string>>(new Set()) // key: `${sceneIndex}-${partIndex}`
  const lastSegmentIndexRef = useRef<number | null>(null) // 마지막 세그먼트 인덱스 추적

  // 효과음 정리
  const cleanupSoundEffect = useCallback((key: string) => {
    const audio = soundEffectAudioRefs.current.get(key)
    if (audio) {
      try {
        audio.pause()
        audio.currentTime = 0
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src)
        }
      } catch {
        // ignore
      }
      soundEffectAudioRefs.current.delete(key)
      activeSoundEffectsRef.current.delete(key)
    }
  }, [])

  // 모든 효과음 정리
  const cleanupAllSoundEffects = useCallback(() => {
    soundEffectAudioRefs.current.forEach((audio, sceneIndex) => {
      try {
        audio.pause()
        audio.currentTime = 0
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src)
        }
      } catch {
        // ignore
      }
    })
    soundEffectAudioRefs.current.clear()
    activeSoundEffectsRef.current.clear()
  }, [])

  // 효과음 재생
  const playSoundEffect = useCallback(async (key: string, soundEffectPath: string, startTime: number, currentT: number) => {
    if (!timeline) {
      return
    }

    // 이미 재생 중인 효과음이 있으면 정리
    cleanupSoundEffect(key)

    try {
      const url = getSoundEffectStorageUrl(soundEffectPath) || `/sound-effects/${soundEffectPath}`
      
      if (!url || (!url.startsWith('http') && !url.startsWith('/'))) {
        return
      }

      const audio = new Audio(url)
      audio.volume = 0.5 // 효과음 볼륨
      
      // 메타데이터 로드 후 효과음 duration 확인
      const setupAudio = () => {
        soundEffectAudioRefs.current.set(key, audio)
        
        // 재생 중일 때만 재생
        if (isPlaying) {
          // 세그먼트 시작 시간과 현재 시간의 차이 계산
          const elapsedTime = Math.max(0, currentT - startTime)
          
          // 효과음이 이미 시작되었으면 해당 위치부터 재생
          // 단, 효과음 duration을 넘지 않도록 제한
          if (elapsedTime > 0 && audio.duration > 0) {
            audio.currentTime = Math.min(elapsedTime, audio.duration)
          }

          audio.addEventListener('ended', () => {
            cleanupSoundEffect(key)
          })

          audio.addEventListener('error', () => {
            cleanupSoundEffect(key)
          })

          audio.play()
            .then(() => {
              activeSoundEffectsRef.current.add(key)
            })
            .catch(() => {
              cleanupSoundEffect(key)
            })
        }
      }

      // 메타데이터가 이미 로드되어 있으면 즉시 설정
      if (audio.readyState >= 1) {
        setupAudio()
      } else {
        // 메타데이터 로드 대기
        audio.addEventListener('loadedmetadata', setupAudio, { once: true })
        audio.addEventListener('error', () => {
          cleanupSoundEffect(key)
        }, { once: true })
      }
    } catch {
      cleanupSoundEffect(key)
    }
  }, [timeline, isPlaying, cleanupSoundEffect])

  // 효과음 일시정지
  const pauseSoundEffect = useCallback((key: string) => {
    const audio = soundEffectAudioRefs.current.get(key)
    if (audio) {
      try {
        audio.pause()
      } catch {
        // ignore
      }
    }
  }, [])

  // 효과음 재개
  const resumeSoundEffect = useCallback(async (key: string) => {
    const audio = soundEffectAudioRefs.current.get(key)
    if (audio) {
      try {
        await audio.play()
        activeSoundEffectsRef.current.add(key)
      } catch {
        // ignore
      }
    }
  }, [])

  // 모든 효과음 일시정지
  const pauseAllSoundEffects = useCallback(() => {
    soundEffectAudioRefs.current.forEach((audio) => {
      try {
        audio.pause()
      } catch {
        // ignore
      }
    })
  }, [])

  // 모든 효과음 재개
  const resumeAllSoundEffects = useCallback(async () => {
    const promises: Promise<void>[] = []
    soundEffectAudioRefs.current.forEach((audio, sceneIndex) => {
      promises.push(
        audio.play()
          .then(() => {
            activeSoundEffectsRef.current.add(sceneIndex)
          })
          .catch(() => {
            // ignore
          })
      )
    })
    await Promise.all(promises)
  }, [])

  // 세그먼트 전환 감지하여 효과음 재생
  useEffect(() => {
    if (typeof window === 'undefined' || !timeline || !timeline.scenes || !getActiveSegment) {
      return
    }
    if (!isPlaying) {
      return
    }

    // 현재 활성 세그먼트 가져오기
    const activeSegment = getActiveSegment(currentTime)
    if (!activeSegment || activeSegment.segment.sceneIndex === undefined || activeSegment.segment.partIndex === undefined) {
      return
    }

    const sceneIndex = activeSegment.segment.sceneIndex
    const partIndex = activeSegment.segment.partIndex
    const segmentIndex: number = 'segmentIndex' in activeSegment ? (activeSegment.segmentIndex as number) : -1

    // 세그먼트 전환 감지
    const segmentChanged = segmentIndex !== lastSegmentIndexRef.current
    lastSegmentIndexRef.current = segmentIndex

    if (!segmentChanged) {
      return
    }

    // 세그먼트 전환 시점에 효과음 재생
    const scene = timeline.scenes[sceneIndex]
    if (!scene || !scene.soundEffect) {
      return
    }

    const effectKey = `${sceneIndex}-${partIndex}`
    const segmentStartTime = activeSegment.segment.startSec

    // 이미 재생 중인 효과음이 있으면 정리하고 새로 재생
    if (activeSoundEffectsRef.current.has(effectKey)) {
      cleanupSoundEffect(effectKey)
    }

    // 세그먼트 전환 시점에 효과음 재생 (세그먼트 시작 시간에 맞춰 재생)
    playSoundEffect(effectKey, scene.soundEffect, segmentStartTime, segmentStartTime)
  }, [timeline, currentTime, isPlaying, playSoundEffect, cleanupSoundEffect, getActiveSegment])

  // 타임라인 시간에 맞춰 효과음 정리 (세그먼트 범위를 벗어난 효과음 정리)
  useEffect(() => {
    if (typeof window === 'undefined' || !timeline || !timeline.scenes) {
      return
    }

    // TTS 캐시와 마크업 함수가 없으면 처리 불가
    if (!ttsCacheRef || !buildSceneMarkup || !makeTtsKey || !voiceTemplate) {
      return
    }

    // totalDuration은 transitionDuration을 제외한 TTS duration만 포함하므로
    // 각 씬의 시작 시간도 transitionDuration을 제외하고 계산해야 함
    let accumulatedTime = 0

    // 각 씬의 세그먼트별 효과음 정리 처리
    timeline.scenes.forEach((scene, sceneIndex) => {
      if (!scene) {
        accumulatedTime += 0
        return
      }

      const sceneStartTime = accumulatedTime
      
      // 다음 씬의 시작 시간 계산 (transitionDuration 제외, totalDuration과 동일한 방식)
      accumulatedTime += scene.duration

      if (!scene.soundEffect) {
        // 효과음이 없으면 해당 씬의 모든 세그먼트 효과음 정리
        const keysToRemove: string[] = []
        activeSoundEffectsRef.current.forEach((key) => {
          if (key.startsWith(`${sceneIndex}-`)) {
            keysToRemove.push(key)
          }
        })
        keysToRemove.forEach((key) => cleanupSoundEffect(key))
        return
      }

      // 씬의 세그먼트(part) 정보 계산
      // 씬별 voiceTemplate만 사용 (전역 voiceTemplate fallback 제거)
      const sceneVoiceTemplate = scene.voiceTemplate
      if (!sceneVoiceTemplate) {
        return
      }

      const markups = buildSceneMarkup(timeline, sceneIndex)
      if (markups.length === 0) {
        return
      }

      let partAccumulatedTime = sceneStartTime

      // 각 세그먼트(part)별로 효과음 정리 처리
      for (let partIndex = 0; partIndex < markups.length; partIndex++) {
        const markup = markups[partIndex]
        if (!markup) {
          continue
        }

        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        const partDuration = cached?.durationSec || 0
        const partStartTime = partAccumulatedTime
        const partEndTime = partAccumulatedTime + partDuration

        // 다음 세그먼트의 시작 시간 계산
        partAccumulatedTime = partEndTime

        const effectKey = `${sceneIndex}-${partIndex}`

        // 다음 세그먼트 시작 시간 계산
        const nextPartStartTime = partIndex < markups.length - 1 
          ? partAccumulatedTime 
          : (sceneIndex < timeline.scenes.length - 1 
              ? accumulatedTime 
              : Infinity)

        // 이미 재생 중인 효과음 확인
        const audio = soundEffectAudioRefs.current.get(effectKey)
        if (audio) {
          const isPlayingAudio = !audio.paused && audio.currentTime > 0 && audio.currentTime < audio.duration
          
          // 다음 세그먼트가 시작되었으면 정리 (같은 씬의 다음 세그먼트 또는 다음 씬)
          if (currentTime >= nextPartStartTime && nextPartStartTime < Infinity) {
            cleanupSoundEffect(effectKey)
          } else if (!isPlayingAudio && currentTime > partEndTime) {
            // 효과음이 끝났고 세그먼트도 끝났으면 정리
            cleanupSoundEffect(effectKey)
          }
          // 효과음이 재생 중이고 다음 세그먼트가 시작되지 않았으면 계속 재생 (아무것도 하지 않음)
        }
      }
    })
  }, [timeline, currentTime, cleanupSoundEffect, ttsCacheRef, voiceTemplate, buildSceneMarkup, makeTtsKey])

  // 재생 상태 변경 시 효과음 일시정지/재개
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (isPlaying) {
      resumeAllSoundEffects()
    } else {
      pauseAllSoundEffects()
    }
  }, [isPlaying, pauseAllSoundEffects, resumeAllSoundEffects])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanupAllSoundEffects()
    }
  }, [cleanupAllSoundEffects])

  return {
    cleanupAllSoundEffects,
  }
}
