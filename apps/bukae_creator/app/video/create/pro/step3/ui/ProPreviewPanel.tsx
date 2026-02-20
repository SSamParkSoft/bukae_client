'use client'

import { memo, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { TimelineBar, SpeedSelector, ExportButton } from '@/app/video/create/step3/shared/ui'
import type { ProStep3Scene } from '../model/types'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { useProTransportRenderer } from '../hooks/playback/useProTransportRenderer'
import { useProTransportPlayback } from '../hooks/playback/useProTransportPlayback'
import { useProTransportTtsSync } from '../hooks/playback/useProTransportTtsSync'
import { videoSpriteAdapter } from '../hooks/playback/media/videoSpriteAdapter'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { calculateAspectFittedSize } from '../utils/proPreviewLayout'
import {
  getDurationBeforeSceneIndex,
  getPlayableScenes,
} from '../utils/proPlaybackUtils'
import { useProFabricResizeDrag } from '../hooks/editing/useProFabricResizeDrag'
import { useProEditModeManager } from '../hooks/editing/useProEditModeManager'

interface ProPreviewPanelProps {
  currentVideoUrl?: string | null
  currentSelectionStartSeconds?: number
  currentSceneIndex?: number
  scenes: ProStep3Scene[]
  isPlaying: boolean
  onBeforePlay?: () => boolean
  onPlayingChange?: (isPlaying: boolean) => void
  bgmTemplate?: string | null
  onExport?: () => void
  isExporting?: boolean
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

export const ProPreviewPanel = memo(function ProPreviewPanel({
  currentVideoUrl,
  currentSceneIndex = 0,
  scenes,
  isPlaying,
  onBeforePlay,
  onPlayingChange,
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
  const textStrokesRef = useRef<Map<number, PIXI.Text>>(new Map()) // stroke 전용 레이어
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const videoTexturesRef = useRef<Map<number, PIXI.Texture>>(new Map())
  const videoElementsRef = useRef<Map<number, HTMLVideoElement>>(new Map())
  const setupSpriteClickEventRef = useRef<(sceneIndex: number, sprite: PIXI.Sprite) => boolean>(() => false)

  const ttsAudioRefsRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const ttsCacheRef = useRef<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>(new Map())

  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [pixiReady, setPixiReady] = useState(false)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')

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

  const loadVideoAsSprite = useCallback(async (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number): Promise<void> => {
    // 초기 검증
    if (!pixiReady) {
      return
    }

    cleanupSceneResources(sceneIndex)

    const video = videoSpriteAdapter.createElement(videoUrl)

    try {
      await videoSpriteAdapter.waitForMetadata(video, VIDEO_METADATA_TIMEOUT_MS)

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
      await videoSpriteAdapter.seekFrame(video, sceneStart, VIDEO_SEEK_TIMEOUT_MS)
      
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
      const sourceWidth = (currentVideo && currentVideo.videoWidth) || texture.width || stageWidth
      const sourceHeight = (currentVideo && currentVideo.videoHeight) || texture.height || stageHeight

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
      requestAnimationFrame(() => {
        setupSpriteClickEventRef.current(sceneIndex, sprite)
      })
    } catch {
      cleanupSceneResources(sceneIndex)
    }
  }, [cleanupSceneResources, pixiReady])

  const renderSubtitle = useCallback((sceneIndex: number, script: string) => {
    const app = appRef.current
    const subtitleContainer = subtitleContainerRef.current
    if (!app || !subtitleContainer || !pixiReady) {
      return
    }

    // 기존 텍스트와 stroke 숨기기
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
      // transform에 width가 있으면 wordWrapWidth로 사용
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
    
    // 기본 텍스트 스타일 (fill만)
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

    // stroke가 있으면 두 레이어로 렌더링 (외곽에만 테두리)
    if (strokeWidth > 0) {
      // stroke 레이어 (뒤): stroke만, fill은 투명하게 설정
      // fill 레이어를 위에 올려서 stroke가 외곽에만 보이도록 함
      const strokeStyleConfig: Partial<PIXI.TextStyle> = {
        fontFamily,
        fontSize,
        fill: 'transparent', // fill을 투명하게 설정
        align: textAlign as 'left' | 'center' | 'right' | 'justify',
        fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
        fontStyle,
        wordWrap: true,
        wordWrapWidth: wordWrapWidth,
        breakWords: true,
        stroke: strokeColor,
        strokeThickness: strokeWidth,
      }
      
      const strokeStyle = new PIXI.TextStyle(strokeStyleConfig)
      if (isUnderline) {
        ;(strokeStyle as PIXI.TextStyle & { underline?: boolean }).underline = true
      }

      // stroke 레이어 생성/업데이트
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
      
      // fill 레이어를 stroke 레이어 위에 배치
      const strokeIndex = subtitleContainer.getChildIndex(strokeObj)
      
      // fill 레이어 생성/업데이트
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
      
      // fill 레이어를 stroke 레이어 위에 배치
      const fillIndex = subtitleContainer.getChildIndex(textObj)
      if (fillIndex <= strokeIndex) {
        subtitleContainer.setChildIndex(textObj, strokeIndex + 1)
      }
    } else {
      // stroke가 없으면 fill만 렌더링
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
      
      // stroke 레이어가 있으면 제거
      const strokeObj = textStrokesRef.current.get(sceneIndex)
      if (strokeObj && !strokeObj.destroyed) {
        hideText(strokeObj)
      }
    }
  }, [pixiReady])

  const totalDurationValue = useMemo(() => {
    return getPlayableScenes(scenes).reduce((sum, playable) => sum + playable.duration, 0)
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
      const previousDuration = getDurationBeforeSceneIndex(scenes, currentSceneIndex)
      setCurrentTime(previousDuration)
    }
  }, [currentSceneIndex, scenes, isPlaying, pixiReady])

  const currentScene = scenes[currentSceneIndex]
  const currentSceneVideoUrl = currentScene?.videoUrl
  const currentSceneScript = currentScene?.script ?? ''

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

  const useFabricEditing = editMode === 'text'
  const { syncFromScene: syncFabricScene, syncFromSceneDirect, fabricCanvasRef: proFabricCanvasRef, fabricReady } = useProFabricResizeDrag({
    videoElementsRef,
    enabled: pixiReady && !isPlaying && useFabricEditing,
    playbackContainerRef,
    canvasDisplaySize,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    currentSceneIndex,
    timeline,
    setTimeline,
    spritesRef,
    textsRef,
  })

  // 재생 시작 시 편집 모드 해제 (Fast와 동일)
  useEffect(() => {
    if (isPlaying && editMode !== 'none') {
      setEditMode('none')
    }
  }, [isPlaying, editMode])

  // Fast와 동일: 텍스트 편집 모드(useFabricEditing)일 때만 Fabric 표시, 그 외에는 Pixi 표시
  useProEditModeManager({
    appRef,
    fabricCanvasRef: proFabricCanvasRef,
    subtitleContainerRef,
    useFabricEditing,
    pixiReady,
    fabricReady,
    isPlaying,
  })

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

  // loadVideoAsSprite에서 최신 클릭 핸들러를 참조할 수 있도록 ref 동기화
  useEffect(() => {
    setupSpriteClickEventRef.current = setupSpriteClickEvent
    return () => {
      setupSpriteClickEventRef.current = () => false
    }
  }, [setupSpriteClickEvent])

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

  useEffect(() => {
    if (!pixiReady || isPlaying || currentSceneIndex < 0 || !renderAtRef.current) {
      return
    }

    const selectedSceneStartTime = getDurationBeforeSceneIndex(scenes, currentSceneIndex)
    renderAtRef.current(selectedSceneStartTime, {
      forceSceneIndex: currentSceneIndex,
    })
  }, [currentSceneIndex, isPlaying, pixiReady, scenes, timelineScenesKey, renderAtRef])

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
