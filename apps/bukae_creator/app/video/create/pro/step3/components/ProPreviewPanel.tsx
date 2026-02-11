'use client'

import { memo, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import type { MutableRefObject } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { TimelineBar, SpeedSelector, ExportButton } from '@/app/video/create/_step3-components'
import type { ProStep3Scene } from './ProSceneListPanel'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { useVideoSegmentPlayer } from '../hooks/playback/useVideoSegmentPlayer'
import { useProTransportRenderer } from '../hooks/playback/useProTransportRenderer'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { calculateAspectFittedSize } from '../utils/proPreviewLayout'
import { getSceneSegmentDuration, getPlayableScenes, getPreviousPlayableDuration } from '../utils/proPlaybackUtils'
import { useProFabricResizeDrag } from '../hooks/editing/useProFabricResizeDrag'

interface ProPreviewPanelProps {
  currentVideoUrl?: string | null
  currentSelectionStartSeconds?: number
  currentSceneIndex?: number
  onCurrentSceneIndexChange?: (index: number) => void
  scenes: ProStep3Scene[]
  isPlaying: boolean
  onPlayPause: () => void
  bgmTemplate?: string | null
  onExport?: () => void
  isExporting?: boolean
}

const STAGE_WIDTH = 1080
const STAGE_HEIGHT = 1920
const STAGE_ASPECT_RATIO = STAGE_WIDTH / STAGE_HEIGHT
const VIDEO_METADATA_TIMEOUT_MS = 5000
const VIDEO_SEEK_TIMEOUT_MS = 1200

function hideSprite(sprite: PIXI.Sprite) {
  if (!sprite.destroyed) {
    sprite.visible = false
    sprite.alpha = 0
  }
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

export const ProPreviewPanel = memo(function ProPreviewPanel({
  currentVideoUrl,
  currentSelectionStartSeconds,
  currentSceneIndex = 0,
  onCurrentSceneIndexChange,
  scenes,
  isPlaying,
  onPlayPause,
  bgmTemplate,
  onExport,
  isExporting = false,
}: ProPreviewPanelProps) {
  const timeline = useVideoCreateStore((state) => state.timeline)
  const setTimeline = useVideoCreateStore((state) => state.setTimeline)

  const playbackContainerRef = useRef<HTMLDivElement | null>(null)
  const pixiContainerRef = useRef<HTMLDivElement | null>(null)
  const timelineBarRef = useRef<HTMLDivElement | null>(null)

  const appRef = useRef<PIXI.Application | null>(null)
  const rootContainerRef = useRef<PIXI.Container | null>(null)
  const videoContainerRef = useRef<PIXI.Container | null>(null)
  const subtitleContainerRef = useRef<PIXI.Container | null>(null)

  const scenesRef = useRef(scenes)
  const currentSceneIndexRef = useRef(currentSceneIndex)
  const timelineRef = useRef(timeline)

  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const videoTexturesRef = useRef<Map<number, PIXI.Texture>>(new Map())
  const videoElementsRef = useRef<Map<number, HTMLVideoElement>>(new Map())

  const ttsAudioRefsRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const ttsCacheRef = useRef<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>(new Map())

  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [pixiReady, setPixiReady] = useState(false)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  // store의 scenes를 직접 구독하여 변경 감지
  const storeScenes = useVideoCreateStore((state) => state.scenes)

  // Step2에서 저장된 TTS 캐시를 store에서 로드
  useEffect(() => {
    if (!storeScenes || storeScenes.length === 0) {
      return
    }

    let cancelled = false

    // store의 각 씬에서 base64 데이터를 읽어서 캐시에 저장 (Promise로 변환)
    // 이미 캐시에 있는 항목은 건너뛰고 새로 추가된 항목만 로드
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

        // 이미 캐시에 있는지 확인
        const ttsKey = `${extended.voiceTemplate}::${extended.script}`
        const existingCache = ttsCacheRef.current.get(ttsKey)
        if (existingCache && existingCache.url) {
          resolve()
          return
        }

        try {
          // base64 문자열을 blob으로 변환
          const base64Data = extended.ttsAudioBase64
          const byteCharacters = atob(base64Data)
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: 'audio/mpeg' })

          // blob에서 duration 계산
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

            // 다시 한 번 확인 (중복 로드 방지)
            if (!ttsCacheRef.current.has(ttsKey)) {
              ttsCacheRef.current.set(ttsKey, {
                blob,
                durationSec: duration,
                url,
              })
            } else {
              // 이미 캐시에 있으면 URL만 정리
              URL.revokeObjectURL(url)
            }

            cleanup()
            resolve()
          }

          const onError = () => {
            cleanup()
            resolve() // 에러가 나도 다른 씬 로딩을 계속하기 위해 resolve
          }

          audio.addEventListener('loadedmetadata', onLoadedMetadata)
          audio.addEventListener('error', onError)
          audio.load()
        } catch {
          resolve() // 에러가 나도 다른 씬 로딩을 계속하기 위해 resolve
        }
      })
    })

    // 모든 캐시 로딩이 완료될 때까지 대기
    Promise.all(loadPromises).then(() => {
      // 캐시 로드 완료
    })

    return () => {
      cancelled = true
    }
  }, [storeScenes]) // storeScenes가 변경될 때마다 다시 로드 (Step2에서 Step3로 이동할 때 감지)

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
    // 재생 중이 아닐 때는 클릭 이벤트를 받을 수 있도록 설정
    canvas.style.pointerEvents = isPlaying ? 'none' : 'auto'

    if (pixiContainer) {
      pixiContainer.style.width = `${width}px`
      pixiContainer.style.height = `${height}px`
    }
  }, [isPlaying])

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
  }, [])

  const cleanupAllMediaResources = useCallback(() => {
    const sceneIndices = new Set<number>([
      ...spritesRef.current.keys(),
      ...videoTexturesRef.current.keys(),
      ...videoElementsRef.current.keys(),
      ...textsRef.current.keys(),
    ])

    sceneIndices.forEach((sceneIndex) => {
      cleanupSceneResources(sceneIndex)
    })

    ttsAudioRefsRef.current.forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    ttsAudioRefsRef.current.clear()

    // TTS 캐시는 재생에 필요하므로 일반 cleanup에서는 클리어하지 않음
    // 컴포넌트 언마운트 시에만 클리어됨
  }, [cleanupSceneResources])

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
        
        // z-index는 고정값이므로 한 번만 설정
        appCanvas.style.zIndex = '30'
        
        host.appendChild(appCanvas)

        const fitted = canvasDisplaySize ?? calculateAspectFittedSize(
          host.clientWidth,
          host.clientHeight,
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

      // appRef.current를 먼저 확인하고 canvas 제거
      const currentApp = appRef.current
      const currentCanvas = getAppCanvas(currentApp)
      
      if (currentCanvas && host.contains(currentCanvas)) {
        try {
          host.removeChild(currentCanvas)
        } catch {
          // Canvas 제거 실패
        }
      }

      // 로컬 app 변수의 canvas도 확인 (초기화 중일 수 있음)
      // currentApp과 다른 경우에만 제거 (중복 제거 방지)
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
  }, [applyCanvasStyle, canvasDisplaySize, cleanupAllMediaResources])

  // 컴포넌트 언마운트 시에만 모든 리소스 정리 (TTS 캐시 포함)
  useEffect(() => {
    const currentCache = ttsCacheRef.current
    return () => {
      cleanupAllMediaResources()
      
      // 컴포넌트 언마운트 시 TTS 캐시도 정리
      currentCache.forEach((cached) => {
        if (cached.url) {
          URL.revokeObjectURL(cached.url)
        }
      })
      currentCache.clear()
    }
  }, [cleanupAllMediaResources])

  const waitForMetadata = useCallback((video: HTMLVideoElement | null) => {
    return new Promise<void>((resolve, reject) => {
      if (!video) {
        reject(new Error('비디오 요소가 null입니다'))
        return
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (video) {
          video.removeEventListener('loadedmetadata', onLoadedMetadata)
          video.removeEventListener('error', onError)
        }
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      }

      const onLoadedMetadata = () => {
        if (!video) {
          reject(new Error('비디오 요소가 null입니다'))
          return
        }
        cleanup()
        resolve()
      }

      const onError = () => {
        cleanup()
        reject(new Error('비디오 메타데이터 로드 실패'))
      }

      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('error', onError)

      timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error('비디오 메타데이터 로드 타임아웃'))
      }, VIDEO_METADATA_TIMEOUT_MS)

      if (video.readyState >= 1) {
        onLoadedMetadata()
      } else {
        video.load()
      }
    })
  }, [])

  const seekVideoFrame = useCallback((video: HTMLVideoElement | null, targetTime: number) => {
    return new Promise<void>((resolve) => {
      if (!video) {
        resolve()
        return
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null

      const cleanup = () => {
        if (video) {
          video.removeEventListener('seeked', onSeeked)
        }
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      }

      const onSeeked = () => {
        if (!video) {
          resolve()
          return
        }
        cleanup()
        // seeked 후 비디오가 정지 상태이므로 VideoTexture 업데이트를 위해 약간의 지연 추가
        requestAnimationFrame(() => {
          resolve()
        })
      }

      video.addEventListener('seeked', onSeeked)
      timeoutId = setTimeout(() => {
        cleanup()
        resolve()
      }, VIDEO_SEEK_TIMEOUT_MS)

      video.pause()
      const clampedTime = Math.max(0, Math.min(targetTime, video.duration || targetTime))
      video.currentTime = clampedTime

      if (Math.abs(video.currentTime - clampedTime) < 0.05) {
        cleanup()
        requestAnimationFrame(() => {
          resolve()
        })
      }
    })
  }, [])

  const loadVideoAsSprite = useCallback(async (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number): Promise<void> => {
    // 초기 검증
    if (!pixiReady) {
      return
    }

    cleanupSceneResources(sceneIndex)

    const video = document.createElement('video')
    video.src = videoUrl
    video.muted = true
    video.playsInline = true
    video.loop = false
    video.crossOrigin = 'anonymous'
    video.preload = 'metadata'
    video.style.display = 'none'

    try {
      await waitForMetadata(video)

      // 비동기 작업 후 video 요소가 여전히 유효한지 확인
      if (!video || video.readyState === 0) {
        cleanupSceneResources(sceneIndex)
        return
      }

      // 비동기 작업 후 ref 재확인
      const app = appRef.current
      const videoContainer = videoContainerRef.current
      if (!app || !videoContainer || !app.screen) {
        cleanupSceneResources(sceneIndex)
        return
      }

      // 비디오 크기가 유효한지 확인 (video가 null이 아닌지 다시 확인)
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

      // selectionStartSeconds가 파라미터로 전달되면 사용하고, 없으면 scenesRef에서 읽기 (fallback)
      const sceneStart = selectionStartSeconds ?? scenesRef.current[sceneIndex]?.selectionStartSeconds ?? 0
      await seekVideoFrame(video, sceneStart)
      
      // seeked 후 video 요소가 여전히 유효한지 확인
      if (!video || video.readyState === 0) {
        cleanupSceneResources(sceneIndex)
        return
      }
      
      // seeked 후 다시 ref 재확인
      const appAfterSeek = appRef.current
      const videoContainerAfterSeek = videoContainerRef.current
      if (!appAfterSeek || !videoContainerAfterSeek || !appAfterSeek.screen || texture.destroyed) {
        cleanupSceneResources(sceneIndex)
        return
      }

      // seeked 후 VideoTexture가 프레임을 업데이트하도록 명시적으로 업데이트
      // PixiJS v8에서는 VideoTexture가 별도로 export되지 않을 수 있으므로 update 메서드 존재 여부로 확인
      if (texture && !texture.destroyed && typeof (texture as { update?: () => void }).update === 'function') {
        try {
          ;(texture as { update: () => void }).update()
        } catch {
          // VideoTexture 업데이트 실패
        }
      }
      
      video.pause()

      // 비디오 요소가 여전히 유효한지 확인
      const currentVideo = videoElementsRef.current.get(sceneIndex)
      if (!currentVideo || currentVideo !== video) {
        cleanupSceneResources(sceneIndex)
        return
      }

      // currentVideo가 null이 아닌지 확인
      if (!currentVideo) {
        cleanupSceneResources(sceneIndex)
        return
      }

      // currentVideo가 유효한지 다시 확인 (videoWidth 접근 전)
      if (!currentVideo.videoWidth && !currentVideo.videoHeight) {
        // 비디오 메타데이터가 아직 로드되지 않았을 수 있음
        cleanupSceneResources(sceneIndex)
        return
      }

      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5, 0.5)

      const stageWidth = appAfterSeek.screen.width
      const stageHeight = appAfterSeek.screen.height
      
      // 비디오 크기를 다시 확인 (seek 후 변경될 수 있음)
      // currentVideo가 null이 아닌지 다시 확인
      const sourceWidth = (currentVideo && currentVideo.videoWidth) || texture.width || 0
      const sourceHeight = (currentVideo && currentVideo.videoHeight) || texture.height || 0

      if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
        sprite.destroy()
        cleanupSceneResources(sceneIndex)
        return
      }

      // timeline에서 imageTransform 확인 (사용자가 편집한 위치/사이즈)
      // 최신 timeline 값을 직접 읽기 (ref는 동기화 지연 가능)
      const currentTimeline = useVideoCreateStore.getState().timeline
      const timelineScene = currentTimeline?.scenes?.[sceneIndex]
      const imageTransform = timelineScene?.imageTransform

      if (imageTransform) {
        // 사용자가 편집한 위치/사이즈 적용
        sprite.x = imageTransform.x
        sprite.y = imageTransform.y
        sprite.width = imageTransform.width
        sprite.height = imageTransform.height
        sprite.rotation = imageTransform.rotation ?? 0
      } else {
        // imageTransform이 없으면 기본 크기와 위치 적용
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

      // 최종 확인 후 sprite 추가
      const finalApp = appRef.current
      const finalVideoContainer = videoContainerRef.current
      if (!finalApp || !finalVideoContainer || !finalApp.screen) {
        sprite.destroy()
        cleanupSceneResources(sceneIndex)
        return
      }

      finalVideoContainer.addChild(sprite)
      spritesRef.current.set(sceneIndex, sprite)
      
      // 스프라이트 생성 직후 클릭 이벤트 설정 (다음 프레임에서 실행하여 렌더링 완료 보장)
      // setupSpriteClickEvent 함수를 사용하여 설정 (전역 변수를 통해 접근)
      requestAnimationFrame(() => {
        const setupFn = (window as { __setupSpriteClickEvent__?: (sceneIndex: number, sprite: PIXI.Sprite) => boolean }).__setupSpriteClickEvent__
        if (setupFn) {
          setupFn(sceneIndex, sprite)
        }
      })
    } catch {
      cleanupSceneResources(sceneIndex)
    }
  }, [cleanupSceneResources, pixiReady, seekVideoFrame, waitForMetadata])

  const renderSubtitle = useCallback((sceneIndex: number, script: string) => {
    const app = appRef.current
    const subtitleContainer = subtitleContainerRef.current
    if (!app || !subtitleContainer || !pixiReady) {
      return
    }

    textsRef.current.forEach((textObj) => {
      hideText(textObj)
    })

    if (!script || !script.trim()) {
      return
    }

    // 일시정지 편집 모드에서는 Fabric 텍스트를 사용하므로 Pixi 텍스트를 숨긴다.
    if (!isPlaying) {
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

    if (textSettings?.transform) {
      textX = textSettings.transform.x || textX
      textY = textSettings.transform.y || textY
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

    const textStyle = new PIXI.TextStyle({
      fontFamily,
      fontSize,
      fill: fillColor,
      align: 'center',
      fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
      fontStyle,
      wordWrap: true,
      wordWrapWidth: stageWidth * 0.75,
      breakWords: true,
      stroke: {
        color: textSettings?.stroke?.color || '#000000',
        width: textSettings?.stroke?.width ?? 10,
      },
    })

    if (isUnderline) {
      ;(textStyle as PIXI.TextStyle & { underline?: boolean }).underline = true
    }

    let textObj = textsRef.current.get(sceneIndex)
    if (!textObj || textObj.destroyed) {
      textObj = new PIXI.Text({
        text: script,
        style: textStyle,
      })
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
  }, [isPlaying, pixiReady])

  const playTts = useCallback(async (sceneIndex: number, voiceTemplate: string | null | undefined, script: string) => {
    if (!voiceTemplate || !script || !script.trim()) {
      return
    }

    const existingAudio = ttsAudioRefsRef.current.get(sceneIndex)
    if (existingAudio) {
      existingAudio.pause()
      existingAudio.src = ''
      ttsAudioRefsRef.current.delete(sceneIndex)
    }

    const ttsKey = `${voiceTemplate}::${script}`
    const cached = ttsCacheRef.current.get(ttsKey)

    // Step3에서는 TTS 합성을 하지 않음 (Step2에서 이미 합성된 캐시만 사용)
    // 캐시에 없으면 재생하지 않고 alert 표시
    if (!cached || !cached.url) {
      alert(`TTS 캐시를 찾을 수 없습니다. Step2에서 TTS 합성을 완료한 후 Step3로 이동해주세요.\n\n씬 인덱스: ${sceneIndex}\n스크립트: ${script.substring(0, 50)}...\n찾는 키: ${ttsKey.substring(0, 80)}...`)
      return
    }

    const audio = new Audio(cached.url)
    audio.playbackRate = playbackSpeed
    ttsAudioRefsRef.current.set(sceneIndex, audio)

    audio.addEventListener('ended', () => {
      ttsAudioRefsRef.current.delete(sceneIndex)
    })
    audio.addEventListener('error', () => {
      ttsAudioRefsRef.current.delete(sceneIndex)
    })

    try {
      await audio.play()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return
      }
    }
  }, [playbackSpeed])

  const setCurrentSceneIndex = useCallback((index: number) => {
    onCurrentSceneIndexChange?.(index)
  }, [onCurrentSceneIndexChange])

  const totalDurationValue = useMemo(() => {
    return scenes.reduce((sum, scene) => sum + getSceneSegmentDuration(scene), 0)
  }, [scenes])

  // totalDurationValue가 변경될 때마다 totalDuration state 업데이트
  useEffect(() => {
    if (totalDurationValue > 0) {
      setTotalDuration(totalDurationValue)
    }
  }, [totalDurationValue])

  // 씬 선택 시 타임라인 위치 업데이트 (재생 중이 아닐 때만)
  useEffect(() => {
    if (!isPlaying && currentSceneIndex >= 0 && pixiReady) {
      const playableScenes = getPlayableScenes(scenes)
      // 현재 씬이 playable한지 확인
      const playableIndex = playableScenes.findIndex((ps) => ps.originalIndex === currentSceneIndex)
      if (playableIndex >= 0) {
        // 이전 씬들의 duration 합계를 계산하여 현재 시간 설정
        const previousDuration = getPreviousPlayableDuration(playableScenes, playableIndex)
        setCurrentTime(previousDuration)
      } else {
        // playable하지 않은 씬인 경우, 이전 씬들의 duration 합계 계산
        const playableBeforeCurrent = playableScenes.filter((ps) => ps.originalIndex < currentSceneIndex)
        const previousDuration = playableBeforeCurrent.reduce((sum, ps) => sum + ps.duration, 0)
        setCurrentTime(previousDuration)
      }
    }
  }, [currentSceneIndex, scenes, isPlaying, pixiReady])

  const currentScene = scenes[currentSceneIndex]
  const currentSceneVideoUrl = currentScene?.videoUrl
  const currentSceneScript = currentScene?.script ?? ''
  // currentSelectionStartSeconds prop이 있으면 사용하고, 없으면 scenes에서 읽기
  const currentSceneSelectionStart = currentSelectionStartSeconds ?? currentScene?.selectionStartSeconds ?? 0

  const subtitleSettingsKey = useMemo(() => {
    return JSON.stringify(timeline?.scenes?.[currentSceneIndex]?.text ?? null)
  }, [timeline, currentSceneIndex])

  // Fast 트랙과 동일하게 timeline scenes의 키를 생성하여 변경 감지
  const timelineScenesKey = useMemo(() => {
    if (!timeline?.scenes || timeline.scenes.length === 0) return ''
    return timeline.scenes.map((scene, idx) => 
      `${idx}-${scene.imageTransform ? JSON.stringify(scene.imageTransform) : 'none'}-${scene.text?.content || ''}`
    ).join('|')
  }, [timeline])

  const { syncFromScene: syncFabricScene, syncFromSceneDirect, fabricCanvasRef: proFabricCanvasRef, fabricReady } = useProFabricResizeDrag({
    videoElementsRef,
    enabled: pixiReady && !isPlaying,
    playbackContainerRef,
    canvasDisplaySize,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    currentSceneIndex,
    timeline,
    setTimeline,
    fallbackScript: currentSceneScript,
    spritesRef,
    textsRef,
  })

  // Fabric.js 편집 모드일 때 PixiJS 캔버스 숨기기 (Fast track과 동일한 방식)
  useEffect(() => {
    if (!pixiReady || !appRef.current) {
      return
    }

    const appCanvas = getAppCanvas(appRef.current)
    if (!appCanvas) {
      return
    }

    const fabricEditingEnabled = proFabricCanvasRef?.current !== null
    
    if (fabricEditingEnabled && !isPlaying) {
      // Fabric.js 편집 모드일 때 PixiJS 캔버스 숨김
      appCanvas.style.opacity = '0'
      appCanvas.style.pointerEvents = 'none'
    } else {
      // 재생 중이거나 Fabric.js 편집 모드가 아닐 때 PixiJS 캔버스 표시
      appCanvas.style.opacity = '1'
      appCanvas.style.pointerEvents = 'auto'
    }
  }, [pixiReady, isPlaying, proFabricCanvasRef, appRef])

  // 스프라이트 클릭 이벤트 설정 헬퍼 함수 (useProFabricResizeDrag 호출 후 정의)
  const setupSpriteClickEvent = useCallback((sceneIndex: number, sprite: PIXI.Sprite) => {
    if (isPlaying || !pixiReady || !proFabricCanvasRef?.current) {
      return false
    }

    const fabricCanvas = proFabricCanvasRef.current

    if (!sprite || sprite.destroyed || !sprite.visible) {
      return false
    }

    // 이미 설정되어 있으면 이벤트 핸들러만 다시 등록 (중복 방지)
    if (sprite.interactive && sprite.cursor === 'pointer') {
      // 이벤트 핸들러는 항상 재등록 (최신 클로저 사용)
      sprite.off('pointerdown')
      sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        
        const objects = fabricCanvas.getObjects() as Array<fabric.Object & { dataType?: 'image' | 'text' }>
        const imageObject = objects.find((obj) => obj.dataType === 'image')
        if (imageObject) {
          fabricCanvas.setActiveObject(imageObject)
          fabricCanvas.requestRenderAll()
        }
      })
      return true
    }

    sprite.interactive = true
    sprite.cursor = 'pointer'
    sprite.off('pointerdown')
    sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      e.stopPropagation()
      
      const objects = fabricCanvas.getObjects() as Array<fabric.Object & { dataType?: 'image' | 'text' }>
      const imageObject = objects.find((obj) => obj.dataType === 'image')
      if (imageObject) {
        fabricCanvas.setActiveObject(imageObject)
        fabricCanvas.requestRenderAll()
      }
    })

    return true
  }, [isPlaying, pixiReady, proFabricCanvasRef])

  // proFabricCanvasRef와 setupSpriteClickEvent를 전역에서 접근 가능하도록 설정 (loadVideoAsSprite에서 사용하기 위해)
  useEffect(() => {
    if (proFabricCanvasRef) {
      ;(window as { __proFabricCanvasRef__?: MutableRefObject<fabric.Canvas | null> }).__proFabricCanvasRef__ = proFabricCanvasRef
    } else {
      delete (window as { __proFabricCanvasRef__?: MutableRefObject<fabric.Canvas | null> }).__proFabricCanvasRef__
    }
    if (setupSpriteClickEvent) {
      ;(window as { __setupSpriteClickEvent__?: (sceneIndex: number, sprite: PIXI.Sprite) => boolean }).__setupSpriteClickEvent__ = setupSpriteClickEvent
    } else {
      delete (window as { __setupSpriteClickEvent__?: (sceneIndex: number, sprite: PIXI.Sprite) => boolean }).__setupSpriteClickEvent__
    }
    return () => {
      delete (window as { __proFabricCanvasRef__?: MutableRefObject<fabric.Canvas | null> }).__proFabricCanvasRef__
      delete (window as { __setupSpriteClickEvent__?: (sceneIndex: number, sprite: PIXI.Sprite) => boolean }).__setupSpriteClickEvent__
    }
  }, [proFabricCanvasRef, setupSpriteClickEvent])

  // 스프라이트와 텍스트에 클릭 이벤트 제거 (재생 중일 때만)
  useEffect(() => {
    if (isPlaying) {
      // 재생 중이면 클릭 이벤트 제거
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

  // Fabric.js 캔버스에서 클릭 이벤트 처리 (스프라이트 클릭 감지)
  useEffect(() => {
    const fabricCanvas = proFabricCanvasRef?.current
    if (!fabricCanvas || isPlaying || !pixiReady) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMouseDown = (e: any) => {
      // 클릭한 위치에 Fabric.js 객체가 있는지 확인
      const target = e.target
      const pointer = e.pointer
      
      const objects = fabricCanvas.getObjects() as Array<fabric.Object & { dataType?: 'image' | 'text' }>
      const imageObject = objects.find((obj) => obj.dataType === 'image')
      
      // 이미지 객체가 없으면 종료
      if (!imageObject) {
        return
      }
      
      // 배경을 클릭한 경우 선택 해제
      if (!target || target === fabricCanvas) {
        fabricCanvas.discardActiveObject()
        fabricCanvas.requestRenderAll()
        return
      }
      
      // 클릭한 위치가 이미지 객체 위에 있는지 확인
      const isClickOnImage = imageObject.containsPoint(new fabric.Point(pointer.x, pointer.y))
      
      // 이미지 객체 위를 클릭한 경우에만 이미지 객체 선택
      if (isClickOnImage) {
        fabricCanvas.setActiveObject(imageObject)
        fabricCanvas.requestRenderAll()
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('mouse:down', handleMouseDown as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('mouse:down', handleMouseDown as any)
    }
  }, [proFabricCanvasRef, isPlaying, pixiReady, currentSceneIndex])

  // 스프라이트가 생성된 후 클릭 이벤트 설정
  // loadVideoAsSprite가 완료된 후에 실행되도록 함
  useEffect(() => {
    if (isPlaying || !pixiReady || !proFabricCanvasRef?.current) {
      return
    }

    // 스프라이트가 생성될 때까지 대기 (최대 20프레임, 약 333ms)
    let retryCount = 0
    const MAX_RETRIES = 20
    let frameId: number | null = null
    
    const checkAndSetup = () => {
      const sprite = spritesRef.current.get(currentSceneIndex)
      if (sprite && !sprite.destroyed && sprite.visible) {
        if (!sprite.interactive || sprite.cursor !== 'pointer') {
          // 클릭 이벤트가 설정되지 않은 경우에만 설정
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
  }, [isPlaying, pixiReady, currentSceneIndex, proFabricCanvasRef, setupSpriteClickEvent])

  useEffect(() => {
    if (!pixiReady || isPlaying || currentSceneIndex < 0) {
      return
    }

    let cancelled = false

    const renderCurrentScene = async () => {
      // 먼저 다른 씬의 스프라이트는 숨김 (현재 씬 스프라이트는 나중에 처리)
      spritesRef.current.forEach((sprite, index) => {
        if (index !== currentSceneIndex && !sprite.destroyed) {
          hideSprite(sprite)
        }
      })

      if (currentSceneVideoUrl) {
        // 최신 selectionStartSeconds 값을 사용 (prop 또는 scenes에서)
        await loadVideoAsSprite(currentSceneIndex, currentSceneVideoUrl, currentSceneSelectionStart)
      } else {
        // 비디오 URL이 없으면 모든 스프라이트 숨김
        spritesRef.current.forEach((sprite) => {
          if (!sprite.destroyed) {
            hideSprite(sprite)
          }
        })
      }

      if (cancelled) {
        return
      }

      // loadVideoAsSprite 완료 후 현재 씬 스프라이트의 가시성 처리
      // Fabric.js 편집 모드일 때는 PixiJS 스프라이트를 숨김 (Fabric.js 이미지 객체만 표시)
      const fabricEditingEnabled = proFabricCanvasRef?.current !== null
      const currentSprite = spritesRef.current.get(currentSceneIndex)
      
      // 스프라이트가 생성되었는지 확인하고 표시
      if (currentSprite && !currentSprite.destroyed) {
        // 타임라인의 imageTransform이 있으면 적용 (loadVideoAsSprite에서 이미 적용했지만 재확인)
        const currentTimeline = useVideoCreateStore.getState().timeline
        const timelineScene = currentTimeline?.scenes?.[currentSceneIndex]
        const imageTransform = timelineScene?.imageTransform
        
        if (imageTransform) {
          currentSprite.x = imageTransform.x
          currentSprite.y = imageTransform.y
          currentSprite.width = imageTransform.width
          currentSprite.height = imageTransform.height
          currentSprite.rotation = imageTransform.rotation ?? 0
        }
        
        // 일단 스프라이트를 표시 (Fabric.js 객체가 생성되기 전까지는 스프라이트를 보여줌)
        currentSprite.visible = true
        currentSprite.alpha = 1
        
        // PixiJS 앱이 렌더링되도록 강제
        const app = appRef.current
        if (app) {
          app.renderer.render(app.stage)
        }
      }

      renderSubtitle(currentSceneIndex, currentSceneScript)
      
      // 비디오 로드 완료 후 Fabric.js 동기화 (비디오가 있어야 Fabric.js 이미지 생성 가능)
      if (fabricEditingEnabled && !isPlaying && pixiReady && currentSceneVideoUrl) {
        // 비디오가 완전히 준비될 때까지 기다린 후 동기화
        const video = videoElementsRef.current.get(currentSceneIndex)
        // readyState >= 2: 프레임 데이터를 사용할 수 있음
        // videoWidth와 videoHeight가 있어야 프레임 캡처 가능
        
        const performSync = async () => {
          if (cancelled || !syncFromSceneDirect) {
            return
          }
          
          // Fabric.js 동기화 실행 (debounce 없이 직접 호출)
          await syncFromSceneDirect()
          
          // 동기화 완료 후 Fabric.js 객체가 생성되었는지 확인
          const fabricCanvas = proFabricCanvasRef?.current
          if (fabricCanvas) {
            const objects = fabricCanvas.getObjects() as Array<fabric.Object & { dataType?: 'image' | 'text' }>
            const hasImageObject = objects.some((obj) => obj.dataType === 'image')
            
            // 이미지 객체가 생성되었으면 스프라이트 숨김
            if (hasImageObject && currentSprite && !currentSprite.destroyed) {
              hideSprite(currentSprite)
            }
          }
        }
        
        if (video && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
          // 비디오가 이미 준비되어 있으면 즉시 동기화
          // seek 완료 후 프레임이 업데이트될 때까지 약간의 지연 추가
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              void performSync()
            })
          })
        } else {
          // 비디오가 아직 준비되지 않았으면 준비될 때까지 대기
          const checkVideoReady = () => {
            if (cancelled) {
              return
            }
            const currentVideo = videoElementsRef.current.get(currentSceneIndex)
            if (currentVideo && currentVideo.readyState >= 2 && currentVideo.videoWidth && currentVideo.videoHeight) {
              // 비디오가 준비되면 동기화
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (!cancelled) {
                    void performSync()
                  }
                })
              })
            } else {
              // 아직 준비되지 않았으면 다음 프레임에 다시 확인 (최대 60프레임, 약 1초)
              const maxRetries = 60
              let retryCount = 0
              const retryCheck = () => {
                if (cancelled) {
                  return
                }
                const checkVideo = videoElementsRef.current.get(currentSceneIndex)
                if (checkVideo && checkVideo.readyState >= 2 && checkVideo.videoWidth && checkVideo.videoHeight) {
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      if (!cancelled) {
                        void performSync()
                      }
                    })
                  })
                } else if (retryCount < maxRetries) {
                  retryCount++
                  requestAnimationFrame(retryCheck)
                }
              }
              requestAnimationFrame(retryCheck)
            }
          }
          requestAnimationFrame(checkVideoReady)
        }
      } else if (!fabricEditingEnabled && currentSprite && !currentSprite.destroyed) {
        // Fabric.js 편집 모드가 아닐 때는 스프라이트 표시 (이미 위에서 설정했지만 명시적으로)
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      
      // 스프라이트 생성 완료 - 클릭 이벤트는 별도 useEffect에서 설정됨
    }

    void renderCurrentScene().catch(() => {
      // 현재 씬 렌더링 오류
    })

    return () => {
      cancelled = true
    }
  }, [
    currentSceneIndex,
    currentSceneScript,
    currentSceneVideoUrl,
    currentSceneSelectionStart,
    isPlaying,
    loadVideoAsSprite,
    pixiReady,
    renderSubtitle,
    syncFabricScene,
    syncFromSceneDirect,
    proFabricCanvasRef,
    timelineScenesKey, // 타임라인 변경 감지
    fabricReady,
  ])

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

  // 타임라인 변경 시 스프라이트 업데이트 (imageTransform 변경 반영)
  useEffect(() => {
    if (!pixiReady || isPlaying || currentSceneIndex < 0 || !timeline) {
      return
    }

    const timelineScene = timeline.scenes?.[currentSceneIndex]
    if (!timelineScene) {
      return
    }

    const sprite = spritesRef.current.get(currentSceneIndex)
    if (sprite && !sprite.destroyed && timelineScene.imageTransform) {
      // 타임라인의 imageTransform 적용
      sprite.x = timelineScene.imageTransform.x
      sprite.y = timelineScene.imageTransform.y
      sprite.width = timelineScene.imageTransform.width
      sprite.height = timelineScene.imageTransform.height
      sprite.rotation = timelineScene.imageTransform.rotation ?? 0
      
      // 스프라이트가 표시되도록 보장
      sprite.visible = true
      sprite.alpha = 1
      
      // PixiJS 앱이 렌더링되도록 강제
      const app = appRef.current
      if (app) {
        app.renderer.render(app.stage)
      }
    }
  }, [timelineScenesKey, currentSceneIndex, isPlaying, pixiReady, timeline])

  // Fabric.js 씬 동기화 (Fast 트랙과 동일한 방식)
  // timeline이 변경될 때 동기화 (renderCurrentScene에서도 호출하지만, timeline 변경 시에도 동기화 필요)
  useEffect(() => {
    const currentTimeline = timeline
    if (!fabricReady || !currentTimeline || currentTimeline.scenes.length === 0) {
      return
    }
    if (!pixiReady || isPlaying || currentSceneIndex < 0) {
      return
    }
    
    syncFabricScene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, timelineScenesKey, currentSceneIndex, isPlaying, pixiReady, syncFabricScene])

  // Transport 기반 렌더러 (Fast 트랙과 동일한 방식)
  const { transport, transportHook, transportState, renderAt, renderAtRef } = useProTransportRenderer({
    timeline,
    scenes,
    pixiReady,
    appRef,
    spritesRef,
    textsRef,
    videoElementsRef,
    videoTexturesRef,
    currentSceneIndexRef,
    loadVideoAsSprite,
    renderSubtitle,
  })

  // Transport에 totalDuration 설정
  useEffect(() => {
    if (totalDurationValue > 0 && transportHook) {
      transportHook.setTotalDuration(totalDurationValue)
    }
  }, [transportHook, totalDurationValue])

  // Transport playbackRate 설정
  useEffect(() => {
    if (transportHook) {
      transportHook.setRate(playbackSpeed)
    }
  }, [transportHook, playbackSpeed])

  // Transport 재생 상태와 isPlaying 동기화
  useEffect(() => {
    if (!transportHook) return

    if (isPlaying && !transportState.isPlaying) {
      transportHook.play()
    } else if (!isPlaying && transportState.isPlaying) {
      transportHook.pause()
    }
  }, [transportHook, isPlaying, transportState.isPlaying])

  // Transport currentTime과 currentTime state 동기화 (재생 중일 때만)
  useEffect(() => {
    if (!transportHook || !transportState.isPlaying) return

    const updateCurrentTime = () => {
      setCurrentTime(transportHook.currentTime)
    }

    // requestAnimationFrame으로 매 프레임 업데이트
    let rafId: number | null = null
    const loop = () => {
      if (transportState.isPlaying && transportHook) {
        updateCurrentTime()
        rafId = requestAnimationFrame(loop)
      }
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [transportHook, transportState.isPlaying, setCurrentTime])

  // Transport totalDuration과 totalDuration state 동기화
  useEffect(() => {
    if (transportHook) {
      setTotalDuration(transportState.totalDuration)
    }
  }, [transportHook, transportState.totalDuration, setTotalDuration])

  // 씬 클릭 시 Transport seek (재생 중이 아닐 때만)
  useEffect(() => {
    if (!transportHook || isPlaying || currentSceneIndex < 0 || !pixiReady) {
      return
    }

    const playableScenes = getPlayableScenes(scenes)
    const playableIndex = playableScenes.findIndex((ps) => ps.originalIndex === currentSceneIndex)
    if (playableIndex >= 0) {
      const previousDuration = getPreviousPlayableDuration(playableScenes, playableIndex)
      transportHook.seek(previousDuration)
      // renderAt 호출하여 즉시 렌더링
      if (renderAtRef.current) {
        renderAtRef.current(previousDuration, { forceSceneIndex: currentSceneIndex })
      }
    }
  }, [transportHook, currentSceneIndex, scenes, isPlaying, pixiReady, renderAtRef])

  const handlePlayPause = useCallback(() => {
    if (!transportHook) {
      onPlayPause()
      return
    }

    if (transportState.isPlaying) {
      transportHook.pause()
    } else {
      // 재생 시작 전에 현재 시간에서 렌더링
      if (renderAtRef.current) {
        renderAtRef.current(transportHook.currentTime, { skipAnimation: false })
      }
      transportHook.play()
    }
    // 부모 컴포넌트에 상태 변경 알림
    onPlayPause()
  }, [transportHook, transportState.isPlaying, renderAtRef, onPlayPause])

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0 shrink-0 mb-4">
        <div
          ref={playbackContainerRef}
          className="relative bg-black rounded-2xl overflow-hidden mx-auto"
          style={{
            width: canvasDisplaySize ? `${canvasDisplaySize.width}px` : '100%',
            height: canvasDisplaySize ? `${canvasDisplaySize.height}px` : 'auto',
            aspectRatio: '9 / 16',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <div ref={pixiContainerRef} className="absolute inset-0 z-10" />
          {!currentVideoUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 z-20 pointer-events-none">
              비디오 없음
            </div>
          )}
        </div>
      </div>

      <div className="w-full shrink-0 space-y-3">
        <TimelineBar
          timelineBarRef={timelineBarRef}
          currentTime={currentTime}
          totalDuration={totalDuration}
          progressRatio={totalDuration > 0 ? currentTime / totalDuration : 0}
          playbackSpeed={playbackSpeed}
          isPlaying={isPlaying}
          onTimelineMouseDown={() => {
            // Pro step3에서는 수동 seek 미지원
          }}
          timeline={null}
          bgmTemplate={bgmTemplate}
          showGrid={false}
          onPlayPause={handlePlayPause}
          isTtsBootstrapping={false}
          isBgmBootstrapping={false}
          isPreparing={false}
        />

        <SpeedSelector
          playbackSpeed={playbackSpeed}
          totalDuration={totalDuration}
          onPlaybackSpeedChange={setPlaybackSpeed}
          onResizeTemplate={() => {
            // Pro step3에서는 미지원
          }}
          onImageFitChange={() => {
            // Pro step3에서는 미지원
          }}
          currentSceneIndex={0}
          timeline={null}
        />

        {onExport && (
          <div className="mb-2">
            <ExportButton isExporting={isExporting} onExport={onExport} />
          </div>
        )}
      </div>
    </div>
  )
})
