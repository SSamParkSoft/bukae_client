'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { calculateAspectFittedSize } from '../utils/proPreviewLayout'

export const STAGE_WIDTH = 1080
export const STAGE_HEIGHT = 1920
export const STAGE_ASPECT_RATIO = STAGE_WIDTH / STAGE_HEIGHT

export function hideText(textObj: PIXI.Text) {
  if (!textObj.destroyed) {
    textObj.visible = false
    textObj.alpha = 0
  }
}

export function getAppCanvas(app: PIXI.Application | null | undefined): HTMLCanvasElement | null {
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

interface UsePixiAppParams {
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>
  ttsAudioRefsRef: React.MutableRefObject<Map<number, HTMLAudioElement>>
}

export function usePixiApp({ ttsCacheRef, ttsAudioRefsRef }: UsePixiAppParams) {
  // ===== UI Refs =====
  const playbackContainerRef = useRef<HTMLDivElement | null>(null)
  const pixiContainerRef = useRef<HTMLDivElement | null>(null)
  const timelineBarRef = useRef<HTMLDivElement | null>(null)

  // ===== PIXI Refs =====
  const appRef = useRef<PIXI.Application | null>(null)
  const rootContainerRef = useRef<PIXI.Container | null>(null)
  const videoContainerRef = useRef<PIXI.Container | null>(null)
  const subtitleContainerRef = useRef<PIXI.Container | null>(null)

  // ===== 미디어 Refs =====
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const videoTexturesRef = useRef<Map<number, PIXI.Texture>>(new Map())
  const videoElementsRef = useRef<Map<number, HTMLVideoElement>>(new Map())
  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  const textStrokesRef = useRef<Map<number, PIXI.Text>>(new Map())

  // ===== 로딩 상태 Ref =====
  const sceneLoadingStateRef = useRef<Map<number, {
    status: 'not-loaded' | 'loading' | 'ready' | 'failed'
    timestamp: number
    videoReady: boolean
    spriteReady: boolean
  }>>(new Map())

  // ===== State =====
  const [pixiReady, setPixiReady] = useState(false)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number } | null>(null)

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
  }, [cleanupSceneResources, ttsAudioRefsRef])

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

  // 언마운트 시 TTS 캐시 URL 정리
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
  }, [cleanupAllMediaResources, ttsCacheRef])

  return {
    // UI refs
    playbackContainerRef,
    pixiContainerRef,
    timelineBarRef,
    // PIXI refs
    appRef,
    rootContainerRef,
    videoContainerRef,
    subtitleContainerRef,
    // 미디어 refs
    spritesRef,
    videoTexturesRef,
    videoElementsRef,
    textsRef,
    textStrokesRef,
    sceneLoadingStateRef,
    // 상태
    pixiReady,
    canvasDisplaySize,
    // 정리 함수
    cleanupSceneResources,
    cleanupAllMediaResources,
  }
}
