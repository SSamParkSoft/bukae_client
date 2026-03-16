'use client'

import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { useProTransportRenderer } from './playback/useProTransportRenderer'
import { useProTransportTtsSync } from './playback/useProTransportTtsSync'
import { useProTransportPlayback } from './playback/useProTransportPlayback'
import { useProFabricEditLayer } from './editing/useProFabricEditLayer'
import { useTimelineChangeHandler } from './timeline'
import { useBgmPlayback, useSoundEffectSegments } from './audio'
import { useBgmManager } from '@/hooks/video/audio/useBgmManager'
import { useSoundEffectManager } from '@/hooks/video/audio/useSoundEffectManager'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getPlayableScenes, getDurationBeforeSceneIndex, getPlayableSceneStartTime } from '../utils/proPlaybackUtils'
import { videoSpriteAdapter } from './playback/media/videoSpriteAdapter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { calculateSpriteParams } from '@/utils/pixi/sprite'
import { getSubtitlePosition } from '@/hooks/video/renderer/utils/getSubtitlePosition'
import { getPreviewLetterSpacing, getPreviewStrokeWidth } from '@/hooks/video/renderer/subtitle/previewStroke'
import { usePixiApp, STAGE_WIDTH, STAGE_HEIGHT, hideText } from './usePixiApp'
import type { ProStep3Scene } from '../model/types'
import type { TimelineData } from '@/lib/types/domain/timeline'

export interface UseProStep3ContainerParams {
  scenes: ProStep3Scene[]
  currentSceneIndex: number
  isPlaying: boolean
  scenePlaybackRequest?: { sceneIndex: number; requestId: number } | null
  confirmedBgmTemplate?: string | null
  onBeforePlay?: () => boolean
  onPlayingChange?: (isPlaying: boolean) => void
  onScenePlaybackComplete?: () => void
}

const VIDEO_METADATA_TIMEOUT_MS = 5000
const VIDEO_SEEK_TIMEOUT_MS = 1200

/**
 * Pro step3 오케스트레이션 훅
 * 모든 비즈니스 로직을 포함하고 UI는 순수하게 렌더링만 담당하도록 함
 */
export function useProStep3Container(params: UseProStep3ContainerParams) {
  const {
    scenes,
    currentSceneIndex,
    isPlaying,
    scenePlaybackRequest,
    confirmedBgmTemplate,
    onBeforePlay,
    onPlayingChange,
    onScenePlaybackComplete,
  } = params

  // ===== Refs =====
  const scenesRef = useRef(scenes)
  const currentSceneIndexRef = useRef(currentSceneIndex)
  const timelineRef = useRef<TimelineData | null>(null)
  const setupSpriteClickEventRef = useRef<(sceneIndex: number, sprite: PIXI.Sprite) => boolean>(() => false)

  const ttsAudioRefsRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const ttsCacheRef = useRef<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>(new Map())

  // ===== PixiJS 인프라 =====
  const {
    playbackContainerRef,
    pixiContainerRef,
    timelineBarRef,
    appRef,
    rootContainerRef,
    videoContainerRef,
    subtitleContainerRef,
    spritesRef,
    videoTexturesRef,
    videoElementsRef,
    textsRef,
    textStrokesRef,
    sceneLoadingStateRef,
    pixiReady,
    canvasDisplaySize,
    cleanupSceneResources,
    cleanupAllMediaResources: _cleanupAllMediaResources,
  } = usePixiApp({ ttsCacheRef, ttsAudioRefsRef })
  const scenePlaybackEndTimeRef = useRef<number | null>(null)
  const scenePlaybackSceneIndexRef = useRef<number | null>(null)
  const lastHandledScenePlaybackRequestIdRef = useRef<number | null>(null)
  const lastBgmSeekTimeRef = useRef<number | null>(null)

  // ===== State =====
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [ttsCacheVersion, setTtsCacheVersion] = useState(0)

  // ===== Refs 동기화 =====
  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  // ===== TTS 캐시 로딩 =====
  const storeScenes = useVideoCreateStore((state) => state.scenes)
  useEffect(() => {
    if (!storeScenes || storeScenes.length === 0) {
      return
    }

    let cancelled = false

    const loadPromises = storeScenes.map((storeScene) => {
      return new Promise<void>((resolve) => {
        if (cancelled) {
          resolve()
          return
        }

        const extended = storeScene as SceneScript & {
          ttsAudioBase64?: string
          voiceTemplate?: string | null
          selectionStartSeconds?: number
          selectionEndSeconds?: number
        }

        if (!extended.ttsAudioBase64 || !extended.script || !extended.voiceTemplate) {
          resolve()
          return
        }

        const ttsKey = `${extended.voiceTemplate}::${extended.script}`
        const existingCache = ttsCacheRef.current.get(ttsKey)
        if (existingCache && existingCache.url) {
          resolve()
          return
        }

        try {
          const base64Data = extended.ttsAudioBase64
          const binaryString = atob(base64Data)
          const byteArray = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            byteArray[i] = binaryString.charCodeAt(i)
          }
          const blob = new Blob([byteArray], { type: 'audio/mpeg' })

          const cacheUrl = URL.createObjectURL(blob)
          const audio = new Audio(cacheUrl)

          const cleanup = () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
            audio.removeEventListener('error', onError)
          }

          const onLoadedMetadata = () => {
            if (cancelled) {
              URL.revokeObjectURL(cacheUrl)
              cleanup()
              resolve()
              return
            }

            const duration = audio.duration
            audio.src = ''

            if (!ttsCacheRef.current.has(ttsKey)) {
              ttsCacheRef.current.set(ttsKey, {
                blob,
                durationSec: duration,
                url: cacheUrl,
              })
            } else {
              URL.revokeObjectURL(cacheUrl)
            }

            cleanup()
            resolve()
          }

          const onError = () => {
            URL.revokeObjectURL(cacheUrl)
            cleanup()
            resolve()
          }

          audio.addEventListener('loadedmetadata', onLoadedMetadata)
          audio.addEventListener('error', onError)
          audio.load()
        } catch {
          resolve()
        }
      })
    })

    Promise.all(loadPromises).then(() => {
      if (!cancelled) {
        setTtsCacheVersion((prev) => prev + 1)
      }
    })

    return () => {
      cancelled = true
    }
  }, [storeScenes])

  // ===== 이미지 로딩 =====
  const loadImageAsSprite = useCallback(async (sceneIndex: number, imageUrl: string): Promise<void> => {
    if (!pixiReady) {
      console.warn('[loadImageAsSprite] pixiReady가 false입니다', { sceneIndex, imageUrl })
      return
    }

    // 로딩 시작 상태 업데이트
    const updateLoadingState = (updates: { status: 'loading' | 'ready' | 'failed', videoReady?: boolean, spriteReady?: boolean }) => {
      const current = sceneLoadingStateRef.current.get(sceneIndex) ?? {
        status: 'not-loaded' as const,
        timestamp: Date.now(),
        videoReady: false,
        spriteReady: false,
      }

      sceneLoadingStateRef.current.set(sceneIndex, {
        ...current,
        ...updates,
        timestamp: Date.now(),
      })
    }

    updateLoadingState({ status: 'loading' })

    cleanupSceneResources(sceneIndex)

    try {
      const app = appRef.current
      const videoContainer = videoContainerRef.current
      if (!app || !videoContainer || !app.screen) {
        cleanupSceneResources(sceneIndex)
        return
      }

      // 이미지 텍스처 로드
      const texture = await PIXI.Assets.load(imageUrl)
      if (!texture || texture.destroyed) {
        cleanupSceneResources(sceneIndex)
        updateLoadingState({ status: 'failed' })
        return
      }

      // 로딩이 끝난 시점에 현재 타임라인의 이미지/비디오가 여전히 동일한지 확인
      const currentTimelineState = useVideoCreateStore.getState().timeline
      const currentTimelineScene = currentTimelineState?.scenes?.[sceneIndex]
      if (currentTimelineScene) {
        const currentImageUrl = currentTimelineScene.image
        const currentVideoUrl = currentTimelineScene.videoUrl
        const mediaType = currentTimelineScene.mediaType

        const isStillImageScene =
          mediaType === 'image' ||
          (!!currentImageUrl && (!currentVideoUrl || currentVideoUrl.trim().length === 0))

        const isUrlMismatched = !!currentImageUrl && currentImageUrl !== imageUrl

        // 씬이 더 이상 이미지 씬이 아니거나, 다른 이미지로 교체된 경우 이 로딩 결과는 폐기
        if (!isStillImageScene || isUrlMismatched) {
          texture.destroy(true)
          cleanupSceneResources(sceneIndex)
          updateLoadingState({ status: 'failed' })
          return
        }
      }

      videoTexturesRef.current.set(sceneIndex, texture)

      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5, 0.5)

      const stageWidth = app.screen.width
      const stageHeight = app.screen.height

      const sourceWidth = texture.width || stageWidth
      const sourceHeight = texture.height || stageHeight

      if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
        sprite.destroy()
        cleanupSceneResources(sceneIndex)
        updateLoadingState({ status: 'failed' })
        return
      }

      const currentTimeline = useVideoCreateStore.getState().timeline
      const timelineScene = currentTimeline?.scenes?.[sceneIndex]
      const imageTransform = timelineScene?.imageTransform
      const imageFit = timelineScene?.imageFit ?? 'contain'

      if (imageTransform) {
        sprite.x = imageTransform.x
        sprite.y = imageTransform.y
        sprite.width = imageTransform.width
        sprite.height = imageTransform.height
        sprite.rotation = imageTransform.rotation ?? 0
      } else {
        const fitted = calculateSpriteParams(
          sourceWidth,
          sourceHeight,
          stageWidth,
          stageHeight,
          imageFit
        )
        sprite.width = fitted.width
        sprite.height = fitted.height
        sprite.x = fitted.x + fitted.width / 2
        sprite.y = fitted.y + fitted.height / 2
        sprite.rotation = 0
      }

      // 초기 상태는 숨김 — 전환 효과가 있는 경우 applyVisualState가 올바른 alpha로 렌더링
      sprite.visible = false
      sprite.alpha = 0

      const finalApp = appRef.current
      const finalVideoContainer = videoContainerRef.current
      if (!finalApp || !finalVideoContainer || !finalApp.screen) {
        sprite.destroy()
        cleanupSceneResources(sceneIndex)
        return
      }

      finalVideoContainer.addChild(sprite)
      spritesRef.current.set(sceneIndex, sprite)

      // 스프라이트 생성 완료 상태 업데이트 (videoReady=true: 이미지는 비디오 요소 불필요하므로 준비 완료로 간주)
      updateLoadingState({ status: 'ready', videoReady: true, spriteReady: true })

      requestAnimationFrame(() => {
        setupSpriteClickEventRef.current(sceneIndex, sprite)
      })
    } catch (error) {
      // 로딩 실패 상태 업데이트
      updateLoadingState({ status: 'failed' })
      cleanupSceneResources(sceneIndex)
      console.warn('[loadImageAsSprite] 로딩 실패:', error)
    }
  }, [cleanupSceneResources, pixiReady, sceneLoadingStateRef, appRef, videoContainerRef, videoTexturesRef, spritesRef, setupSpriteClickEventRef])

  // ===== 비디오 로딩 =====
  const loadVideoAsSprite = useCallback(async (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number, onLoadingStateChange?: (sceneIndex: number, updates: { status: 'loading' | 'ready' | 'failed', videoReady?: boolean, spriteReady?: boolean }) => void): Promise<void> => {
    if (!pixiReady) {
      console.warn('[loadVideoAsSprite] pixiReady가 false입니다', { sceneIndex, videoUrl })
      return
    }

    // 로딩 시작 상태 업데이트
    const updateLoadingState = (updates: { status: 'loading' | 'ready' | 'failed', videoReady?: boolean, spriteReady?: boolean }) => {
      const current = sceneLoadingStateRef.current.get(sceneIndex) ?? {
        status: 'not-loaded' as const,
        timestamp: Date.now(),
        videoReady: false,
        spriteReady: false,
      }

      sceneLoadingStateRef.current.set(sceneIndex, {
        ...current,
        ...updates,
        timestamp: Date.now(),
      })

      // 외부 콜백도 호출
      onLoadingStateChange?.(sceneIndex, updates)
    }

    updateLoadingState({ status: 'loading' })

    cleanupSceneResources(sceneIndex)

    const video = videoSpriteAdapter.createElement(videoUrl)

    try {
      await videoSpriteAdapter.waitForMetadata(video, VIDEO_METADATA_TIMEOUT_MS)

      const app = appRef.current
      const videoContainer = videoContainerRef.current
      if (!app || !videoContainer || !app.screen) {
        cleanupSceneResources(sceneIndex)
        return
      }

      if (!video || !video.videoWidth || !video.videoHeight || video.videoWidth <= 0 || video.videoHeight <= 0) {
        cleanupSceneResources(sceneIndex)
        return
      }

      const texture = PIXI.Texture.from(video)
      if (!texture || texture.destroyed) {
        cleanupSceneResources(sceneIndex)
        return
      }

      videoTexturesRef.current.set(sceneIndex, texture)
      videoElementsRef.current.set(sceneIndex, video)

      const sceneStart = selectionStartSeconds ?? scenesRef.current[sceneIndex]?.selectionStartSeconds ?? 0
      await videoSpriteAdapter.seekFrame(video, sceneStart, VIDEO_SEEK_TIMEOUT_MS)
      
      const appAfterSeek = appRef.current
      const videoContainerAfterSeek = videoContainerRef.current
      if (!appAfterSeek || !videoContainerAfterSeek || !appAfterSeek.screen || texture.destroyed) {
        cleanupSceneResources(sceneIndex)
        return
      }

      await new Promise<void>((resolve) => {
        let resolved = false
        const cleanup = () => {
          if (resolved) return
          resolved = true
          video.pause()
          resolve()
        }
        
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
          const handleFrame = () => {
            cleanup()
          }
          try {
            ;(video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(handleFrame)
            const playPromise = video.play()
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                if (error instanceof DOMException && error.name !== 'AbortError') {
                  console.warn('[loadVideoAsSprite] 비디오 재생 실패:', error)
                }
                cleanup()
              })
            }
            setTimeout(cleanup, 1000)
          } catch {
            cleanup()
          }
        } else {
          const handleTimeUpdate = () => {
            cleanup()
          }
          video.addEventListener('timeupdate', handleTimeUpdate, { once: true })
          
          const playPromise = video.play()
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              if (error instanceof DOMException && error.name !== 'AbortError') {
                console.warn('[loadVideoAsSprite] 비디오 재생 실패:', error)
              }
              cleanup()
            })
          }
          
          setTimeout(cleanup, 1000)
        }
      })
      
      if (texture && !texture.destroyed && typeof (texture as { update?: () => void }).update === 'function') {
        try {
          ;(texture as { update: () => void }).update()
        } catch {
          // VideoTexture 업데이트 실패
        }
      }

      const currentVideo = videoElementsRef.current.get(sceneIndex)
      if (!currentVideo || currentVideo !== video) {
        cleanupSceneResources(sceneIndex)
        return
      }

      if (!currentVideo) {
        cleanupSceneResources(sceneIndex)
        return
      }

      if (!currentVideo.videoWidth && !currentVideo.videoHeight) {
        cleanupSceneResources(sceneIndex)
        return
      }

      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5, 0.5)

      const stageWidth = appAfterSeek.screen.width
      const stageHeight = appAfterSeek.screen.height
      
      const sourceWidth = (currentVideo && currentVideo.videoWidth) || texture.width || stageWidth
      const sourceHeight = (currentVideo && currentVideo.videoHeight) || texture.height || stageHeight

      if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
        sprite.destroy()
        cleanupSceneResources(sceneIndex)
        return
      }

      const currentTimeline = useVideoCreateStore.getState().timeline
      const timelineScene = currentTimeline?.scenes?.[sceneIndex]
      const imageTransform = timelineScene?.imageTransform
      const imageFit = timelineScene?.imageFit ?? 'contain'

      if (imageTransform) {
        sprite.x = imageTransform.x
        sprite.y = imageTransform.y
        sprite.width = imageTransform.width
        sprite.height = imageTransform.height
        sprite.rotation = imageTransform.rotation ?? 0
      } else {
        const fitted = calculateSpriteParams(
          sourceWidth,
          sourceHeight,
          stageWidth,
          stageHeight,
          imageFit
        )
        sprite.width = fitted.width
        sprite.height = fitted.height
        sprite.x = fitted.x + fitted.width / 2
        sprite.y = fitted.y + fitted.height / 2
        sprite.rotation = 0
      }

      // 초기 상태는 숨김 — 전환 효과가 있는 경우 applyVisualState가 올바른 alpha로 렌더링
      sprite.visible = false
      sprite.alpha = 0

      const finalApp = appRef.current
      const finalVideoContainer = videoContainerRef.current
      if (!finalApp || !finalVideoContainer || !finalApp.screen) {
        sprite.destroy()
        cleanupSceneResources(sceneIndex)
        return
      }

      finalVideoContainer.addChild(sprite)
      spritesRef.current.set(sceneIndex, sprite)

      // 스프라이트 생성 완료 상태 업데이트
      updateLoadingState({ status: 'ready', videoReady: true, spriteReady: true })

      requestAnimationFrame(() => {
        setupSpriteClickEventRef.current(sceneIndex, sprite)
      })
    } catch (error) {
      // 로딩 실패 상태 업데이트
      updateLoadingState({ status: 'failed' })
      cleanupSceneResources(sceneIndex)
      console.warn('[loadVideoAsSprite] 로딩 실패:', error)
    }
  }, [cleanupSceneResources, pixiReady, sceneLoadingStateRef, appRef, videoContainerRef, videoTexturesRef, videoElementsRef, scenesRef, spritesRef, setupSpriteClickEventRef])

  // ===== 자막 렌더링 =====
  const renderSubtitle = useCallback((sceneIndex: number, script: string) => {
    const app = appRef.current
    const subtitleContainer = subtitleContainerRef.current
    if (!app || !subtitleContainer || !pixiReady) {
      return
    }

    textsRef.current.forEach((textObj) => {
      hideText(textObj)
    })
    textStrokesRef.current.forEach((strokeObj) => {
      hideText(strokeObj)
    })

    if (!script || !script.trim()) {
      return
    }

    const timelineScene = timelineRef.current?.scenes?.[sceneIndex]
    const textSettings = timelineScene?.text

    const stageWidth = app.screen.width
    const stageHeight = app.screen.height

    const fontFamily = textSettings?.font
      ? resolveSubtitleFontFamily(textSettings.font)
      : resolveSubtitleFontFamily('pretendard')

    const fontSize = textSettings?.fontSize || 80
    const fillColor = textSettings?.color || '#ffffff'
    const fontWeight = textSettings?.fontWeight ?? (textSettings?.style?.bold ? 700 : 400)
    const fontStyle = textSettings?.style?.italic ? 'italic' : 'normal'
    const isUnderline = textSettings?.style?.underline || false

    let textX = stageWidth / 2
    let textY = stageHeight * 0.885
    let wordWrapWidth = stageWidth * 0.75
    const textAlign = textSettings?.style?.align || 'center'

    if (textSettings?.transform) {
      textX = textSettings.transform.x || textX
      textY = textSettings.transform.y || textY
      if (textSettings.transform.width) {
        wordWrapWidth = textSettings.transform.width
      }
    } else {
      const subtitlePosition = timelineScene
        ? getSubtitlePosition(timelineScene, { width: stageWidth, height: stageHeight })
        : {
            x: stageWidth / 2,
            y: stageHeight - 200,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
          }
      textX = subtitlePosition.x
      textY = subtitlePosition.y
    }

    const strokeColor = textSettings?.stroke?.color || '#000000'
    const strokeWidth = getPreviewStrokeWidth(textSettings?.stroke?.width, {
      fontSize,
    })
    const letterSpacing = getPreviewLetterSpacing(strokeWidth, {
      fontSize,
    })

    // 기존 stroke 전용 텍스트 제거(테두리는 이제 글자 하나의 stroke 스타일로 처리)
    const existingStroke = textStrokesRef.current.get(sceneIndex)
    if (existingStroke) {
      if (existingStroke.parent === subtitleContainer) subtitleContainer.removeChild(existingStroke)
      if (!existingStroke.destroyed) existingStroke.destroy()
      textStrokesRef.current.delete(sceneIndex)
    }

    const styleConfig: Partial<PIXI.TextStyle> = {
      fontFamily,
      fontSize,
      fill: fillColor,
      align: textAlign as 'left' | 'center' | 'right' | 'justify',
      fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
      fontStyle,
      letterSpacing,
      wordWrap: true,
      wordWrapWidth: wordWrapWidth,
      breakWords: true,
      ...(strokeWidth > 0 ? { stroke: { color: strokeColor, width: strokeWidth } } : {}),
    }
    const textStyle = new PIXI.TextStyle(styleConfig)
    if (isUnderline) {
      ;(textStyle as PIXI.TextStyle & { underline?: boolean }).underline = true
    }

    let textObj = textsRef.current.get(sceneIndex)
    if (!textObj || textObj.destroyed) {
      textObj = new PIXI.Text({ text: script, style: textStyle })
      textObj.anchor.set(0.5, 0.5)
      subtitleContainer.addChild(textObj)
      textsRef.current.set(sceneIndex, textObj)
    } else {
      textObj.style = textStyle
      textObj.text = script
    }
    textObj.x = textX
    textObj.y = textY
    textObj.visible = true
    textObj.alpha = 1
  }, [pixiReady, appRef, subtitleContainerRef, textsRef, textStrokesRef, timelineRef])

  // ===== Timeline 및 상태 관리 =====
  const timeline = useVideoCreateStore((state) => state.timeline)
  const setTimeline = useVideoCreateStore((state) => state.setTimeline)

  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  const computedTotalDuration = useMemo(() => {
    return getPlayableScenes(scenes).reduce((sum, playable) => sum + playable.duration, 0)
  }, [scenes])

  const totalDurationValue = computedTotalDuration > 0 ? computedTotalDuration : totalDuration

  // 씬 선택 시 타임라인 위치 업데이트
  const previousSceneIndexForTimelineRef = useRef(currentSceneIndex)
  useEffect(() => {
    const previousSceneIndex = previousSceneIndexForTimelineRef.current
    previousSceneIndexForTimelineRef.current = currentSceneIndex

    if (!isPlaying && currentSceneIndex >= 0 && pixiReady) {
      if (previousSceneIndex === currentSceneIndex) {
        return
      }
      const previousDuration = getDurationBeforeSceneIndex(scenes, currentSceneIndex)
      const id = setTimeout(() => { setCurrentTime(previousDuration) }, 0)
      return () => clearTimeout(id)
    }
  }, [currentSceneIndex, scenes, isPlaying, pixiReady, setCurrentTime])

  // ===== Transport 및 렌더링 =====
  const { transportHook, transportState, renderAtRef } = useProTransportRenderer({
    timeline,
    scenes,
    pixiReady,
    appRef,
    spritesRef,
    videoElementsRef,
    currentSceneIndexRef,
    loadVideoAsSprite,
    loadImageAsSprite,
    renderSubtitle,
    sceneLoadingStateRef,
    cleanupSceneResources,
  })

  useProTransportTtsSync({
    transportHook,
    isPlaying: transportState.isPlaying,
    pixiReady,
    playbackSpeed,
    scenes,
    ttsCacheRef,
    ttsAudioRefsRef,
  })

  const { handlePlayPause } = useProTransportPlayback({
    transportHook,
    transportState,
    playbackSpeed,
    totalDurationValue,
    currentSceneIndex,
    scenes,
    pixiReady,
    renderAtRef,
    onBeforePlay,
    onPlayingChange,
    setCurrentTime,
    setTotalDuration,
  })

  const handleTimelineSeek = useCallback(
    (ratio: number) => {
      const duration = totalDurationValue > 0 ? totalDurationValue : totalDuration
      if (duration <= 0) return
      const time = Math.max(0, Math.min(duration, ratio * duration))
      transportHook.seek(time)
      setCurrentTime(time)
      if (renderAtRef.current) {
        renderAtRef.current(time, { forceRender: true })
      }
    },
    [
      totalDurationValue,
      totalDuration,
      transportHook,
      setCurrentTime,
      renderAtRef,
    ]
  )

  const {
    confirmedBgmTemplate: resolvedBgmTemplate,
    bgmAudioRef,
    startBgmAudio,
    pauseBgmAudio,
    resumeBgmAudio,
    stopBgmAudio,
    seekBgmAudio,
  } = useBgmManager({
    bgmTemplate: confirmedBgmTemplate ?? null,
    playbackSpeed,
    isPlaying: transportState.isPlaying,
  })

  useBgmPlayback({
    isPlaying: transportState.isPlaying,
    confirmedBgmTemplate: resolvedBgmTemplate,
    playbackSpeed,
    transport: transportHook,
    bgmAudioRef,
    startBgmAudio,
    pauseBgmAudio,
    resumeBgmAudio,
    stopBgmAudio,
  })

  // 정지/씬 이동 등 seek 시점에 BGM 위치를 현재 타임라인 시간에 맞춰 둔다.
  useEffect(() => {
    if (!resolvedBgmTemplate || transportState.isPlaying) {
      return
    }

    const pausedTime = transportHook.getTime()
    const lastSeekedTime = lastBgmSeekTimeRef.current
    if (lastSeekedTime !== null && Math.abs(lastSeekedTime - pausedTime) < 0.01) {
      return
    }
    seekBgmAudio(pausedTime)
    lastBgmSeekTimeRef.current = pausedTime
  }, [currentTime, resolvedBgmTemplate, seekBgmAudio, transportHook, transportState.isPlaying])

  useEffect(() => {
    return () => {
      stopBgmAudio()
    }
  }, [stopBgmAudio])

  const { getActiveSegmentForSoundEffect } = useSoundEffectSegments({
    scenes,
    timeline,
    ttsCacheRef,
    ttsCacheVersion,
  })

  useSoundEffectManager({
    timeline,
    isPlaying: transportState.isPlaying,
    currentTime,
    ttsCacheRef,
    // 내부 cleanup 로직이 동작하도록 truthy 플래그를 유지한다.
    voiceTemplate: '__pro_sound_effect__',
    buildSceneMarkup,
    makeTtsKey,
    getActiveSegment: getActiveSegmentForSoundEffect,
  })

  const clearScenePlaybackState = useCallback((notifyComplete: boolean) => {
    const hadScenePlayback = scenePlaybackSceneIndexRef.current !== null || scenePlaybackEndTimeRef.current !== null
    scenePlaybackSceneIndexRef.current = null
    scenePlaybackEndTimeRef.current = null
    if (notifyComplete && hadScenePlayback) {
      onScenePlaybackComplete?.()
    }
  }, [onScenePlaybackComplete])

  const handleScenePlaybackRequest = useCallback((sceneIndex: number) => {
    if (sceneIndex < 0 || sceneIndex >= scenes.length || !pixiReady) {
      onScenePlaybackComplete?.()
      return
    }

    const isSameScenePlayback =
      transportState.isPlaying &&
      scenePlaybackSceneIndexRef.current === sceneIndex &&
      scenePlaybackEndTimeRef.current !== null
    if (isSameScenePlayback) {
      const pausedTime = transportHook.getTime()
      setCurrentTime(pausedTime)
      transportHook.pause()
      onPlayingChange?.(false)
      clearScenePlaybackState(true)
      return
    }

    if (onBeforePlay && !onBeforePlay()) {
      onScenePlaybackComplete?.()
      return
    }

    const sceneStartTime = getPlayableSceneStartTime(scenes, sceneIndex)
    const playableScene = getPlayableScenes(scenes).find((item) => item.originalIndex === sceneIndex)
    if (sceneStartTime === null || !playableScene || playableScene.duration <= 0) {
      clearScenePlaybackState(true)
      return
    }

    const sceneEndTime = sceneStartTime + playableScene.duration
    scenePlaybackSceneIndexRef.current = sceneIndex
    scenePlaybackEndTimeRef.current = sceneEndTime

    transportHook.seek(sceneStartTime)
    setCurrentTime(sceneStartTime)
    if (renderAtRef.current) {
      renderAtRef.current(sceneStartTime, { forceSceneIndex: sceneIndex, forceRender: true })
    }

    onPlayingChange?.(true)
    if (!transportState.isPlaying) {
      transportHook.play()
    }
  }, [
    clearScenePlaybackState,
    onBeforePlay,
    onPlayingChange,
    onScenePlaybackComplete,
    pixiReady,
    renderAtRef,
    scenes,
    setCurrentTime,
    transportHook,
    transportState.isPlaying,
  ])

  const scenePlaybackRequestId = scenePlaybackRequest?.requestId ?? null
  useEffect(() => {
    if (!scenePlaybackRequest) {
      return
    }
    if (lastHandledScenePlaybackRequestIdRef.current === scenePlaybackRequest.requestId) {
      return
    }
    lastHandledScenePlaybackRequestIdRef.current = scenePlaybackRequest.requestId
    const sceneIndex = scenePlaybackRequest.sceneIndex
    const id = setTimeout(() => { handleScenePlaybackRequest(sceneIndex) }, 0)
    return () => clearTimeout(id)
  }, [handleScenePlaybackRequest, scenePlaybackRequest, scenePlaybackRequestId])

  useEffect(() => {
    if (!transportState.isPlaying) {
      return
    }
    const sceneEndTime = scenePlaybackEndTimeRef.current
    const sceneIndex = scenePlaybackSceneIndexRef.current
    if (sceneEndTime === null || sceneIndex === null) {
      return
    }

    const now = transportHook.getTime()
    if (now < sceneEndTime - 0.01) {
      return
    }

    const finalTime = Math.max(0, sceneEndTime)
    transportHook.pause()
    transportHook.seek(finalTime)
    setCurrentTime(finalTime)
    if (renderAtRef.current) {
      renderAtRef.current(finalTime, { forceSceneIndex: sceneIndex, forceRender: true })
    }
    onPlayingChange?.(false)
    clearScenePlaybackState(true)
  }, [
    clearScenePlaybackState,
    currentTime,
    onPlayingChange,
    renderAtRef,
    setCurrentTime,
    transportHook,
    transportState.isPlaying,
  ])

  useEffect(() => {
    if (transportState.isPlaying) {
      return
    }
    if (scenePlaybackSceneIndexRef.current === null && scenePlaybackEndTimeRef.current === null) {
      return
    }
    clearScenePlaybackState(true)
  }, [clearScenePlaybackState, transportState.isPlaying])

  const timelineScenesKey = useMemo(() => {
    if (!timeline?.scenes || timeline.scenes.length === 0) return ''
    return timeline.scenes
      .map(
        (scene, idx) =>
          `${idx}-${scene.imageFit || 'contain'}-${scene.imageTransform ? JSON.stringify(scene.imageTransform) : 'none'}-${scene.text?.content || ''}`
      )
      .join('|')
  }, [timeline])

  // ===== Fabric 편집 레이어 =====
  const currentScene = scenes[currentSceneIndex]
  const currentSceneVideoUrl = currentScene?.videoUrl ?? undefined
  const currentSceneScript = currentScene?.script ?? ''

  const {
    editMode,
    setEditMode,
    enterEditMode,
    proFabricCanvasRef,
    fabricReady,
    syncFabricScene,
    syncFromSceneDirect,
  } = useProFabricEditLayer({
    appRef,
    subtitleContainerRef,
    spritesRef,
    textsRef,
    videoElementsRef,
    playbackContainerRef,
    canvasDisplaySize,
    currentSceneIndex,
    currentSceneIndexRef,
    isPlaying,
    pixiReady,
    timeline,
    setTimeline,
    currentSceneVideoUrl,
    setupSpriteClickEventRef,
  })


  // ===== 자막 렌더링 (씬 변경 시) =====
  const subtitleSettingsKey = useMemo(() => {
    return JSON.stringify(timeline?.scenes?.[currentSceneIndex]?.text ?? null)
  }, [timeline, currentSceneIndex])

  useEffect(() => {
    if (!pixiReady || isPlaying || currentSceneIndex < 0) {
      return
    }

    renderSubtitle(currentSceneIndex, currentSceneScript)
  }, [
    subtitleSettingsKey,
    currentSceneIndex,
    currentSceneScript,
    isPlaying,
    pixiReady,
    renderSubtitle,
  ])

  // ===== Timeline Change Handler =====
  useTimelineChangeHandler({
    timeline,
    renderAtRef,
    pixiReady,
    isPlaying: transportState.isPlaying,
    transport: transportHook,
  })

  // ===== 초기화 =====
  const hasInitializedRef = useRef(false)
  useEffect(() => {
    if (transportState.isPlaying) {
      hasInitializedRef.current = true
    }
  }, [transportState.isPlaying])

  useEffect(() => {
    if (!pixiReady || hasInitializedRef.current || !renderAtRef.current || scenes.length === 0) return

    const existingTime = transportHook.getTime()
    if (transportState.isPlaying || existingTime > 0.001) {
      hasInitializedRef.current = true
      return
    }
    
    transportHook.seek(0)
    const id = setTimeout(() => { setCurrentTime(0) }, 0)
    
    if (currentSceneIndex >= 0) {
      renderAtRef.current(0, { forceSceneIndex: currentSceneIndex, forceRender: true })
    } else {
      renderAtRef.current(0, { forceRender: true })
    }
    
    hasInitializedRef.current = true
    return () => clearTimeout(id)
  }, [pixiReady, transportState.isPlaying, transportHook, renderAtRef, scenes, currentSceneIndex, setCurrentTime])

  useEffect(() => {
    if (!pixiReady || transportState.isPlaying || !renderAtRef.current) return
    if (editMode !== 'none') return
    const t = transportHook.getTime()
    renderAtRef.current(t, { skipAnimation: false, forceRender: true })
  }, [timelineScenesKey, pixiReady, transportState.isPlaying, transportHook, renderAtRef, editMode])

  // 씬별 미디어 URL(videoUrl/imageUrl) 변경 감지 → 이전 스프라이트 정리 + 강제 리렌더
  const sceneMediaUrlsKey = useMemo(
    () =>
      scenes
        .map((s, i) => `${i}:${s.videoUrl ?? ''}|${s.imageUrl ?? ''}`)
        .join(','),
    [scenes]
  )
  const prevSceneMediaUrlsKeyRef = useRef<string>('')
  useEffect(() => {
    if (!pixiReady) return
    const prev = prevSceneMediaUrlsKeyRef.current
    const curr = sceneMediaUrlsKey
    if (prev === curr) return
    prevSceneMediaUrlsKeyRef.current = curr

    if (prev === '') return // 최초 마운트는 건너뜀

    // 변경된 씬 인덱스 찾아서 스프라이트 정리
    const prevParts = prev.split(',')
    const currParts = curr.split(',')
    currParts.forEach((part, i) => {
      if (prevParts[i] !== part) {
        cleanupSceneResources(i)
      }
    })

    if (!renderAtRef.current || transportState.isPlaying) return
    const t = transportHook.getTime()
    renderAtRef.current(t, { forceRender: true })
  }, [sceneMediaUrlsKey, pixiReady, cleanupSceneResources, renderAtRef, transportState.isPlaying, transportHook])

  const applySceneImageFitToSprite = useCallback(
    (sceneIndex: number, fit: 'cover' | 'contain' | 'fill') => {
      const sprite = spritesRef.current.get(sceneIndex)
      if (!sprite || sprite.destroyed) {
        return false
      }

      const app = appRef.current
      const stageWidth = app?.screen?.width || STAGE_WIDTH
      const stageHeight = app?.screen?.height || STAGE_HEIGHT
      if (stageWidth <= 0 || stageHeight <= 0) {
        return false
      }

      const videoElement = videoElementsRef.current.get(sceneIndex)
      const sourceWidth = videoElement?.videoWidth || sprite.texture?.width || stageWidth
      const sourceHeight = videoElement?.videoHeight || sprite.texture?.height || stageHeight
      if (sourceWidth <= 0 || sourceHeight <= 0) {
        return false
      }

      const fitted = calculateSpriteParams(
        sourceWidth,
        sourceHeight,
        stageWidth,
        stageHeight,
        fit
      )

      sprite.width = fitted.width
      sprite.height = fitted.height
      sprite.x = fitted.x + fitted.width / 2
      sprite.y = fitted.y + fitted.height / 2
      sprite.rotation = 0
      sprite.visible = true
      sprite.alpha = 1

      if (app) {
        try {
          app.renderer.render(app.stage)
        } catch {
          // no-op
        }
      }

      return true
    },
    [spritesRef, appRef, videoElementsRef]
  )

  const handleSceneImageFitChange = useCallback(
    (index: number, fit: 'cover' | 'contain' | 'fill') => {
      const currentTimeline = timelineRef.current ?? timeline
      if (!currentTimeline?.scenes?.[index]) {
        return
      }

      const nextTimeline: TimelineData = {
        ...currentTimeline,
        scenes: currentTimeline.scenes.map((scene, sceneIndex) =>
          sceneIndex === index
            ? { ...scene, imageFit: fit, imageTransform: undefined }
            : scene
        ),
      }

      timelineRef.current = nextTimeline
      setTimeline(nextTimeline)
      const applied = applySceneImageFitToSprite(index, fit)

      if (!transportState.isPlaying && index === currentSceneIndex) {
        if (!applied && renderAtRef.current) {
          const t = transportHook.getTime()
          renderAtRef.current(t, { forceSceneIndex: index, forceRender: true })
        }

        if (syncFromSceneDirect) {
          void syncFromSceneDirect()
        }
      }
    },
    [
      applySceneImageFitToSprite,
      currentSceneIndex,
      renderAtRef,
      setTimeline,
      syncFromSceneDirect,
      timeline,
      transportHook,
      transportState.isPlaying,
    ]
  )

  return {
    // Refs
    playbackContainerRef,
    pixiContainerRef,
    timelineBarRef,
    appRef,
    rootContainerRef,
    videoContainerRef,
    subtitleContainerRef,
    ttsCacheRef,

    // State
    currentTime,
    setCurrentTime,
    totalDuration,
    setTotalDuration,
    playbackSpeed,
    setPlaybackSpeed,
    pixiReady,
    canvasDisplaySize,
    editMode,
    setEditMode,
    
    // Handlers
    handlePlayPause,
    handleTimelineSeek,
    handleSceneImageFitChange,
    
    // Fabric
    syncFabricScene,
    syncFromSceneDirect,
    proFabricCanvasRef,
    fabricReady,
    
    // Timeline
    timeline,
    setTimeline,
    
    // Transport
    transportHook,
    transportState,
    renderAtRef,
    enterEditMode,
  }
}
