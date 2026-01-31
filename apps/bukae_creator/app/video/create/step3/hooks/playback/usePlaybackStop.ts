'use client'

import { useCallback, useMemo } from 'react'
import { stopPlaybackIfPlaying as stopPlaybackUtil } from './stopPlayback'

export interface UsePlaybackStopParams {
  isPlaying: boolean
  playingSceneIndex: number | null
  playingGroupSceneId: number | null
  transport: { pause: () => void }
  setIsPlaying: (playing: boolean) => void
  setPlayingSceneIndex: (index: number | null) => void
  setPlayingGroupSceneId: (sceneId: number | null) => void
  setPlaybackEndTime: (time: number | null) => void
  ttsTrackRef: React.MutableRefObject<{ getTtsTrack: () => unknown }>
  /** 정지 시 동기적으로 false로 두어, effect가 같은 틱에 '재생 중 아님'을 보게 함 */
  isPlayingRef?: React.MutableRefObject<boolean>
}

/**
 * 설정 변경 시 재생 정지 로직을 제공하는 훅
 * 씬/그룹/전체 재생 중에 설정을 건드리면 재생이 정지되도록 할 때 사용
 */
export function usePlaybackStop({
  isPlaying,
  playingSceneIndex,
  playingGroupSceneId,
  transport,
  setIsPlaying,
  setPlayingSceneIndex,
  setPlayingGroupSceneId,
  setPlaybackEndTime,
  ttsTrackRef,
  isPlayingRef,
}: UsePlaybackStopParams) {
  const stopPlaybackIfPlaying = useCallback(() => {
    if (isPlayingRef) isPlayingRef.current = false
    const tts = ttsTrackRef.current.getTtsTrack()
    stopPlaybackUtil({
      isPlaying,
      playingSceneIndex,
      playingGroupSceneId,
      transport,
      setIsPlaying,
      setPlayingSceneIndex,
      setPlayingGroupSceneId,
      setPlaybackEndTime,
      getTtsTrack: () =>
        tts && typeof tts === 'object' && 'setAllowedSceneIndices' in tts && 'stopAll' in tts
          ? (tts as { setAllowedSceneIndices: (v: number[] | null) => void; stopAll: () => void })
          : null,
    })
  }, [
    isPlaying,
    playingSceneIndex,
    playingGroupSceneId,
    transport,
    setIsPlaying,
    setPlayingSceneIndex,
    setPlayingGroupSceneId,
    setPlaybackEndTime,
    ttsTrackRef,
    isPlayingRef,
  ])

  return { stopPlaybackIfPlaying }
}

/** 재생 정지 래핑 대상 핸들러: 인자·반환은 unknown으로 받고, 호출부에서 구체 타입 보존 (호출 시 단언용) */
export type StopPlaybackHandlerFn = (...args: unknown[]) => unknown

/**
 * 여러 핸들러를 한 번에 "재생 정지 후 실행" 형태로 감싸는 훅
 * 동일한 패턴의 useCallback을 하나의 훅 호출로 묶을 때 사용
 */
export function useHandlersWithStopPlayback<T extends Record<string, StopPlaybackHandlerFn>>(
  stopPlaybackIfPlaying: () => void,
  handlers: T
): T {
  const values = Object.values(handlers)
  return useMemo(() => {
    const result = {} as T
    for (const key of Object.keys(handlers) as (keyof T)[]) {
      const fn = handlers[key]
      const wrapped = (...args: unknown[]) => {
        stopPlaybackIfPlaying()
        return fn(...args)
      }
      result[key] = wrapped as unknown as T[keyof T]
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers 객체의 값들이 의존성
  }, [stopPlaybackIfPlaying, ...values])
}
