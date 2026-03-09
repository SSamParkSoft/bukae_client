'use client'

import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { useProTransportRenderer } from './playback/useProTransportRenderer'
import { useProTransportTtsSync } from './playback/useProTransportTtsSync'
import { useProTransportPlayback } from './playback/useProTransportPlayback'
import { useProFabricResizeDrag } from './editing/useProFabricResizeDrag'
import { useProEditModeManager } from './editing/useProEditModeManager'
import { useTimelineChangeHandler } from './timeline'
import { useBgmPlayback } from './audio'
import { useBgmManager } from '@/hooks/video/audio/useBgmManager'
import { useSoundEffectManager } from '@/hooks/video/audio/useSoundEffectManager'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getPlayableScenes, getDurationBeforeSceneIndex, getPlayableSceneStartTime } from '../utils/proPlaybackUtils'
import { calculateAspectFittedSize } from '../utils/proPreviewLayout'
import { videoSpriteAdapter } from './playback/media/videoSpriteAdapter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { calculateSpriteParams } from '@/utils/pixi/sprite'
import { getSubtitlePosition } from '@/hooks/video/renderer/utils/getSubtitlePosition'
import { getPreviewLetterSpacing, getPreviewStrokeWidth } from '@/hooks/video/renderer/subtitle/previewStroke'
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

const STAGE_WIDTH = 1080
const STAGE_HEIGHT = 1920
const STAGE_ASPECT_RATIO = STAGE_WIDTH / STAGE_HEIGHT
const VIDEO_METADATA_TIMEOUT_MS = 5000
const VIDEO_SEEK_TIMEOUT_MS = 1200
const MIN_AUDIO_SEGMENT_SEC = 0.001

interface SoundEffectSegmentInfo {
  segmentIndex: number
  sceneIndex: number
  partIndex: number
  startSec: number
  endSec: number
}

function hideText(textObj: PIXI.Text) {
  if (!textObj.destroyed) {
    textObj.visible = false
    textObj.alpha = 0
  }
}

function getAppCanvas(app: PIXI.Application | null | undefined): HTMLCanvasElement | null {
  if (!app) {
    return null
  }

  const rendererCanvas = (
    app as PIXI.Application & { renderer?: { canvas?: HTMLCanvasElement | null } }
  ).renderer?.canvas

  if (rendererCanvas) {
    return rendererCanvas
  }

  try {
    return (app.canvas as HTMLCanvasElement | undefined) ?? null
  } catch {
    return null
  }
}

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
  const playbackContainerRef = useRef<HTMLDivElement | null>(null)
  const pixiContainerRef = useRef<HTMLDivElement | null>(null)
  const timelineBarRef = useRef<HTMLDivElement | null>(null)

  const appRef = useRef<PIXI.Application | null>(null)
  const rootContainerRef = useRef<PIXI.Container | null>(null)
  const videoContainerRef = useRef<PIXI.Container | null>(null)
  const subtitleContainerRef = useRef<PIXI.Container | null>(null)

  const scenesRef = useRef(scenes)
  const currentSceneIndexRef = useRef(currentSceneIndex)
  const timelineRef = useRef<TimelineData | null>(null)

  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  const textStrokesRef = useRef<Map<number, PIXI.Text>>(new Map())
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const videoTexturesRef = useRef<Map<number, PIXI.Texture>>(new Map())
  const videoElementsRef = useRef<Map<number, HTMLVideoElement>>(new Map())
  const setupSpriteClickEventRef = useRef<(sceneIndex: number, sprite: PIXI.Sprite) => boolean>(() => false)
  const prevSceneIndexRef = useRef(currentSceneIndex)
  const prevFabricSceneIndexRef = useRef(currentSceneIndex)

  // 스프라이트 로딩 상태 추적 (useProTransportRenderer와 공유)
  const sceneLoadingStateRef = useRef<Map<number, {
    status: 'not-loaded' | 'loading' | 'ready' | 'failed'
    timestamp: number
    videoReady: boolean
    spriteReady: boolean
  }>>(new Map())

  const ttsAudioRefsRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const ttsCacheRef = useRef<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>(new Map())
  const scenePlaybackEndTimeRef = useRef<number | null>(null)
  const scenePlaybackSceneIndexRef = useRef<number | null>(null)
  const lastHandledScenePlaybackRequestIdRef = useRef<number | null>(null)
  const lastBgmSeekTimeRef = useRef<number | null>(null)

  // ===== State =====
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [pixiReady, setPixiReady] = useState(false)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')
  const [ttsCacheVersion, setTtsCacheVersion] = useState(0)

  // ===== Refs 동기화 =====
  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  useEffect(() => {
    const prevSceneIndex = prevSceneIndexRef.current
    if (prevSceneIndex !== currentSceneIndex && !isPlaying && editMode !== 'none') {
      setEditMode('none')
    }
    prevSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex, isPlaying, editMode, setEditMode])

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
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'audio/mpeg' })

          const audio = new Audio(URL.createObjectURL(blob))
          
          const cleanup = () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata)
            audio.removeEventListener('error', onError)
            URL.revokeObjectURL(audio.src)
          }

          const onLoadedMetadata = () => {
            if (cancelled) {
              cleanup()
              resolve()
              return
            }

            const duration = audio.duration
            const url = URL.createObjectURL(blob)

            if (!ttsCacheRef.current.has(ttsKey)) {
              ttsCacheRef.current.set(ttsKey, {
                blob,
                durationSec: duration,
                url,
              })
            } else {
              URL.revokeObjectURL(url)
            }

            cleanup()
            resolve()
          }

          const onError = () => {
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

  // ===== Canvas 크기 계산 및 스타일 적용 =====
  const applyCanvasStyle = useCallback((width: number, height: number) => {
    const app = appRef.current
    const pixiContainer = pixiContainerRef.current

    const canvas = getAppCanvas(app)
    if (!app || !canvas || width <= 0 || height <= 0) {
      return
    }

    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    canvas.style.maxWidth = '100%'
    canvas.style.maxHeight = '100%'
    canvas.style.display = 'block'
    canvas.style.position = 'absolute'
    canvas.style.top = '50%'
    canvas.style.left = '50%'
    canvas.style.transform = 'translate(-50%, -50%)'

    if (pixiContainer) {
      pixiContainer.style.width = `${width}px`
      pixiContainer.style.height = `${height}px`
    }
  }, [])

  useEffect(() => {
    const container = playbackContainerRef.current
    if (!container) {
      return
    }

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect()
      const fitted = calculateAspectFittedSize(
        rect.width || container.clientWidth,
        rect.height || container.clientHeight,
        STAGE_ASPECT_RATIO
      )

      if (!fitted) {
        return
      }

      setCanvasDisplaySize((prev) => {
        if (prev && Math.abs(prev.width - fitted.width) < 0.5 && Math.abs(prev.height - fitted.height) < 0.5) {
          return prev
        }
        return fitted
      })

      applyCanvasStyle(fitted.width, fitted.height)
    }

    const rafId = requestAnimationFrame(updateCanvasSize)
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateCanvasSize)
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [applyCanvasStyle])

  useEffect(() => {
    if (!pixiReady || !canvasDisplaySize) {
      return
    }

    applyCanvasStyle(canvasDisplaySize.width, canvasDisplaySize.height)
  }, [pixiReady, canvasDisplaySize, applyCanvasStyle])

  // ===== 씬 리소스 정리 =====
  const cleanupSceneResources = useCallback((sceneIndex: number) => {
    const videoContainer = videoContainerRef.current

    const sprite = spritesRef.current.get(sceneIndex)
    if (sprite) {
      if (videoContainer && !sprite.destroyed && sprite.parent === videoContainer) {
        videoContainer.removeChild(sprite)
      }
      if (!sprite.destroyed) {
        sprite.destroy()
      }
      spritesRef.current.delete(sceneIndex)
    }

    const texture = videoTexturesRef.current.get(sceneIndex)
    if (texture && !texture.destroyed) {
      texture.destroy(true)
    }
    videoTexturesRef.current.delete(sceneIndex)

    const video = videoElementsRef.current.get(sceneIndex)
    if (video) {
      video.pause()
      video.src = ''
      video.load()
    }
    videoElementsRef.current.delete(sceneIndex)

    const textObj = textsRef.current.get(sceneIndex)
    if (textObj) {
      if (subtitleContainerRef.current && !textObj.destroyed && textObj.parent === subtitleContainerRef.current) {
        subtitleContainerRef.current.removeChild(textObj)
      }
      if (!textObj.destroyed) {
        textObj.destroy()
      }
      textsRef.current.delete(sceneIndex)
    }

    const strokeObj = textStrokesRef.current.get(sceneIndex)
    if (strokeObj) {
      if (subtitleContainerRef.current && !strokeObj.destroyed && strokeObj.parent === subtitleContainerRef.current) {
        subtitleContainerRef.current.removeChild(strokeObj)
      }
      if (!strokeObj.destroyed) {
        strokeObj.destroy()
      }
      textStrokesRef.current.delete(sceneIndex)
    }
  }, [])

  const cleanupAllMediaResources = useCallback(() => {
    const sceneIndices = new Set<number>([
      ...spritesRef.current.keys(),
      ...videoTexturesRef.current.keys(),
      ...videoElementsRef.current.keys(),
      ...textsRef.current.keys(),
      ...textStrokesRef.current.keys(),
    ])

    sceneIndices.forEach((sceneIndex) => {
      cleanupSceneResources(sceneIndex)
    })

    ttsAudioRefsRef.current.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    ttsAudioRefsRef.current.clear()
  }, [cleanupSceneResources])

  // ===== PixiJS 초기화 =====
  useEffect(() => {
    const host = pixiContainerRef.current
    if (!host) {
      return
    }

    let cancelled = false
    const app = new PIXI.Application()

    const initialize = async () => {
      try {
        await app.init({
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          backgroundColor: 0x000000,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          autoStart: true,
        })

        if (cancelled) {
          app.destroy(true, { children: true })
          return
        }

        appRef.current = app

        const root = new PIXI.Container()
        root.sortableChildren = true
        app.stage.addChild(root)
        rootContainerRef.current = root

        const videoLayer = new PIXI.Container()
        videoLayer.sortableChildren = true
        videoLayer.zIndex = 0
        root.addChild(videoLayer)
        videoContainerRef.current = videoLayer

        const subtitleLayer = new PIXI.Container()
        subtitleLayer.zIndex = 1
        root.addChild(subtitleLayer)
        subtitleContainerRef.current = subtitleLayer

        root.sortChildren()

        const appCanvas = getAppCanvas(app)
        if (!appCanvas) {
          return
        }
        
        appCanvas.style.zIndex = '30'
        
        host.appendChild(appCanvas)

        const fitted = calculateAspectFittedSize(
          host.clientWidth || host.getBoundingClientRect().width,
          host.clientHeight || host.getBoundingClientRect().height,
          STAGE_ASPECT_RATIO
        )

        if (fitted) {
          applyCanvasStyle(fitted.width, fitted.height)
        }

        setPixiReady(true)
      } catch {
        // Pixi 초기화 실패
      }
    }

    void initialize()

    return () => {
      cancelled = true
      setPixiReady(false)
      cleanupAllMediaResources()

      const currentApp = appRef.current
      const currentCanvas = getAppCanvas(currentApp)
      
      if (currentCanvas && host.contains(currentCanvas)) {
        try {
          host.removeChild(currentCanvas)
        } catch {
          // Canvas 제거 실패
        }
      }

      if (app && app !== currentApp) {
        const localCanvas = getAppCanvas(app)
        if (localCanvas && host.contains(localCanvas)) {
          try {
            host.removeChild(localCanvas)
          } catch {
            // 로컬 app canvas 제거 실패
          }
        }
      }

      if (currentApp) {
        try {
          if (currentApp.stage) {
            currentApp.stage.destroy({ children: true })
          }
          currentApp.destroy(true, { children: false, texture: false })
        } catch {
          // Pixi 정리 실패
        }
      }

      appRef.current = null
      rootContainerRef.current = null
      videoContainerRef.current = null
      subtitleContainerRef.current = null
    }
  }, [applyCanvasStyle, cleanupAllMediaResources])

  // 컴포넌트 언마운트 시 리소스 정리
  useEffect(() => {
    const currentCache = ttsCacheRef.current
    return () => {
      cleanupAllMediaResources()
      
      currentCache.forEach((cached) => {
        if (cached.url) {
          URL.revokeObjectURL(cached.url)
        }
      })
      currentCache.clear()
    }
  }, [cleanupAllMediaResources])

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
  }, [cleanupSceneResources, pixiReady, sceneLoadingStateRef])

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
  }, [cleanupSceneResources, pixiReady])

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
  }, [pixiReady])

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

  useEffect(() => {
    if (computedTotalDuration > 0) {
      setTotalDuration(computedTotalDuration)
    }
  }, [computedTotalDuration, setTotalDuration])

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
      setCurrentTime(previousDuration)
    }
  }, [currentSceneIndex, scenes, isPlaying, pixiReady, setCurrentTime])

  // ===== Transport 및 렌더링 =====
  const useFabricEditing = editMode === 'image' || editMode === 'text'

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
    currentTime,
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

  const soundEffectTimelineKey = useMemo(() => {
    if (!timeline?.scenes || timeline.scenes.length === 0) {
      return ''
    }

    return timeline.scenes
      .map((scene, sceneIndex) => {
        const textContent = scene.text?.content ?? ''
        const voiceTemplate = scene.voiceTemplate ?? ''
        const soundEffect = scene.soundEffect ?? ''
        const duration = Number.isFinite(scene.duration) ? scene.duration : 0
        return `${sceneIndex}:${textContent}:${voiceTemplate}:${soundEffect}:${duration}`
      })
      .join('|')
  }, [timeline])

  const soundEffectSceneKey = useMemo(() => {
    if (scenes.length === 0) {
      return ''
    }

    return scenes
      .map((scene, sceneIndex) => {
        const voiceTemplate = scene.voiceTemplate ?? ''
        const script = scene.script ?? ''
        const ttsDuration = scene.ttsDuration ?? 0
        const selectionStart = scene.selectionStartSeconds ?? 0
        const selectionEnd = scene.selectionEndSeconds ?? 0
        return `${sceneIndex}:${voiceTemplate}:${script}:${ttsDuration}:${selectionStart}:${selectionEnd}`
      })
      .join('|')
  }, [scenes])

  const soundEffectSegments = useMemo<SoundEffectSegmentInfo[]>(() => {
    const currentTimeline = timeline
    if (!currentTimeline?.scenes || currentTimeline.scenes.length === 0 || scenes.length === 0) {
      return []
    }

    const playableScenes = getPlayableScenes(scenes)
    if (playableScenes.length === 0) {
      return []
    }

    const segments: SoundEffectSegmentInfo[] = []
    let accumulatedTime = 0
    let segmentIndex = 0

    playableScenes.forEach((playableScene) => {
      const sceneIndex = playableScene.originalIndex
      const timelineScene = currentTimeline.scenes[sceneIndex]
      if (!timelineScene) {
        accumulatedTime += playableScene.duration
        return
      }

      const sceneDuration = Math.max(playableScene.duration, MIN_AUDIO_SEGMENT_SEC)
      const sceneVoiceTemplate = (timelineScene.voiceTemplate ?? scenes[sceneIndex]?.voiceTemplate ?? '').trim()
      const markups = buildSceneMarkup(currentTimeline, sceneIndex)

      let partDurations: number[] = [sceneDuration]
      if (sceneVoiceTemplate && markups.length > 0) {
        const cachedDurations = markups.map((markup) => {
          const key = makeTtsKey(sceneVoiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          return cached?.durationSec && cached.durationSec > 0 ? cached.durationSec : 0
        })

        const hasAllDurations = cachedDurations.every((duration) => duration > 0)
        const totalCachedDuration = cachedDurations.reduce((sum, duration) => sum + duration, 0)
        if (hasAllDurations && totalCachedDuration > 0) {
          const scale = sceneDuration / totalCachedDuration
          const normalizedDurations = cachedDurations.map((duration) => duration * scale)
          const leadingDurationSum = normalizedDurations
            .slice(0, Math.max(0, normalizedDurations.length - 1))
            .reduce((sum, duration) => sum + duration, 0)

          if (normalizedDurations.length > 0) {
            normalizedDurations[normalizedDurations.length - 1] = Math.max(
              MIN_AUDIO_SEGMENT_SEC,
              sceneDuration - leadingDurationSum
            )
          }

          partDurations = normalizedDurations
        }
      }

      let partStartTime = accumulatedTime
      partDurations.forEach((duration, partIndex) => {
        const safeDuration = Math.max(duration, MIN_AUDIO_SEGMENT_SEC)
        const isLastPart = partIndex === partDurations.length - 1
        const partEndTime = isLastPart ? accumulatedTime + sceneDuration : partStartTime + safeDuration

        segments.push({
          segmentIndex,
          sceneIndex,
          partIndex,
          startSec: partStartTime,
          endSec: partEndTime,
        })

        segmentIndex += 1
        partStartTime = partEndTime
      })

      accumulatedTime += sceneDuration
    })

    return segments
    // timeline/scenes 전체 변경은 잦아서 오디오 관련 키 기반으로만 재계산한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEffectTimelineKey, soundEffectSceneKey, ttsCacheVersion])

  const getActiveSegmentForSoundEffect = useCallback(
    (timeSec: number) => {
      if (soundEffectSegments.length === 0) {
        return null
      }

      const safeTime = Number.isFinite(timeSec) ? Math.max(0, timeSec) : 0
      let left = 0
      let right = soundEffectSegments.length - 1
      let matched: SoundEffectSegmentInfo | null = null

      while (left <= right) {
        const mid = Math.floor((left + right) / 2)
        const candidate = soundEffectSegments[mid]
        if (!candidate) {
          break
        }

        if (safeTime < candidate.startSec) {
          right = mid - 1
          continue
        }
        if (safeTime >= candidate.endSec) {
          left = mid + 1
          continue
        }

        matched = candidate
        break
      }

      if (!matched) {
        matched = safeTime < soundEffectSegments[0]!.startSec
          ? soundEffectSegments[0]!
          : soundEffectSegments[soundEffectSegments.length - 1]!
      }

      return {
        segment: {
          sceneIndex: matched.sceneIndex,
          partIndex: matched.partIndex,
          startSec: matched.startSec,
        },
        offset: Math.max(0, safeTime - matched.startSec),
        segmentIndex: matched.segmentIndex,
      }
    },
    [soundEffectSegments]
  )

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
    handleScenePlaybackRequest(scenePlaybackRequest.sceneIndex)
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

  // ===== Fabric 캔버스 =====
  const { syncFromScene: syncFabricScene, syncFromSceneDirect, fabricCanvasRef: proFabricCanvasRef, fabricReady } = useProFabricResizeDrag({
    videoElementsRef,
    // Pro는 재생 중이 아닐 때 Fabric 캔버스를 유지해 두고, editMode에서만 상호작용을 켠다.
    enabled: pixiReady && !isPlaying,
    playbackContainerRef,
    canvasDisplaySize,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    currentSceneIndex,
    timeline,
    setTimeline,
    spritesRef,
    textsRef,
    editMode,
  })

  useEffect(() => {
    if (isPlaying && editMode !== 'none') {
      setEditMode('none')
    }
  }, [isPlaying, editMode, setEditMode])

  useEffect(() => {
    const prevSceneIndex = prevFabricSceneIndexRef.current
    if (prevSceneIndex === currentSceneIndex) {
      return
    }
    prevFabricSceneIndexRef.current = currentSceneIndex
    const fabricCanvas = proFabricCanvasRef.current
    if (!fabricCanvas) {
      return
    }
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
  }, [currentSceneIndex, proFabricCanvasRef])

  useProEditModeManager({
    appRef,
    fabricCanvasRef: proFabricCanvasRef,
    subtitleContainerRef,
    useFabricEditing,
    pixiReady,
    fabricReady,
    isPlaying,
  })

  const activateFabricObjectByType = useCallback((dataType: 'image' | 'text') => {
    let attempts = 0
    const MAX_ATTEMPTS = 120

    const activate = () => {
      const fabricCanvas = proFabricCanvasRef.current
      if (!fabricCanvas) {
        if (attempts < MAX_ATTEMPTS) {
          attempts += 1
          requestAnimationFrame(activate)
        }
        return
      }

      const objects = fabricCanvas.getObjects() as Array<fabric.Object & { dataType?: 'image' | 'text' }>
      const target = objects.find((obj) => obj.dataType === dataType)
      if (!target) {
        if (attempts < MAX_ATTEMPTS) {
          attempts += 1
          requestAnimationFrame(activate)
        }
        return
      }

      target.set({
        hasControls: true,
        hasBorders: false,
        selectable: true,
        evented: true,
      })
      target.setCoords()
      fabricCanvas.setActiveObject(target)
      fabricCanvas.renderAll()
    }

    requestAnimationFrame(activate)
  }, [proFabricCanvasRef])

  useEffect(() => {
    if (!fabricReady || isPlaying || editMode === 'none') {
      return
    }
    activateFabricObjectByType(editMode)
  }, [fabricReady, isPlaying, editMode, activateFabricObjectByType])

  useEffect(() => {
    if (editMode !== 'none') {
      return
    }
    const fabricCanvas = proFabricCanvasRef.current
    if (!fabricCanvas) {
      return
    }
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
  }, [editMode, proFabricCanvasRef])

  const enterEditMode = useCallback((mode: 'image' | 'text') => {
    setEditMode(mode)
    if (syncFromSceneDirect) {
      void syncFromSceneDirect().then(() => {
        activateFabricObjectByType(mode)
      })
      return
    }
    activateFabricObjectByType(mode)
  }, [setEditMode, syncFromSceneDirect, activateFabricObjectByType])

  // ===== 스프라이트 클릭 이벤트 설정 =====
  const setupSpriteClickEvent = useCallback((sceneIndex: number, sprite: PIXI.Sprite) => {
    if (isPlaying || !pixiReady) {
      return false
    }

    if (!sprite || sprite.destroyed || !sprite.visible) {
      return false
    }

    sprite.interactive = true
    ;(sprite as PIXI.Sprite & { eventMode?: string }).eventMode = 'static'
    sprite.cursor = 'pointer'
    sprite.off('pointerdown')
    sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation()
      enterEditMode('image')
    })

    return true
  }, [isPlaying, pixiReady, enterEditMode])

  useEffect(() => {
    setupSpriteClickEventRef.current = setupSpriteClickEvent
    return () => {
      setupSpriteClickEventRef.current = () => false
    }
  }, [setupSpriteClickEvent])

  // ===== 텍스트 클릭 이벤트 설정 =====
  const setupTextClickEvent = useCallback((sceneIndex: number, textObj: PIXI.Text) => {
    if (isPlaying || !pixiReady) {
      return false
    }

    if (!textObj || textObj.destroyed || !textObj.visible) {
      return false
    }

    textObj.interactive = true
    ;(textObj as PIXI.Text & { eventMode?: string }).eventMode = 'static'
    textObj.cursor = 'pointer'
    textObj.off('pointerdown')
    textObj.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation()
      enterEditMode('text')
    })

    return true
  }, [isPlaying, pixiReady, enterEditMode])

  // ===== ESC 키 처리 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editMode !== 'none') {
        setEditMode('none')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [editMode, setEditMode])

  // ===== 재생 중 클릭 이벤트 제거 =====
  useEffect(() => {
    if (isPlaying) {
      spritesRef.current.forEach((sprite) => {
        if (sprite && !sprite.destroyed) {
          sprite.interactive = false
          ;(sprite as PIXI.Sprite & { eventMode?: string }).eventMode = 'none'
          sprite.cursor = 'default'
          sprite.off('pointerdown')
        }
      })
      textsRef.current.forEach((textObj) => {
        if (textObj && !textObj.destroyed) {
          textObj.interactive = false
          ;(textObj as PIXI.Text & { eventMode?: string }).eventMode = 'none'
          textObj.cursor = 'default'
          textObj.off('pointerdown')
        }
      })
    }
  }, [isPlaying])

  // Pixi 이벤트 누락 대비: 캔버스 기준 수동 hit-test로 편집 모드 진입 보장
  useEffect(() => {
    if (!pixiReady || isPlaying || !appRef.current) {
      return
    }
    if (editMode !== 'none') {
      return
    }

    const app = appRef.current
    const appCanvas = getAppCanvas(app)
    if (!appCanvas || !app.screen) {
      return
    }

    type HitTestTarget = {
      destroyed?: boolean
      visible?: boolean
      alpha?: number
      getBounds?: () => { x: number; y: number; width: number; height: number }
    }

    const isPointInsideObject = (displayObject: HitTestTarget | null | undefined, x: number, y: number) => {
      if (!displayObject || displayObject.destroyed) {
        return false
      }
      if (!displayObject.visible || displayObject.alpha === 0) {
        return false
      }
      try {
        const bounds = displayObject.getBounds?.()
        if (!bounds) {
          return false
        }
        return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height
      } catch {
        return false
      }
    }

    const handleCanvasMouseDown = (event: MouseEvent) => {
      const rect = appCanvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0 || !app.screen) {
        return
      }

      const scaleX = app.screen.width / rect.width
      const scaleY = app.screen.height / rect.height
      const x = (event.clientX - rect.left) * scaleX
      const y = (event.clientY - rect.top) * scaleY
      const sceneIndex = currentSceneIndexRef.current

      const textObj = textsRef.current.get(sceneIndex)
      if (isPointInsideObject(textObj, x, y)) {
        enterEditMode('text')
        return
      }

      const sprite = spritesRef.current.get(sceneIndex)
      if (isPointInsideObject(sprite, x, y)) {
        enterEditMode('image')
      }
    }

    appCanvas.addEventListener('mousedown', handleCanvasMouseDown, true)
    return () => {
      appCanvas.removeEventListener('mousedown', handleCanvasMouseDown, true)
    }
  }, [pixiReady, isPlaying, editMode, appRef, currentSceneIndexRef, textsRef, spritesRef, enterEditMode])

  // ===== Fabric 캔버스 이벤트 처리 =====
  useEffect(() => {
    const fabricCanvas = proFabricCanvasRef?.current
    if (!fabricCanvas || isPlaying || !pixiReady) {
      return
    }

    const resolveTargetType = (
      target: fabric.Object | null | undefined
    ): 'image' | 'text' | null => {
      const typedTarget = target as fabric.Object & { dataType?: 'image' | 'text' }
      if (!typedTarget?.dataType) {
        return null
      }
      return typedTarget.dataType
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMouseDown = (e: any) => {
      const selectedType = resolveTargetType(e.target as fabric.Object | null)
      if (!selectedType) {
        const activeObject = fabricCanvas.getActiveObject() as fabric.Object & { dataType?: 'image' | 'text' } | null
        if (activeObject?.dataType) {
          return
        }
        setEditMode((prev) => (prev === 'none' ? prev : 'none'))
        fabricCanvas.discardActiveObject()
        fabricCanvas.requestRenderAll()
        return
      }
      setEditMode((prev) => (prev === selectedType ? prev : selectedType))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionCreated = (e: any) => {
      const selected = (e.selected as fabric.Object[] | undefined)?.[0]
      const selectedType = resolveTargetType(selected)
      if (!selectedType) {
        return
      }
      setEditMode((prev) => (prev === selectedType ? prev : selectedType))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionUpdated = (e: any) => {
      const selected = (e.selected as fabric.Object[] | undefined)?.[0]
      const selectedType = resolveTargetType(selected)
      if (!selectedType) {
        return
      }
      setEditMode((prev) => (prev === selectedType ? prev : selectedType))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('mouse:down', handleMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('selection:created', handleSelectionCreated as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('selection:updated', handleSelectionUpdated as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('mouse:down', handleMouseDown as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('selection:created', handleSelectionCreated as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('selection:updated', handleSelectionUpdated as any)
    }
  }, [proFabricCanvasRef, isPlaying, pixiReady, setEditMode])

  // ===== 스프라이트/텍스트 클릭 이벤트 자동 설정 =====
  const currentScene = scenes[currentSceneIndex]
  const currentSceneVideoUrl = currentScene?.videoUrl
  const currentSceneScript = currentScene?.script ?? ''

  useEffect(() => {
    if (isPlaying || !pixiReady) {
      return
    }

    let retryCount = 0
    const MAX_RETRIES = 20
    let frameId: number | null = null
    
    const checkAndSetup = () => {
      const sprite = spritesRef.current.get(currentSceneIndex)
      if (sprite && !sprite.destroyed && sprite.visible) {
        if (!sprite.interactive || sprite.cursor !== 'pointer') {
          setupSpriteClickEvent(currentSceneIndex, sprite)
        }
      } else if (retryCount < MAX_RETRIES) {
        retryCount++
        frameId = requestAnimationFrame(checkAndSetup)
      }
    }
    
    frameId = requestAnimationFrame(checkAndSetup)
    
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [isPlaying, pixiReady, currentSceneIndex, setupSpriteClickEvent])

  useEffect(() => {
    if (isPlaying || !pixiReady) {
      return
    }

    let retryCount = 0
    const MAX_RETRIES = 20
    let frameId: number | null = null
    
    const checkAndSetup = () => {
      const textObj = textsRef.current.get(currentSceneIndex)
      if (textObj && !textObj.destroyed && textObj.visible) {
        if (!textObj.interactive || textObj.cursor !== 'pointer') {
          setupTextClickEvent(currentSceneIndex, textObj)
        }
      } else if (retryCount < MAX_RETRIES) {
        retryCount++
        frameId = requestAnimationFrame(checkAndSetup)
      }
    }
    
    frameId = requestAnimationFrame(checkAndSetup)
    
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [isPlaying, pixiReady, currentSceneIndex, setupTextClickEvent])

  // ===== Fabric 씬 동기화 =====
  useEffect(() => {
    if (!pixiReady || isPlaying || currentSceneIndex < 0 || !syncFromSceneDirect) {
      return
    }
    if (!fabricReady || editMode === 'none') {
      return
    }

    const fabricEditingEnabled = proFabricCanvasRef?.current !== null
    if (!fabricEditingEnabled) {
      return
    }

    let cancelled = false
    let retryCount = 0
    const MAX_RETRIES = 180
    const syncNow = () => {
      if (!cancelled) {
        void syncFromSceneDirect().then(() => {
          if (!cancelled) {
            activateFabricObjectByType(editMode)
          }
        })
      }
    }

    // 편집모드 진입 직후 1회 즉시 동기화 (비디오 미준비면 proxy 오브젝트로라도 생성)
    requestAnimationFrame(() => {
      requestAnimationFrame(syncNow)
    })

    const runSyncWhenVideoReady = () => {
      if (cancelled) {
        return
      }

      // 비디오가 없는 씬은 즉시 동기화만으로 충분
      if (!currentSceneVideoUrl) {
        return
      }

      const currentVideo = videoElementsRef.current.get(currentSceneIndex)
      if (currentVideo && currentVideo.readyState >= 2 && currentVideo.videoWidth > 0 && currentVideo.videoHeight > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            syncNow()
          })
        })
        return
      }

      if (retryCount >= MAX_RETRIES) {
        return
      }

      retryCount += 1
      requestAnimationFrame(runSyncWhenVideoReady)
    }

    runSyncWhenVideoReady()

    return () => {
      cancelled = true
    }
  }, [
    currentSceneIndex,
    currentSceneVideoUrl,
    isPlaying,
    pixiReady,
    syncFromSceneDirect,
    proFabricCanvasRef,
    fabricReady,
    editMode,
    activateFabricObjectByType,
  ])

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

  // ===== Fabric 씬 동기화 (timeline 변경 시) =====
  useEffect(() => {
    const currentTimeline = timeline
    if (!fabricReady || !currentTimeline || currentTimeline.scenes.length === 0) {
      return
    }
    if (!pixiReady || isPlaying || currentSceneIndex < 0) {
      return
    }
    if (editMode !== 'none') {
      return
    }
    
    syncFabricScene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, timelineScenesKey, currentSceneIndex, isPlaying, pixiReady, editMode, syncFabricScene])

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
    setCurrentTime(0)
    
    if (currentSceneIndex >= 0) {
      renderAtRef.current(0, { forceSceneIndex: currentSceneIndex, forceRender: true })
    } else {
      renderAtRef.current(0, { forceRender: true })
    }
    
    hasInitializedRef.current = true
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
    []
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
  }
}
