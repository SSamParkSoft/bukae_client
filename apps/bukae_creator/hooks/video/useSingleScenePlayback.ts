'use client'

import { useCallback, useState, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { makeMarkupFromPlainText } from '@/lib/tts/auto-pause'
import { authStorage } from '@/lib/api/auth-storage'
import { useTtsResources } from './useTtsResources'

interface UseSingleScenePlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  makeTtsKey: (voiceName: string, markup: string) => string
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
  containerRef: React.RefObject<PIXI.Container | null>
  getMp3DurationSec: (blob: Blob) => Promise<number>
  activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  spritesRef?: React.MutableRefObject<Map<number, PIXI.Sprite>>
}

export function useSingleScenePlayback({
  timeline,
  voiceTemplate,
  makeTtsKey,
  setIsPreparing,
  setIsTtsBootstrapping,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setCurrentSceneIndex,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  renderSceneContent,
  renderSceneImage,
  textsRef,
  containerRef,
  getMp3DurationSec,
  activeAnimationsRef,
  spritesRef,
}: UseSingleScenePlaybackParams) {
  // TTS 리소스 가져오기
  const { ttsCacheRef, ttsAudioRef, ttsAudioUrlRef, stopTtsAudio } = useTtsResources()
  // 현재 재생 중인 씬 인덱스 추적
  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null)
  const playingSceneIndexRef = useRef<number | null>(null)
  
  // 씬 재생 정지 함수
  const stopScene = useCallback(() => {
    // 진행 중인 전환 효과 애니메이션 중지
    if (activeAnimationsRef) {
      activeAnimationsRef.current.forEach((tl) => {
        if (tl && tl.isActive()) {
          tl.kill()
        }
      })
      activeAnimationsRef.current.clear()
    }
    
    // 현재 재생 중인 씬의 스프라이트와 텍스트를 alpha: 1로 복원
    const currentSceneIndex = playingSceneIndexRef.current
    if (currentSceneIndex !== null) {
      if (spritesRef) {
        const currentSprite = spritesRef.current.get(currentSceneIndex)
        if (currentSprite) {
          currentSprite.alpha = 1
          currentSprite.visible = true
        }
      }
      if (textsRef) {
        const currentText = textsRef.current.get(currentSceneIndex)
        if (currentText) {
          currentText.alpha = 1
          currentText.visible = true
        }
      }
    }
    
    // TTS 오디오 정지
    stopTtsAudio()
    
    // 재생 중인 씬 인덱스 초기화
    setPlayingSceneIndex(null)
    playingSceneIndexRef.current = null
  }, [stopTtsAudio, activeAnimationsRef, spritesRef, textsRef])
  

  const playScene = useCallback(async (sceneIndex: number) => {
    if (!timeline || !voiceTemplate) {
      return
    }
    
    // 이미 같은 씬이 재생 중이면 정지
    if (playingSceneIndexRef.current === sceneIndex && ttsAudioRef.current) {
      stopScene()
      return
    }
    
    // 다른 씬이 재생 중이면 먼저 정지
    if (playingSceneIndexRef.current !== null && playingSceneIndexRef.current !== sceneIndex) {
      stopScene()
    }
    
    // 재생 중인 씬 인덱스 설정
    setPlayingSceneIndex(sceneIndex)
    playingSceneIndexRef.current = sceneIndex
    
    // 씬 재생 시작 전에 컨테이너의 모든 자식 제거 및 숨김
    if (containerRef.current) {
      // 컨테이너의 모든 자식을 제거 (스프라이트와 텍스트 모두)
      const container = containerRef.current
      const containerChildren = Array.from(container.children)
      containerChildren.forEach((child) => {
        container.removeChild(child)
        if (child instanceof PIXI.Sprite) {
          child.visible = false
          child.alpha = 0
        } else if (child instanceof PIXI.Text) {
          child.visible = false
          child.alpha = 0
        }
      })
    }
    
    // spritesRef와 textsRef의 모든 요소도 숨김 (useGroupPlayback와 동일하게)
    spritesRef?.current.forEach((sprite) => {
      if (sprite) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })
    textsRef.current.forEach((text) => {
      if (text) {
        text.visible = false
        text.alpha = 0
      }
    })

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
          const errorMessage = errorData.error || errorData.message || 'TTS 합성 실패'
          
          // 인증 오류인 경우 특별 처리
          if (response.status === 401 || 
              errorMessage.includes('인증') || 
              errorMessage.includes('로그인') ||
              errorMessage.includes('유효하지 않습니다')) {
            throw new Error(errorMessage)
          }
          
          throw new Error(errorMessage)
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
        
        // 인증 오류인 경우 에러를 다시 throw하여 상위에서 처리할 수 있도록 함
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('인증') || 
            errorMessage.includes('로그인') ||
            errorMessage.includes('유효하지 않습니다')) {
          throw error
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
    stopTtsAudio()

    // 씬리스트 패널 업데이트
    // ref만 업데이트, 상태는 업데이트하지 않아서 중복 렌더링 방지
    // renderSceneContent에서 렌더링이 처리되므로 setCurrentSceneIndex는 호출하지 않음
    currentSceneIndexRef.current = sceneIndex

    // 전환 효과 이미지 렌더링
    let previousSceneIndex: number | null = null
    const lastRenderedIndex = lastRenderedSceneIndexRef.current
    
    // 이전 씬 정리 (렌더링 시작 전에 먼저 처리 - 반드시 먼저 실행)
    // 모든 다른 씬 숨기기 (현재 씬 제외)
    spritesRef?.current.forEach((sprite, idx) => {
      if (sprite && idx !== sceneIndex) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })
    textsRef.current.forEach((text, idx) => {
      if (text && idx !== sceneIndex) {
        text.visible = false
        text.alpha = 0
      }
    })
    
    // previousIndex 설정
    if (lastRenderedIndex !== null && lastRenderedIndex !== sceneIndex) {
      previousSceneIndex = lastRenderedIndex
    }

    // 이미지 전환 효과와 자막 렌더링 (비동기로 시작만 하고 await하지 않음)
    if (renderSceneContent) {
      // 렌더링 경로 확인: 씬 재생에서 renderSceneContent 사용
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
            let isResolved = false
            const resolveOnce = () => {
              if (isResolved) return
              isResolved = true
              resolve()
            }

            const handleEnded = () => {
              // 오디오가 이미 정리되었는지 확인
              if (ttsAudioRef.current !== audio) {
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
              // 오디오가 이미 정리되었는지 확인 (정지 버튼으로 인한 정지인 경우)
              if (ttsAudioRef.current !== audio) {
                // 정지 버튼으로 인한 정지인 경우 오류 로그 출력 안 함
                resolveOnce()
                return
              }
              // 실제 오류인 경우에만 로그 출력 (하지만 정지 시 발생하는 오류는 출력 안 함)
              // 정지 시 발생하는 오류는 로그 출력하지 않음
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

            audio.play()
              .then(() => {
                // 재생 시작 성공
              })
              .catch(() => {
                // 오디오가 이미 정리되었는지 확인 (정지 버튼으로 인한 정지인 경우)
                if (ttsAudioRef.current !== audio) {
                  // 정지 버튼으로 인한 정지인 경우 오류 로그 출력 안 함
                  resolveOnce()
                  return
                }
                // 실제 오류인 경우에만 로그 출력 (하지만 정지 시 발생하는 오류는 출력 안 함)
                handleError()
              })
          })
        } finally {
          // 재생 완료 후 정리
          stopTtsAudio()
          lastRenderedSceneIndexRef.current = sceneIndex
          
          // 재생 중인 씬 인덱스 초기화
          if (playingSceneIndexRef.current === sceneIndex) {
            setPlayingSceneIndex(null)
            playingSceneIndexRef.current = null
          }
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
    stopTtsAudio,
    setIsPreparing,
    setIsTtsBootstrapping,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    renderSceneContent,
    renderSceneImage,
    textsRef,
    containerRef,
    getMp3DurationSec,
    stopScene,
    spritesRef,
  ])

  return {
    playScene,
    stopScene,
    playingSceneIndex,
  }
}

