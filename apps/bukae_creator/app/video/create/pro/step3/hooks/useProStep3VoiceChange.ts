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
  const { setTimeline, setScenes } = useVideoCreateStore()

  const changedScenesRef = useRef<Set<number>>(new Set())
  const ttsCacheRef = useRef<Map<string, TtsCacheEntry>>(new Map())
  const ttsInFlightRef = useRef<Map<string, Promise<TtsCacheEntry>>>(new Map())
  const abortRef = useRef<AbortController | null>(null)

  const [synthesizingScenes, setSynthesizingScenes] = useState<Set<number>>(new Set())
  const [isPreparing, setIsPreparing] = useState(false)

  const handleVoiceChange = useCallback(
    (sceneIndices: number[], newVoiceTemplate: string | null, newVoiceLabel?: string) => {
      if (!newVoiceTemplate) return

      const currentTimeline = useVideoCreateStore.getState().timeline
      if (!currentTimeline) return

      if (isPlaying) onPausePlayback()

      // 1. timeline voiceTemplate 업데이트
      const newTimeline = {
        ...currentTimeline,
        scenes: currentTimeline.scenes.map((s, i) =>
          sceneIndices.includes(i) ? { ...s, voiceTemplate: newVoiceTemplate } : s
        ),
      }
      setTimeline(newTimeline)

      // 2. storeScenes voiceTemplate & voiceLabel 업데이트
      //    ProStep3Scene.voiceTemplate은 storeScenes에서 오므로, 여기도 반드시 업데이트해야
      //    useProTransportTtsSync의 캐시 키 조회(`${voiceTemplate}::${script}`)가 올바르게 동작함
      //    voiceLabel도 함께 업데이트해야 씬 카드에 변경된 보이스가 표시됨
      const currentScenes = useVideoCreateStore.getState().scenes
      const updatedScenes = currentScenes.map((s, i) => {
        if (!sceneIndices.includes(i)) return s
        return {
          ...s,
          voiceTemplate: newVoiceTemplate,
          ...(newVoiceLabel !== undefined ? { voiceLabel: newVoiceLabel } : {}),
        } as typeof s
      })
      setScenes(updatedScenes)

      // 변경 마킹 (실제 TTS 합성은 preparePlayback 호출 시 수행)
      sceneIndices.forEach((idx) => changedScenesRef.current.add(idx))
    },
    [isPlaying, onPausePlayback, setTimeline, setScenes]
  )

  /**
   * 재생 전에 변경된 씬의 TTS를 합성한다.
   * @param targetSceneIndices 합성할 씬 인덱스. 미지정 시 changedScenesRef 전체 합성.
   * @returns 정상 완료 시 true, abort 시 false
   */
  const preparePlayback = useCallback(
    async (targetSceneIndices?: number[]): Promise<boolean> => {
      // 합성할 씬 인덱스 결정
      const indicesToSynthesize = targetSceneIndices
        ? targetSceneIndices.filter((i) => changedScenesRef.current.has(i))
        : Array.from(changedScenesRef.current)

      if (indicesToSynthesize.length === 0) return true

      // 이전 합성 취소 후 새 controller 생성
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsPreparing(true)
      setSynthesizingScenes(new Set(indicesToSynthesize))

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

      const remaining = new Set(indicesToSynthesize)

      for (const idx of indicesToSynthesize) {
        if (controller.signal.aborted) break
        const currentTimeline = useVideoCreateStore.getState().timeline
        if (!currentTimeline) break
        try {
          const result = await ensureSceneTtsUtil({
            timeline: currentTimeline,
            sceneIndex: idx,
            ttsCacheRef,
            ttsInFlightRef,
            changedScenesRef,
            setSceneDurationFromAudio,
            signal: controller.signal,
            forceRegenerate: true,
          })

          if (!controller.signal.aborted && result.parts.length > 0) {
            // useProTransportTtsSync의 캐시 조회 포맷: `${voiceTemplate}::${script}`
            const scenes = useVideoCreateStore.getState().scenes
            const storeScene = scenes[idx] as { script?: string; voiceTemplate?: string } | undefined
            const script = storeScene?.script ?? ''
            const voiceTemplate = storeScene?.voiceTemplate ?? currentTimeline.scenes[idx]?.voiceTemplate ?? ''

            const firstPart = result.parts[0]
            if (script && firstPart.url) {
              containerTtsCacheRef.current.set(`${voiceTemplate}::${script}`, {
                blob: firstPart.blob,
                durationSec: firstPart.durationSec,
                url: firstPart.url,
              })
            }

            // markup 기반 키도 동기화
            ttsCacheRef.current.forEach((entry, key) => {
              containerTtsCacheRef.current.set(key, {
                blob: entry.blob,
                durationSec: entry.durationSec,
                url: entry.url,
              })
            })

            changedScenesRef.current.delete(idx)
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

      if (controller.signal.aborted) {
        setIsPreparing(false)
        setSynthesizingScenes(new Set())
        return false
      }

      setIsPreparing(false)
      setSynthesizingScenes(new Set())
      return true
    },
    [setTimeline, containerTtsCacheRef]
  )

  return {
    handleVoiceChange,
    synthesizingScenes,
    isPreparing,
    preparePlayback,
  }
}
