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
import { useTimelineChangeHandler } from '@/app/video/create/step3/shared/hooks/timeline'
import { getPlayableScenes, getDurationBeforeSceneIndex } from '../utils/proPlaybackUtils'
import { calculateAspectFittedSize } from '../utils/proPreviewLayout'
import { videoSpriteAdapter } from './playback/media/videoSpriteAdapter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import type { ProStep3Scene } from '../model/types'
import type { TimelineData } from '@/lib/types/domain/timeline'

export interface UseProStep3ContainerParams {
  scenes: ProStep3Scene[]
  currentSceneIndex: number
  isPlaying: boolean
  onBeforePlay?: () => boolean
  onPlayingChange?: (isPlaying: boolean) => void
}

const STAGE_WIDTH = 1080
const STAGE_HEIGHT = 1920
const STAGE_ASPECT_RATIO = STAGE_WIDTH / STAGE_HEIGHT
const VIDEO_METADATA_TIMEOUT_MS = 5000
const VIDEO_SEEK_TIMEOUT_MS = 1200

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
 * Pro step3 오케스트레이션 훅 (Fast useStep3Container와 동일한 패턴)
 * 모든 비즈니스 로직을 포함하고 UI는 순수하게 렌더링만 담당하도록 함
 */
export function useProStep3Container(params: UseProStep3ContainerParams) {
  const {
    scenes,
    currentSceneIndex,
    isPlaying,
    onBeforePlay,
    onPlayingChange,
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

  const ttsAudioRefsRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const ttsCacheRef = useRef<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>(new Map())

  // ===== State =====
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [pixiReady, setPixiReady] = useState(false)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')

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
      // 캐시 로드 완료
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

  // ===== 비디오 로딩 =====
  const loadVideoAsSprite = useCallback(async (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number): Promise<void> => {
    if (!pixiReady) {
      console.warn('[loadVideoAsSprite] pixiReady가 false입니다', { sceneIndex, videoUrl })
      return
    }

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

      if (imageTransform) {
        sprite.x = imageTransform.x
        sprite.y = imageTransform.y
        sprite.width = imageTransform.width
        sprite.height = imageTransform.height
        sprite.rotation = imageTransform.rotation ?? 0
      } else {
        const videoAspect = sourceWidth / sourceHeight
        const stageAspect = stageWidth / stageHeight

        if (videoAspect > stageAspect) {
          sprite.width = stageWidth
          sprite.height = stageWidth / videoAspect
        } else {
          sprite.height = stageHeight
          sprite.width = stageHeight * videoAspect
        }

        sprite.x = stageWidth / 2
        sprite.y = stageHeight / 2
        sprite.rotation = 0
      }

      sprite.visible = true
      sprite.alpha = 1

      const finalApp = appRef.current
      const finalVideoContainer = videoContainerRef.current
      if (!finalApp || !finalVideoContainer || !finalApp.screen) {
        sprite.destroy()
        cleanupSceneResources(sceneIndex)
        return
      }

      finalVideoContainer.addChild(sprite)
      spritesRef.current.set(sceneIndex, sprite)
      
      if (finalApp && finalApp.renderer) {
        try {
          finalApp.renderer.render(finalApp.stage)
        } catch (error) {
          console.warn('[loadVideoAsSprite] 초기 렌더링 실패:', error)
        }
      }
      
      requestAnimationFrame(() => {
        setupSpriteClickEventRef.current(sceneIndex, sprite)
      })
    } catch {
      cleanupSceneResources(sceneIndex)
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
      const position = textSettings?.position || 'bottom'
      if (position === 'top') {
        textY = 200
      } else if (position === 'center') {
        textY = stageHeight / 2
      } else {
        textY = stageHeight - 200
      }
    }

    const strokeColor = textSettings?.stroke?.color || '#000000'
    const strokeWidth = textSettings?.stroke?.width ?? 10
    
    const fillStyleConfig: Partial<PIXI.TextStyle> = {
      fontFamily,
      fontSize,
      fill: fillColor,
      align: textAlign as 'left' | 'center' | 'right' | 'justify',
      fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
      fontStyle,
      wordWrap: true,
      wordWrapWidth: wordWrapWidth,
      breakWords: true,
    }
    
    const fillStyle = new PIXI.TextStyle(fillStyleConfig)
    if (isUnderline) {
      ;(fillStyle as PIXI.TextStyle & { underline?: boolean }).underline = true
    }

    if (strokeWidth > 0) {
      const strokeStyleConfig: Partial<PIXI.TextStyle> = {
        fontFamily,
        fontSize,
        fill: 'transparent',
        align: textAlign as 'left' | 'center' | 'right' | 'justify',
        fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
        fontStyle,
        wordWrap: true,
        wordWrapWidth: wordWrapWidth,
        breakWords: true,
        stroke: { color: strokeColor, width: strokeWidth },
      }
      
      const strokeStyle = new PIXI.TextStyle(strokeStyleConfig)
      if (isUnderline) {
        ;(strokeStyle as PIXI.TextStyle & { underline?: boolean }).underline = true
      }

      let strokeObj = textStrokesRef.current.get(sceneIndex)
      if (!strokeObj || strokeObj.destroyed) {
        strokeObj = new PIXI.Text({
          text: script,
          style: strokeStyle,
        })
        strokeObj.anchor.set(0.5, 0.5)
        subtitleContainer.addChild(strokeObj)
        textStrokesRef.current.set(sceneIndex, strokeObj)
      } else {
        strokeObj.style = strokeStyle
        strokeObj.text = script
      }

      strokeObj.x = textX
      strokeObj.y = textY
      strokeObj.visible = true
      strokeObj.alpha = 1
      
      const strokeIndex = subtitleContainer.getChildIndex(strokeObj)
      
      let textObj = textsRef.current.get(sceneIndex)
      if (!textObj || textObj.destroyed) {
        textObj = new PIXI.Text({
          text: script,
          style: fillStyle,
        })
        textObj.anchor.set(0.5, 0.5)
        subtitleContainer.addChild(textObj)
        textsRef.current.set(sceneIndex, textObj)
      } else {
        textObj.style = fillStyle
        textObj.text = script
      }

      textObj.x = textX
      textObj.y = textY
      textObj.visible = true
      textObj.alpha = 1
      
      const fillIndex = subtitleContainer.getChildIndex(textObj)
      if (fillIndex <= strokeIndex) {
        subtitleContainer.setChildIndex(textObj, strokeIndex + 1)
      }
    } else {
      let textObj = textsRef.current.get(sceneIndex)
      if (!textObj || textObj.destroyed) {
        textObj = new PIXI.Text({
          text: script,
          style: fillStyle,
        })
        textObj.anchor.set(0.5, 0.5)
        subtitleContainer.addChild(textObj)
        textsRef.current.set(sceneIndex, textObj)
      } else {
        textObj.style = fillStyle
        textObj.text = script
      }

      textObj.x = textX
      textObj.y = textY
      textObj.visible = true
      textObj.alpha = 1
      
      const strokeObj = textStrokesRef.current.get(sceneIndex)
      if (strokeObj && !strokeObj.destroyed) {
        hideText(strokeObj)
      }
    }
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
  useEffect(() => {
    if (!isPlaying && currentSceneIndex >= 0 && pixiReady) {
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
    renderSubtitle,
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

  const timelineScenesKey = useMemo(() => {
    if (!timeline?.scenes || timeline.scenes.length === 0) return ''
    return timeline.scenes
      .map(
        (scene, idx) =>
          `${idx}-${scene.imageTransform ? JSON.stringify(scene.imageTransform) : 'none'}-${scene.text?.content || ''}`
      )
      .join('|')
  }, [timeline])

  // ===== Fabric 캔버스 =====
  const { syncFromScene: syncFabricScene, syncFromSceneDirect, fabricCanvasRef: proFabricCanvasRef, fabricReady } = useProFabricResizeDrag({
    videoElementsRef,
    enabled: pixiReady && !isPlaying && (editMode === 'image' || editMode === 'text'),
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
    const MAX_ATTEMPTS = 90

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

      fabricCanvas.setActiveObject(target)
      fabricCanvas.requestRenderAll()
    }

    requestAnimationFrame(activate)
  }, [proFabricCanvasRef])

  useEffect(() => {
    if (!fabricReady || isPlaying || editMode === 'none') {
      return
    }
    activateFabricObjectByType(editMode)
  }, [fabricReady, isPlaying, editMode, activateFabricObjectByType])

  // ===== 스프라이트 클릭 이벤트 설정 =====
  const setupSpriteClickEvent = useCallback((sceneIndex: number, sprite: PIXI.Sprite) => {
    if (isPlaying || !pixiReady) {
      return false
    }

    if (!sprite || sprite.destroyed || !sprite.visible) {
      return false
    }

    sprite.interactive = true
    sprite.cursor = 'pointer'
    sprite.off('pointerdown')
    sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation()
      setEditMode('image')
      activateFabricObjectByType('image')
    })

    return true
  }, [isPlaying, pixiReady, setEditMode, activateFabricObjectByType])

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
    textObj.cursor = 'pointer'
    textObj.off('pointerdown')
    textObj.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation()
      setEditMode('text')
      activateFabricObjectByType('text')
    })

    return true
  }, [isPlaying, pixiReady, setEditMode, activateFabricObjectByType])

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
          sprite.cursor = 'default'
          sprite.off('pointerdown')
        }
      })
      textsRef.current.forEach((textObj) => {
        if (textObj && !textObj.destroyed) {
          textObj.interactive = false
          textObj.cursor = 'default'
          textObj.off('pointerdown')
        }
      })
    }
  }, [isPlaying])

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
        fabricCanvas.discardActiveObject()
        fabricCanvas.requestRenderAll()
        setEditMode((prev) => (prev === 'none' ? prev : 'none'))
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

    const fabricEditingEnabled = proFabricCanvasRef?.current !== null
    if (!fabricEditingEnabled || !currentSceneVideoUrl) {
      return
    }

    let cancelled = false
    let retryCount = 0
    const MAX_RETRIES = 120

    const runSyncWhenVideoReady = () => {
      if (cancelled) {
        return
      }

      const currentVideo = videoElementsRef.current.get(currentSceneIndex)
      if (currentVideo && currentVideo.readyState >= 2 && currentVideo.videoWidth > 0 && currentVideo.videoHeight > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!cancelled) {
              void syncFromSceneDirect()
            }
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
    if (!pixiReady || hasInitializedRef.current || transportState.isPlaying || !renderAtRef.current || scenes.length === 0) return
    
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
    const t = transportHook.getTime()
    renderAtRef.current(t, { skipAnimation: false, forceRender: true })
  }, [timelineScenesKey, pixiReady, transportState.isPlaying, transportHook, renderAtRef])

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
