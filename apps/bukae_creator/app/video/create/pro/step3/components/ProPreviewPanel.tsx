'use client'

import React, { memo, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import * as PIXI from 'pixi.js'
import { TimelineBar, SpeedSelector, ExportButton } from '@/app/video/create/_step3-components'
import type { ProStep3Scene } from './ProSceneListPanel'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { authStorage } from '@/lib/api/auth-storage'
import { useVideoSegmentPlayer } from '../hooks/playback/useVideoSegmentPlayer'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'

interface ProPreviewPanelProps {
  /** 현재 선택된 씬의 비디오 URL */
  currentVideoUrl?: string | null
  /** 현재 선택된 씬의 격자 시작 시간 (초) */
  currentSelectionStartSeconds?: number
  /** 현재 선택된 씬 인덱스 (단일 소스: 부모 상태) */
  currentSceneIndex?: number
  /** 재생 중 씬 인덱스 변경 시 부모 상태 동기화 (segment player에서 호출) */
  onCurrentSceneIndexChange?: (index: number) => void
  /** 모든 씬 데이터 (재생 시 사용) */
  scenes: ProStep3Scene[]
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 재생 버튼 클릭 핸들러 */
  onPlayPause: () => void
  /** BGM 템플릿 */
  bgmTemplate?: string | null
  /** 내보내기 핸들러 */
  onExport?: () => void
  /** 내보내기 중 여부 */
  isExporting?: boolean
}

/**
 * Pro step3 전용 PreviewPanel
 * - 비디오는 PixiJS로만 표시 (재생/정지 시 동일)
 * - 재생 버튼 클릭 시 선택된 구간들을 이어붙여서 재생
 */
export const ProPreviewPanel = memo(function ProPreviewPanel({
  currentVideoUrl,
  currentSceneIndex = 0,
  onCurrentSceneIndexChange,
  scenes,
  isPlaying,
  onPlayPause,
  bgmTemplate,
  onExport,
  isExporting = false,
}: ProPreviewPanelProps) {
  // Timeline을 store에서 가져오기 (자막 설정을 읽기 위해)
  // Timeline 전체를 가져오는 대신, 현재 씬의 text 설정만 추적하여 변경 감지 최적화
  const timeline = useVideoCreateStore((state) => state.timeline)
  const currentSceneTextSettings = useVideoCreateStore((state) => 
    state.timeline?.scenes?.[currentSceneIndex]?.text
  )
  
  const playbackContainerRef = useRef<HTMLDivElement | null>(null)
  const pixiContainerRef = useRef<HTMLDivElement | null>(null)
  const timelineBarRef = useRef<HTMLDivElement | null>(null)
  
  // PixiJS 관련 refs (비디오 레이어 / 자막 레이어 분리해 자막이 항상 위에 오도록 함)
  const appRef = useRef<PIXI.Application | null>(null)
  const containerRef = useRef<PIXI.Container | null>(null)
  const videoContainerRef = useRef<PIXI.Container | null>(null)
  const subtitleContainerRef = useRef<PIXI.Container | null>(null)
  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const videoTexturesRef = useRef<Map<number, PIXI.Texture>>(new Map())
  const videoElementsRef = useRef<Map<number, HTMLVideoElement>>(new Map())
  
  // TTS 관련 refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const ttsAudioRefsRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const ttsCacheRef = useRef<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>(new Map())
  
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [pixiReady, setPixiReady] = useState(false)

  // 재생 중 씬 인덱스 업데이트는 segment player가 onCurrentSceneIndexChange로 부모에 전달
  const setCurrentSceneIndex = useCallback(
    (index: number) => onCurrentSceneIndexChange?.(index),
    [onCurrentSceneIndexChange]
  )

  // scenes를 ref로 두어 renderSubtitle이 격자만 바뀔 때 재생성되지 않게 함 (현재 씬 비디오 표시 effect 재실행 방지)
  const scenesRef = useRef(scenes)
  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  // 스테이지 크기 (9:16 비율)
  const stageDimensions = useMemo(() => ({
    width: 1080,
    height: 1920,
  }), [])

  // PixiJS 초기화
  useEffect(() => {
    if (!pixiContainerRef.current) return

    const container = pixiContainerRef.current
    const { width, height } = stageDimensions

    // 기존 앱 정리
    if (appRef.current) {
      try {
        if (appRef.current.stage) {
          appRef.current.stage.destroy({ children: true })
        }
        appRef.current.destroy(true, { children: false, texture: false })
      } catch (error) {
        console.error('PixiJS 앱 정리 오류:', error)
      }
      appRef.current = null
      containerRef.current = null
      videoContainerRef.current = null
      subtitleContainerRef.current = null
      textsRef.current.clear()
      spritesRef.current.clear()
      // VideoTexture 정리
      videoTexturesRef.current.forEach((texture) => {
        if (texture && !texture.destroyed) {
          texture.destroy(true)
        }
      })
      videoTexturesRef.current.clear()
      // Video 요소 정리
      videoElementsRef.current.forEach((video) => {
        if (video && video.parentNode) {
          video.pause()
          video.src = ''
          video.load()
        }
      })
      videoElementsRef.current.clear()
    }

    const app = new PIXI.Application()

    app.init({
      width,
      height,
      backgroundColor: 0x00000000, // 투명 배경
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      autoStart: true,
    }).then(() => {
      appRef.current = app

      const mainContainer = new PIXI.Container()
      app.stage.addChild(mainContainer)
      containerRef.current = mainContainer

      // 비디오 전용 컨테이너 (아래 레이어)
      const videoContainer = new PIXI.Container()
      mainContainer.addChild(videoContainer)
      videoContainerRef.current = videoContainer

      // 자막 컨테이너 (가장 위 레이어로 추가)
      const subtitleContainer = new PIXI.Container()
      mainContainer.addChild(subtitleContainer)
      subtitleContainerRef.current = subtitleContainer

      // Canvas 스타일 설정
      requestAnimationFrame(() => {
        if (!appRef.current || !appRef.current.canvas) return

        const containerRect = container.getBoundingClientRect()
        const containerWidth = containerRect.width || container.clientWidth
        const containerHeight = containerRect.height || container.clientHeight
        const targetRatio = 9 / 16

        let displayWidth: number
        let displayHeight: number
        if (containerWidth > 0 && containerHeight > 0) {
          if (containerWidth / containerHeight > targetRatio) {
            displayHeight = containerHeight
            displayWidth = containerHeight * targetRatio
          } else {
            displayWidth = containerWidth
            displayHeight = containerWidth / targetRatio
          }
        } else {
          displayWidth = width
          displayHeight = height
        }

        appRef.current.canvas.style.width = `${displayWidth}px`
        appRef.current.canvas.style.height = `${displayHeight}px`
        appRef.current.canvas.style.maxWidth = '100%'
        appRef.current.canvas.style.maxHeight = '100%'
        appRef.current.canvas.style.display = 'block'
        appRef.current.canvas.style.position = 'absolute'
        appRef.current.canvas.style.top = '0'
        appRef.current.canvas.style.left = '0'
        appRef.current.canvas.style.width = '100%'
        appRef.current.canvas.style.height = '100%'
        appRef.current.canvas.style.zIndex = '30'
        appRef.current.canvas.style.pointerEvents = 'none'
        container.appendChild(appRef.current.canvas)

        setPixiReady(true)
      })
    }).catch((error) => {
      console.error('PixiJS 초기화 오류:', error)
    })

    // ref 값들을 effect 시작 부분에서 복사하여 cleanup에서 사용
    const textsSnapshot = new Map(textsRef.current)
    const spritesSnapshot = new Map(spritesRef.current)
    const videoTexturesSnapshot = new Map(videoTexturesRef.current)
    const videoElementsSnapshot = new Map(videoElementsRef.current)

    return () => {
      if (appRef.current) {
        try {
          // 복사된 ref 값들로 cleanup 수행
          const texts = textsSnapshot
          const sprites = spritesSnapshot
          const videoTextures = videoTexturesSnapshot
          const videoElements = videoElementsSnapshot
          
          if (appRef.current.stage) {
            appRef.current.stage.destroy({ children: true })
          }
          appRef.current.destroy(true, { children: false, texture: false })
          
          // 복사된 값들로 정리
          texts.clear()
          sprites.clear()
          videoTextures.forEach((texture) => {
            if (texture && !texture.destroyed) {
              texture.destroy(true)
            }
          })
          videoTextures.clear()
          videoElements.forEach((video) => {
            if (video && video.parentNode) {
              video.pause()
              video.src = ''
              video.load()
            }
          })
          videoElements.clear()
        } catch (error) {
          console.error('PixiJS 정리 오류:', error)
        }
        appRef.current = null
        containerRef.current = null
        videoContainerRef.current = null
        subtitleContainerRef.current = null
        // 복사된 값들로 이미 정리했으므로 ref는 나중에 자동으로 clear됨
      }
      setPixiReady(false)
    }
  }, [stageDimensions])

  // AudioContext 초기화
  useEffect(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new AudioContext()
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error)
        audioContextRef.current = null
      }
    }
  }, [])

  // 비디오를 PixiJS Texture로 변환하여 Sprite로 렌더링
  const loadVideoAsSprite = useCallback(async (sceneIndex: number, videoUrl: string): Promise<void> => {
    if (!appRef.current || !videoContainerRef.current || !pixiReady) return

    // 기존 스프라이트 정리
    const existingSprite = spritesRef.current.get(sceneIndex)
    if (existingSprite && !existingSprite.destroyed) {
      videoContainerRef.current.removeChild(existingSprite)
      existingSprite.destroy()
      spritesRef.current.delete(sceneIndex)
    }

    // 기존 VideoTexture 정리
    const existingTexture = videoTexturesRef.current.get(sceneIndex)
    if (existingTexture && !existingTexture.destroyed) {
      existingTexture.destroy(true)
      videoTexturesRef.current.delete(sceneIndex)
    }

    // 기존 Video 요소 정리
    const existingVideo = videoElementsRef.current.get(sceneIndex)
    if (existingVideo) {
      existingVideo.pause()
      existingVideo.src = ''
      existingVideo.load()
      videoElementsRef.current.delete(sceneIndex)
    }

    // Video 요소 생성
    const video = document.createElement('video')
    video.src = videoUrl
    video.muted = false
    video.playsInline = true
    video.loop = false
    video.crossOrigin = 'anonymous'
    video.style.display = 'none' // 숨김 (PixiJS에서만 사용)
    video.preload = 'metadata' // 메타데이터만 미리 로드

    // VideoTexture 생성 (PixiJS v8에서는 PIXI.Texture.from 사용)
    try {
      // 비디오가 로드될 때까지 대기
      await new Promise<void>((resolve, reject) => {
        const handleLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
          video.removeEventListener('error', handleError)
          resolve()
        }
        const handleError = () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata)
          video.removeEventListener('error', handleError)
          reject(new Error('비디오 로드 실패'))
        }
        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        video.addEventListener('error', handleError)
        
        // 이미 로드된 경우
        if (video.readyState >= 1) {
          handleLoadedMetadata()
        } else {
          video.load()
        }
      })

      const videoTexture = PIXI.Texture.from(video)
      videoTexturesRef.current.set(sceneIndex, videoTexture)
      videoElementsRef.current.set(sceneIndex, video)

      // Sprite 생성
      const sprite = new PIXI.Sprite(videoTexture)
      sprite.anchor.set(0.5, 0.5)
      
      // 스테이지 중앙에 배치
      const stageWidth = appRef.current.screen.width
      const stageHeight = appRef.current.screen.height
      sprite.x = stageWidth / 2
      sprite.y = stageHeight / 2

      // 비디오 비율에 맞게 크기 조정
      const videoAspect = videoTexture.width / videoTexture.height
      const stageAspect = stageWidth / stageHeight

      let spriteWidth: number
      let spriteHeight: number
      if (videoAspect > stageAspect) {
        // 비디오가 더 넓음 - 너비에 맞춤
        spriteWidth = stageWidth
        spriteHeight = stageWidth / videoAspect
      } else {
        // 비디오가 더 높음 - 높이에 맞춤
        spriteHeight = stageHeight
        spriteWidth = stageHeight * videoAspect
      }

      sprite.width = spriteWidth
      sprite.height = spriteHeight

      sprite.visible = true
      sprite.alpha = 1

      videoContainerRef.current.addChild(sprite)
      spritesRef.current.set(sceneIndex, sprite)
    } catch (error) {
      console.error('비디오 Texture 생성 오류:', error)
    }
  }, [pixiReady])

  // Timeline ref를 사용하여 renderSubtitle에서 최신 timeline 읽기
  const timelineRef = useRef(timeline)
  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  // 자막 렌더링 함수 (timeline의 text 설정을 읽어서 적용)
  const renderSubtitle = useCallback((sceneIndex: number, script: string) => {
    if (!appRef.current || !subtitleContainerRef.current || !pixiReady) return

    const scene = scenesRef.current[sceneIndex]
    if (!scene) return

    // 기존 텍스트 숨김
    textsRef.current.forEach((textObj) => {
      if (textObj && !textObj.destroyed) {
        textObj.visible = false
        textObj.alpha = 0
      }
    })

    // 텍스트가 없으면 종료
    if (!script || !script.trim()) return

    // Timeline에서 자막 설정 가져오기 (ref를 통해 최신 값 읽기)
    const currentTimeline = timelineRef.current
    const timelineScene = currentTimeline?.scenes[sceneIndex]
    const textSettings = timelineScene?.text
    
    // 디버깅: timeline 변경 감지
    if (textSettings) {
      console.log('[ProPreviewPanel] 자막 렌더링:', {
        sceneIndex,
        font: textSettings.font,
        fontSize: textSettings.fontSize,
        color: textSettings.color,
        fontWeight: textSettings.fontWeight,
        position: textSettings.position,
      })
    }
    
    // 실제 렌더링 크기 가져오기 (stage 크기 사용)
    const stageWidth = appRef.current.screen.width
    const stageHeight = appRef.current.screen.height

    // 자막 스타일 설정 (timeline에서 가져오거나 기본값 사용)
    const fontFamily = textSettings?.font 
      ? resolveSubtitleFontFamily(textSettings.font)
      : resolveSubtitleFontFamily('pretendard')
    const fontSize = textSettings?.fontSize || 80
    const fillColor = textSettings?.color || '#ffffff'
    const fontWeight = textSettings?.fontWeight ?? (textSettings?.style?.bold ? 700 : 400)
    const fontStyle = textSettings?.style?.italic ? 'italic' : 'normal'
    const isUnderline = textSettings?.style?.underline || false
    
    // 위치 설정 (timeline에서 가져오거나 기본값 사용)
    const position = textSettings?.position || 'bottom'
    let textX = stageWidth / 2
    let textY = stageHeight * 0.885 // 기본값: 하단 중앙
    
    if (textSettings?.transform) {
      // transform이 있으면 그 좌표 사용
      textX = textSettings.transform.x || stageWidth / 2
      textY = textSettings.transform.y || stageHeight * 0.885
    } else {
      // position에 따라 Y 좌표 설정
      if (position === 'top') {
        textY = 200
      } else if (position === 'center') {
        textY = stageHeight / 2
      } else if (position === 'bottom') {
        textY = stageHeight - 200
      }
    }

    // 스타일 설정 객체 생성
    const styleConfig: Record<string, unknown> = {
      fontFamily,
      fontSize,
      fill: fillColor,
      align: 'center',
      fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
      fontStyle,
      wordWrap: true,
      wordWrapWidth: stageWidth * 0.75, // 스테이지 너비의 75%
      breakWords: true,
      stroke: {
        color: textSettings?.stroke?.color || '#000000',
        width: textSettings?.stroke?.width ?? 10,
      },
      underline: isUnderline,
    }
    
    const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)

    // 텍스트 객체 가져오기 또는 생성
    let textObj = textsRef.current.get(sceneIndex)
    if (!textObj || textObj.destroyed) {
      textObj = new PIXI.Text({
        text: script,
        style: textStyle,
      })
      textObj.anchor.set(0.5, 0.5)
      textObj.x = textX
      textObj.y = textY
      subtitleContainerRef.current.addChild(textObj)
      textsRef.current.set(sceneIndex, textObj)
    } else {
      // 기존 텍스트 객체 업데이트
      // 중요: PIXI.js에서 style을 변경할 때는 전체 TextStyle 객체를 교체해야 함
      // 스타일을 먼저 설정한 후 텍스트를 업데이트해야 변경사항이 반영됨
      
      // 기존 스타일과 비교하여 변경이 필요한지 확인
      const currentStyle = textObj.style
      const needsUpdate = 
        currentStyle.fontFamily !== fontFamily ||
        currentStyle.fontSize !== fontSize ||
        currentStyle.fill !== fillColor ||
        currentStyle.fontWeight !== String(fontWeight) ||
        currentStyle.fontStyle !== fontStyle ||
        // currentStyle.underline !== isUnderline ||
        textObj.x !== textX ||
        textObj.y !== textY ||
        textObj.text !== script
      
      if (needsUpdate) {
        // 스타일 교체
        textObj.style = textStyle
        // 스타일 변경 후 텍스트를 다시 설정해야 스타일이 적용됨
        textObj.text = script
        
        // 위치 업데이트
        textObj.x = textX
        textObj.y = textY
        
        // 강제로 업데이트 (PIXI.js가 변경사항을 인식하도록)
        textObj.visible = true
        textObj.alpha = 1
        
        console.log('[ProPreviewPanel] renderSubtitle: 텍스트 객체 업데이트 완료:', {
          sceneIndex,
          fontFamily,
          fontSize,
          fillColor,
          fontWeight,
          position,
          textX,
          textY,
          needsUpdate,
        })
      }
    }

    // 텍스트 표시
    textObj.visible = true
    textObj.alpha = 1
  }, [pixiReady])

  // TTS 재생 함수
  const playTts = useCallback(async (sceneIndex: number, voiceTemplate: string | null | undefined, script: string): Promise<void> => {
    if (!voiceTemplate || !script || !script.trim()) return

    // 기존 TTS 오디오 정리
    const existingAudio = ttsAudioRefsRef.current.get(sceneIndex)
    if (existingAudio) {
      existingAudio.pause()
      existingAudio.src = ''
      ttsAudioRefsRef.current.delete(sceneIndex)
    }

    // TTS 캐시 키 생성
    const ttsKey = `${voiceTemplate}::${script}`

    // 캐시 확인
    let cached = ttsCacheRef.current.get(ttsKey)
    if (!cached) {
      // TTS 합성
      try {
        const accessToken = authStorage.getAccessToken()
        if (!accessToken) {
          console.warn('TTS 재생: 로그인이 필요합니다.')
          return
        }

        const response = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            voiceTemplate,
            mode: 'text',
            text: script,
          }),
        })

        if (!response.ok) {
          console.error('TTS 합성 실패')
          return
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        // duration 계산 (간단히 blob 크기로 추정, 정확한 duration은 나중에 개선 가능)
        const durationSec = 5 // 기본값, 실제로는 오디오 메타데이터에서 가져와야 함

        cached = { blob, durationSec, url }
        ttsCacheRef.current.set(ttsKey, cached)
      } catch (error) {
        console.error('TTS 합성 오류:', error)
        return
      }
    }

    // 오디오 재생
    if (cached.url) {
      const audio = new Audio(cached.url)
      audio.playbackRate = playbackSpeed
      ttsAudioRefsRef.current.set(sceneIndex, audio)

      audio.addEventListener('ended', () => {
        ttsAudioRefsRef.current.delete(sceneIndex)
      })

      audio.addEventListener('error', () => {
        ttsAudioRefsRef.current.delete(sceneIndex)
      })

      await audio.play().catch((error) => {
        console.error('TTS 재생 오류:', error)
        ttsAudioRefsRef.current.delete(sceneIndex)
      })
    }
  }, [playbackSpeed])

  // 전체 재생 시간 계산 (모든 씬의 선택된 구간 합산)
  const totalDurationValue = useMemo(() => {
    return scenes.reduce((total, scene) => {
      if (scene.videoUrl && scene.selectionStartSeconds !== undefined && scene.selectionEndSeconds !== undefined) {
        return total + (scene.selectionEndSeconds - scene.selectionStartSeconds)
      }
      return total
    }, 0)
  }, [scenes])

  // 재생 중지 시 정리(비디오/TTS/자막/타임라인 0)는 useVideoSegmentPlayer cleanup에서 처리

  // 현재 선택된 씬의 비디오와 자막 표시 (재생 중이 아닐 때)
  // scenes 배열 전체가 아닌 현재 씬의 videoUrl과 script만 추적하여 불필요한 재실행 방지
  const currentScene = scenes[currentSceneIndex]
  const currentSceneVideoUrl = currentScene?.videoUrl
  const currentSceneScript = currentScene?.script
  
  // Timeline의 text 설정 변경 감지를 위한 키 생성
  // timeline 객체 전체를 JSON.stringify하여 깊은 변경도 감지
  const timelineTextKey = useMemo(() => {
    if (!timeline || !timeline.scenes || !timeline.scenes[currentSceneIndex]) {
      return ''
    }
    
    const textSettings = timeline.scenes[currentSceneIndex].text
    // text 설정만 추출하여 키 생성 (더 정확한 변경 감지)
    const key = JSON.stringify({
      font: textSettings?.font,
      fontSize: textSettings?.fontSize,
      color: textSettings?.color,
      fontWeight: textSettings?.fontWeight,
      position: textSettings?.position,
      style: textSettings?.style,
      transform: textSettings?.transform,
    })
    
    return key
  }, [timeline, currentSceneIndex])
  
  // Timeline 변경을 직접 감지하기 위한 effect
  useEffect(() => {
    console.log('[ProPreviewPanel] Timeline 변경 감지:', {
      hasTimeline: !!timeline,
      timelineScenesLength: timeline?.scenes?.length,
      currentSceneIndex,
      hasScene: !!timeline?.scenes?.[currentSceneIndex],
      textSettings: timeline?.scenes?.[currentSceneIndex]?.text,
      timelineTextKey,
    })
  }, [timeline, currentSceneIndex, timelineTextKey])
  
  useEffect(() => {
    if (!isPlaying && currentVideoUrl && currentSceneVideoUrl && currentSceneIndex >= 0) {
      // 비디오를 Sprite로 로드
      loadVideoAsSprite(currentSceneIndex, currentSceneVideoUrl).catch(console.error)
      // 자막 표시 (timeline 변경 시에도 다시 렌더링)
      if (currentSceneScript) {
        renderSubtitle(currentSceneIndex, currentSceneScript)
      }
    }
  }, [isPlaying, currentVideoUrl, currentSceneVideoUrl, currentSceneScript, currentSceneIndex, renderSubtitle, loadVideoAsSprite])

  // 현재 씬의 text 설정이 변경될 때마다 자막을 다시 렌더링 (가장 직접적인 변경 감지)
  useEffect(() => {
    if (!currentSceneScript || currentSceneIndex < 0 || !pixiReady) {
      return
    }
    
    // currentSceneTextSettings가 변경되면 자막을 다시 렌더링
    if (currentSceneTextSettings) {
      console.log('[ProPreviewPanel] 현재 씬의 자막 설정 변경 감지, 자막 다시 렌더링:', {
        currentSceneIndex,
        textSettings: currentSceneTextSettings,
        isPlaying,
        script: currentSceneScript.substring(0, 50),
      })
      renderSubtitle(currentSceneIndex, currentSceneScript)
    }
  }, [currentSceneTextSettings, currentSceneScript, currentSceneIndex, renderSubtitle, pixiReady, isPlaying])
  
  // Timeline의 자막 설정이 변경될 때마다 현재 씬의 자막을 다시 렌더링 (fallback)
  // timelineTextKey가 변경되면 자막을 다시 렌더링하여 실시간 업데이트
  useEffect(() => {
    if (!currentSceneScript || currentSceneIndex < 0 || !pixiReady) {
      return
    }
    
    // timelineTextKey가 변경되었을 때만 실행 (빈 문자열이 아닐 때)
    if (timelineTextKey) {
      console.log('[ProPreviewPanel] Timeline 자막 설정 변경 감지 (timelineTextKey), 자막 다시 렌더링:', {
        currentSceneIndex,
        timelineTextKey,
        isPlaying,
        script: currentSceneScript.substring(0, 50),
      })
      renderSubtitle(currentSceneIndex, currentSceneScript)
    }
  }, [timelineTextKey, currentSceneScript, currentSceneIndex, renderSubtitle, pixiReady, isPlaying])

  // 비디오 세그먼트 재생 로직 커스텀 훅
  const { trackUserGesture } = useVideoSegmentPlayer({
    isPlaying,
    pixiReady,
    scenes,
    totalDurationValue,
    playbackSpeed,
    loadVideoAsSprite,
    renderSubtitle,
    playTts,
    onPlayPause,
    setCurrentSceneIndex,
    setCurrentTime,
    setTotalDuration,
    videoElementsRef,
    spritesRef,
    ttsAudioRefsRef,
    textsRef,
  })

  // 재생 버튼 클릭 핸들러 (재생 상태만 토글, 실제 재생은 커스텀 훅에서 처리)
  const handlePlayPause = useCallback(() => {
    // 사용자 제스처 추적 (재생 시작 시에만)
    trackUserGesture()
    onPlayPause()
  }, [trackUserGesture, onPlayPause])

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* 비디오 미리보기 - 9:16 비율 고정 (PixiJS만 사용) */}
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0 shrink-0 mb-4">
        <div
          ref={playbackContainerRef}
          className="relative bg-black rounded-2xl overflow-hidden mx-auto"
          style={{
            width: '100%',
            aspectRatio: '9 / 16',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {/* PixiJS 캔버스 (비디오 + 자막) */}
          <div
            ref={pixiContainerRef}
            className="absolute inset-0 z-10"
          />
          {!currentVideoUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 z-20 pointer-events-none">
              비디오 없음
            </div>
          )}
        </div>
      </div>

      {/* 재생 컨트롤 */}
      <div className="w-full shrink-0 space-y-3">
        {/* 타임라인 바 */}
        <TimelineBar
          timelineBarRef={timelineBarRef}
          currentTime={currentTime}
          totalDuration={totalDuration}
          progressRatio={totalDuration > 0 ? currentTime / totalDuration : 0}
          playbackSpeed={playbackSpeed}
          isPlaying={isPlaying}
          onTimelineMouseDown={() => {
            // 타임라인 클릭은 나중에 구현
          }}
          timeline={null}
          bgmTemplate={bgmTemplate}
          showGrid={false}
          onPlayPause={handlePlayPause}
          isTtsBootstrapping={false}
          isBgmBootstrapping={false}
          isPreparing={false}
        />

        {/* 속도 선택 버튼 */}
        <SpeedSelector
          playbackSpeed={playbackSpeed}
          totalDuration={totalDuration}
          onPlaybackSpeedChange={setPlaybackSpeed}
          onResizeTemplate={() => {
            // 템플릿 크기 조정은 Pro에서 사용하지 않음
          }}
          onImageFitChange={() => {
            // 이미지 fit 변경은 Pro에서 사용하지 않음
          }}
          currentSceneIndex={0}
          timeline={null}
        />

        {/* 내보내기 버튼 */}
        {onExport && (
          <div className="mb-2">
            <ExportButton
              isExporting={isExporting}
              onExport={onExport}
            />
          </div>
        )}
      </div>
    </div>
  )
})
