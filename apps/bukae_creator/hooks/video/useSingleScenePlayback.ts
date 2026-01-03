'use client'

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { makeMarkupFromPlainText } from '@/lib/tts/auto-pause'
import { authStorage } from '@/lib/api/auth-storage'

interface UseSingleScenePlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  makeTtsKey: (voiceName: string, markup: string) => string
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  ttsAudioRef: React.MutableRefObject<HTMLAudioElement | null>
  ttsAudioUrlRef: React.MutableRefObject<string | null>
  setIsPreparing?: (preparing: boolean) => void
  setIsTtsBootstrapping?: (bootstrapping: boolean) => void
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  renderSceneContent?: (
    sceneIndex: number,
    partIndex?: number | null,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      updateTimeline?: boolean
      prepareOnly?: boolean
      isPlaying?: boolean
      transitionDuration?: number
    }
  ) => void
  renderSceneImage?: (
    sceneIndex: number,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  getMp3DurationSec: (blob: Blob) => Promise<number>
}

export function useSingleScenePlayback({
  timeline,
  voiceTemplate,
  makeTtsKey,
  ttsCacheRef,
  ttsAudioRef,
  ttsAudioUrlRef,
  setIsPreparing,
  setIsTtsBootstrapping,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  renderSceneContent,
  renderSceneImage,
  textsRef,
  getMp3DurationSec,
}: UseSingleScenePlaybackParams) {
  const playScene = useCallback(async (sceneIndex: number) => {
    if (!timeline || !voiceTemplate) {
      return
    }

    const scene = timeline.scenes[sceneIndex]
    if (!scene) return

    // 전체 자막 텍스트 가져오기 (||| 구분자 제거)
    const fullSubtitle = scene.text?.content || ''
    const plainText = fullSubtitle.replace(/\s*\|\|\|\s*/g, ' ').trim()
    
    if (!plainText) {
      return
    }

    // 전체 자막을 하나의 마크업으로 변환
    const markup = makeMarkupFromPlainText(plainText, {
      addSceneTransitionPause: false,
      enablePause: false,
    })

    if (!markup) {
      return
    }

    // TTS 캐시 확인
    const key = makeTtsKey(voiceTemplate, markup)
    let cached = ttsCacheRef.current.get(key)

    // TTS가 없으면 합성
    if (!cached || (!cached.blob && !cached.url)) {
      if (setIsPreparing) {
        setIsPreparing(true)
      }
      if (setIsTtsBootstrapping) {
        setIsTtsBootstrapping(true)
      }
      
      try {
        // 전체 마크업으로 TTS 합성 (직접 API 호출)
        const accessToken = authStorage.getAccessToken()
        if (!accessToken) {
          throw new Error('로그인이 필요합니다.')
        }

        const response = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            voiceName: voiceTemplate,
            mode: 'markup',
            markup: markup,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'TTS 합성 실패')
        }

        const blob = await response.blob()
        const durationSec = await getMp3DurationSec(blob)

        cached = {
          blob,
          durationSec,
          markup,
          url: null,
        }
        ttsCacheRef.current.set(key, cached)
      } catch (error) {
        console.error('[씬 재생] TTS 합성 실패:', error)
        if (setIsPreparing) {
          setIsPreparing(false)
        }
        if (setIsTtsBootstrapping) {
          setIsTtsBootstrapping(false)
        }
        return
      }
      
      if (setIsPreparing) {
        setIsPreparing(false)
      }
      if (setIsTtsBootstrapping) {
        setIsTtsBootstrapping(false)
      }
    }

    // TTS duration 가져오기
    const ttsDuration = cached?.durationSec || scene.duration || 2.5

    // 이전 오디오 정리
    const stopTtsAudio = () => {
      const a = ttsAudioRef.current
      if (a) {
        try {
          a.pause()
          a.currentTime = 0
          a.src = ''
        } catch {
          // ignore
        }
      }
      ttsAudioRef.current = null
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current)
        ttsAudioUrlRef.current = null
      }
    }
    stopTtsAudio()

    // 씬리스트 패널 업데이트
    currentSceneIndexRef.current = sceneIndex
    setCurrentSceneIndex(sceneIndex)

    // 전환 효과 이미지 렌더링
    let previousSceneIndex: number | null = null
    const lastRenderedIndex = lastRenderedSceneIndexRef.current
    if (lastRenderedIndex !== null && lastRenderedIndex !== sceneIndex) {
      previousSceneIndex = lastRenderedIndex
    }

    // 이미지 전환 효과와 자막 렌더링 (비동기로 시작만 하고 await하지 않음)
    if (renderSceneContent) {
      // renderSceneContent가 자막도 함께 렌더링하도록 호출
      // partIndex를 null로 전달하면 전체 자막을 표시
      // 이미지는 전환 효과를 통해서만 렌더링됨 (전환 효과 완료 후 항상 숨김)
      renderSceneContent(sceneIndex, null, {
        skipAnimation: false,
        forceTransition: scene.transition || 'fade',
        previousIndex: previousSceneIndex !== null ? previousSceneIndex : undefined,
        updateTimeline: false,
        prepareOnly: false,
        isPlaying: true,
        transitionDuration: ttsDuration, // TTS duration을 전환 효과 지속시간으로 사용
        onComplete: () => {
          lastRenderedSceneIndexRef.current = sceneIndex
        },
      })
    } else if (renderSceneImage) {
      renderSceneImage(sceneIndex, {
        skipAnimation: false,
        forceTransition: scene.transition || 'fade',
        previousIndex: previousSceneIndex,
        onComplete: () => {
          lastRenderedSceneIndexRef.current = sceneIndex
        },
        prepareOnly: false,
      })
      
      // 전체 자막 렌더링 (구간 분할 없이)
      const textToUpdate = textsRef.current.get(sceneIndex)
      if (textToUpdate) {
        textToUpdate.text = plainText
        textToUpdate.visible = true
        textToUpdate.alpha = 1
      }
    }

    // TTS 재생 (하나의 파일만)
    if (cached && (cached.url || cached.blob)) {
      let audioUrl: string | null = null
      if (cached.url) {
        audioUrl = cached.url
      } else if (cached.blob) {
        audioUrl = URL.createObjectURL(cached.blob)
        ttsAudioUrlRef.current = audioUrl
      }

      if (audioUrl) {
        const audio = new Audio(audioUrl)
        audio.playbackRate = timeline?.playbackSpeed ?? 1.0
        ttsAudioRef.current = audio

        try {
          await new Promise<void>((resolve) => {
            const handleEnded = () => {
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              resolve()
            }

            const handleError = () => {
              console.error('[씬 재생] TTS 재생 오류')
              audio.removeEventListener('ended', handleEnded)
              audio.removeEventListener('error', handleError)
              resolve()
            }

            audio.addEventListener('ended', handleEnded)
            audio.addEventListener('error', handleError)

            audio.play()
              .then(() => {
                // 재생 시작 성공
              })
              .catch((error) => {
                console.error('[씬 재생] TTS 재생 시작 실패:', error)
                handleError()
              })
          })
        } finally {
          // 재생 완료 후 정리
          stopTtsAudio()
          lastRenderedSceneIndexRef.current = sceneIndex
        }
      }
    }
  }, [
    timeline,
    voiceTemplate,
    makeTtsKey,
    ttsCacheRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    setIsPreparing,
    setIsTtsBootstrapping,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    renderSceneContent,
    renderSceneImage,
    textsRef,
    getMp3DurationSec,
  ])

  return {
    playScene,
  }
}

