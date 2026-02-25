'use client'

import { useCallback } from 'react'
import type { TimelineData as _TimelineData } from '@/store/useVideoCreateStore'
import { useTtsResources } from '../tts/useTtsResources'

interface PlayScenePartOptions {
  sceneIndex: number
  partIndex: number
  markup: string
  playbackSpeed?: number
  abortSignal?: AbortSignal
  onComplete?: () => void
  onError?: (error: Error) => void
}

interface PlayScenePartsOptions {
  sceneIndex: number
  markups: string[]
  playbackSpeed?: number
  abortSignal?: AbortSignal
  onPartComplete?: (partIndex: number) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

function createAbortPlaybackError(): Error {
  const error = new Error('재생이 중단되었습니다.')
  error.name = 'AbortError'
  return error
}

function toPlaybackError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) {
    return error
  }
  return new Error(fallbackMessage)
}

/**
 * 재생 엔진 훅
 * 핵심 재생 로직만 담당: TTS 오디오 재생, 구간별 순차 재생
 * 상태 관리 없음, 순수 재생 로직만 제공
 */
export function usePlaybackEngine() {
  const ttsResources = useTtsResources()

  /**
   * 단일 구간 재생
   * TTS 오디오를 재생하고 완료될 때까지 대기
   */
  const playScenePart = useCallback(async (options: PlayScenePartOptions): Promise<void> => {
    const {
      sceneIndex: _sceneIndex,
      partIndex: _partIndex,
      markup: _markup,
      playbackSpeed: _playbackSpeed,
      abortSignal,
      onComplete,
      onError,
    } = options

    // AbortSignal 체크
    if (abortSignal?.aborted) {
      onError?.(createAbortPlaybackError())
      return
    }

    try {
      // TTS 캐시에서 찾기
      // makeTtsKey는 파라미터로 받아야 함 (voiceTemplate 필요)
      // 일단 여기서는 캐시만 확인하고, 실제 키 생성은 상위에서 처리
      // 캐시에서 직접 찾는 대신, 상위에서 캐시된 데이터를 전달받도록 수정 필요

      // 임시로 빈 함수로 구현 (실제 로직은 상위에서 처리)
      // 이 함수는 나중에 리팩토링할 때 실제 구현
      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      const playbackError = toPlaybackError(error, '씬 구간 재생 중 오류가 발생했습니다.')
      onError?.(playbackError)
      throw playbackError
    }
  }, [])

  /**
   * 씬의 모든 구간 순차 재생
   * 각 구간을 순차적으로 재생하고 완료될 때까지 대기
   */
  const playSceneParts = useCallback(async (options: PlayScenePartsOptions): Promise<void> => {
    const {
      sceneIndex,
      markups,
      playbackSpeed = 1.0,
      abortSignal,
      onPartComplete,
      onComplete,
      onError,
    } = options

    // AbortSignal 체크
    if (abortSignal?.aborted) {
      onError?.(createAbortPlaybackError())
      return
    }

    let didReportError = false
    const forwardError = (error: Error) => {
      didReportError = true
      onError?.(error)
    }

    try {
      // 각 구간을 순차적으로 재생
      for (let partIndex = 0; partIndex < markups.length; partIndex++) {
        if (abortSignal?.aborted) {
          forwardError(createAbortPlaybackError())
          return
        }

        const markup = markups[partIndex]
        if (!markup) {
          continue
        }

        await playScenePart({
          sceneIndex,
          partIndex,
          markup,
          playbackSpeed,
          abortSignal,
          onComplete: () => {
            if (onPartComplete) {
              onPartComplete(partIndex)
            }
          },
          onError: forwardError,
        })
      }

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      const playbackError = toPlaybackError(error, '씬 순차 재생 중 오류가 발생했습니다.')
      if (!didReportError) {
        onError?.(playbackError)
      }
      throw playbackError
    }

  }, [playScenePart])

  /**
   * TTS 오디오 재생 (내부 헬퍼 함수)
   * 캐시된 TTS 데이터를 재생하고 완료될 때까지 대기
   */
  const playTtsAudio = useCallback(async (
    cached: { blob: Blob; durationSec: number; url?: string | null },
    playbackSpeed: number,
    abortSignal?: AbortSignal
  ): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      // AbortSignal 체크
      if (abortSignal?.aborted) {
        resolve()
        return
      }

      // 오디오 URL 생성
      let audioUrl: string | null = null
      if (cached.url) {
        audioUrl = cached.url
      } else if (cached.blob) {
        audioUrl = URL.createObjectURL(cached.blob)
        ttsResources.ttsAudioUrlRef.current = audioUrl
      }

      if (!audioUrl) {
        reject(new Error('TTS 오디오 URL을 생성할 수 없습니다.'))
        return
      }

      // 오디오 생성 및 재생
      const audio = new Audio(audioUrl)
      audio.playbackRate = playbackSpeed
      ttsResources.ttsAudioRef.current = audio

      let isResolved = false
      const resolveOnce = () => {
        if (isResolved) return
        isResolved = true
        resolve()
      }

      const handleEnded = () => {
        if (ttsResources.ttsAudioRef.current !== audio) {
          resolveOnce()
          return
        }
        try {
          audio.removeEventListener('ended', handleEnded)
          audio.removeEventListener('error', handleError)
        } catch {
          // ignore
        }
        resolveOnce()
      }

      const handleError = () => {
        if (ttsResources.ttsAudioRef.current !== audio) {
          resolveOnce()
          return
        }
        try {
          audio.removeEventListener('ended', handleEnded)
          audio.removeEventListener('error', handleError)
        } catch {
          // ignore
        }
        resolveOnce()
      }

      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)

      // 재생 시작
      audio.play()
        .then(() => {
          // 재생 시작 성공
        })
        .catch((_error) => {
          if (ttsResources.ttsAudioRef.current !== audio) {
            resolveOnce()
            return
          }
          handleError()
        })
    })
  }, [ttsResources])

  return {
    playScenePart,
    playSceneParts,
    playTtsAudio,
    ttsResources,
  }
}
