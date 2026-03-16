'use client'

import { useRef, useState, useCallback } from 'react'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { ensureSceneTts as ensureSceneTtsUtil } from '@/lib/utils/tts-synthesis'

type TtsCacheEntry = { blob: Blob; durationSec: number; markup: string; url?: string | null; sceneId?: number; sceneIndex?: number }
type ContainerCacheEntry = { blob: Blob; durationSec: number; url?: string | null }

interface UseProStep3VoiceChangeParams {
  isPlaying: boolean
  onPausePlayback: () => void
  /** useProStep3Container에서 노출된 ttsCacheRef (재생 시 오디오 소스로 사용됨) */
  containerTtsCacheRef: React.MutableRefObject<Map<string, ContainerCacheEntry>>
}

export function useProStep3VoiceChange({
  isPlaying,
  onPausePlayback,
  containerTtsCacheRef,
}: UseProStep3VoiceChangeParams) {
  const { setTimeline } = useVideoCreateStore()

  const changedScenesRef = useRef<Set<number>>(new Set())
  const ttsCacheRef = useRef<Map<string, TtsCacheEntry>>(new Map())
  const ttsInFlightRef = useRef<Map<string, Promise<TtsCacheEntry>>>(new Map())
  const abortRef = useRef<AbortController | null>(null)

  const [synthesizingScenes, setSynthesizingScenes] = useState<Set<number>>(new Set())

  const handleVoiceChange = useCallback(
    async (sceneIndices: number[], newVoiceTemplate: string | null) => {
      if (!newVoiceTemplate) return

      const currentTimeline = useVideoCreateStore.getState().timeline
      if (!currentTimeline) return

      if (isPlaying) onPausePlayback()

      // 이전 합성 취소
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      // voiceTemplate 업데이트
      const newTimeline = {
        ...currentTimeline,
        scenes: currentTimeline.scenes.map((s, i) =>
          sceneIndices.includes(i) ? { ...s, voiceTemplate: newVoiceTemplate } : s
        ),
      }
      setTimeline(newTimeline)

      // 변경 마킹
      sceneIndices.forEach((idx) => changedScenesRef.current.add(idx))

      setSynthesizingScenes(new Set(sceneIndices))

      // setSceneDurationFromAudio: 항상 store에서 최신 timeline을 읽어서 업데이트
      const setSceneDurationFromAudio = (sceneIndex: number, durationSec: number) => {
        const latest = useVideoCreateStore.getState().timeline
        if (!latest) return
        const scene = latest.scenes[sceneIndex]
        if (!scene) return
        const clamped = Math.max(0.5, durationSec)
        if (Math.abs((scene.duration ?? 0) - clamped) <= 0.01) return
        setTimeline({
          ...latest,
          scenes: latest.scenes.map((s, i) =>
            i === sceneIndex ? { ...s, duration: clamped } : s
          ),
        })
      }

      const remaining = new Set(sceneIndices)

      for (const idx of sceneIndices) {
        if (controller.signal.aborted) break
        try {
          await ensureSceneTtsUtil({
            timeline: newTimeline,
            sceneIndex: idx,
            ttsCacheRef,
            ttsInFlightRef,
            changedScenesRef,
            setSceneDurationFromAudio,
            signal: controller.signal,
            forceRegenerate: true,
          })

          // 재생용 캐시에 동기화
          if (!controller.signal.aborted) {
            ttsCacheRef.current.forEach((entry, key) => {
              containerTtsCacheRef.current.set(key, {
                blob: entry.blob,
                durationSec: entry.durationSec,
                url: entry.url,
              })
            })
          }
        } catch {
          // 개별 씬 합성 실패 시 계속 진행
        } finally {
          remaining.delete(idx)
          if (!controller.signal.aborted) {
            setSynthesizingScenes(new Set(remaining))
          }
        }
      }

      if (!controller.signal.aborted) {
        setSynthesizingScenes(new Set())
      }
    },
    [isPlaying, onPausePlayback, setTimeline, containerTtsCacheRef]
  )

  return {
    handleVoiceChange,
    synthesizingScenes,
  }
}
