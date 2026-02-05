'use client'

import React, { memo, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import * as PIXI from 'pixi.js'
import { TimelineBar } from '../../../fast/step3/components/TimelineBar'
import { SpeedSelector } from '../../../fast/step3/components/SpeedSelector'
import { ExportButton } from '../../../fast/step3/components/ExportButton'
import type { ProStep3Scene } from './ProSceneListPanel'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { authStorage } from '@/lib/api/auth-storage'

interface ProPreviewPanelProps {
  /** 현재 선택된 씬의 비디오 URL */
  currentVideoUrl?: string | null
  /** 현재 선택된 씬의 격자 시작 시간 (초) */
  currentSelectionStartSeconds?: number
  /** 현재 선택된 씬 인덱스 */
  currentSceneIndex?: number
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
 * - 비디오 썸네일만 표시 (재생하지 않음)
 * - 재생 버튼 클릭 시 선택된 구간들을 이어붙여서 재생
 */
export const ProPreviewPanel = memo(function ProPreviewPanel({
  currentVideoUrl,
  currentSelectionStartSeconds = 0,
  currentSceneIndex: propCurrentSceneIndex = 0,
  scenes,
  isPlaying,
  onPlayPause,
  bgmTemplate,
  onExport,
  isExporting = false,
}: ProPreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const playbackContainerRef = useRef<HTMLDivElement | null>(null)
  const pixiContainerRef = useRef<HTMLDivElement | null>(null)
  const timelineBarRef = useRef<HTMLDivElement | null>(null)
  const currentSegmentIndexRef = useRef(0)
  const segmentStartTimeRef = useRef(0)
  const userGestureRef = useRef<{ timestamp: number } | null>(null)
  const isInitialMountRef = useRef(true)
  
  // PixiJS 관련 refs
  const appRef = useRef<PIXI.Application | null>(null)
  const containerRef = useRef<PIXI.Container | null>(null)
  const subtitleContainerRef = useRef<PIXI.Container | null>(null)
  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const videoTexturesRef = useRef<Map<number, PIXI.Texture>>(new Map())
  const videoElementsRef = useRef<Map<number, HTMLVideoElement>>(new Map())
  
  // TTS 관련 refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const ttsAudioRefsRef = useRef<Map<number, HTMLAudioElement>>(new Map())
  const ttsCacheRef = useRef<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>(new Map())
  
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)
  const [currentSceneIndex, setCurrentSceneIndex] = useState(propCurrentSceneIndex)
  const [pixiReady, setPixiReady] = useState(false)

  // propCurrentSceneIndex 변경 시 내부 상태 동기화
  useEffect(() => {
    if (!isPlaying) {
      // 비동기로 처리하여 cascading renders 방지
      const timeoutId = setTimeout(() => {
        setCurrentSceneIndex(propCurrentSceneIndex)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [propCurrentSceneIndex, isPlaying])

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

      // 자막 컨테이너 생성
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
    if (!appRef.current || !containerRef.current || !pixiReady) return

    // 기존 스프라이트 정리
    const existingSprite = spritesRef.current.get(sceneIndex)
    if (existingSprite && !existingSprite.destroyed) {
      containerRef.current.removeChild(existingSprite)
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

      containerRef.current.addChild(sprite)
      spritesRef.current.set(sceneIndex, sprite)
    } catch (error) {
      console.error('비디오 Texture 생성 오류:', error)
    }
  }, [pixiReady])

  // 자막 렌더링 함수
  const renderSubtitle = useCallback((sceneIndex: number, script: string) => {
    if (!appRef.current || !subtitleContainerRef.current || !pixiReady) return

    const scene = scenes[sceneIndex]
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

    // 실제 렌더링 크기 가져오기 (stage 크기 사용)
    const stageWidth = appRef.current.screen.width
    const stageHeight = appRef.current.screen.height

    // 텍스트 객체 가져오기 또는 생성
    let textObj = textsRef.current.get(sceneIndex)
    if (!textObj || textObj.destroyed) {
      textObj = new PIXI.Text({
        text: script,
        style: new PIXI.TextStyle({
          fontFamily: resolveSubtitleFontFamily('pretendard'),
          fontSize: 80,
          fill: '#ffffff',
          align: 'center',
          fontWeight: '400',
          wordWrap: true,
          wordWrapWidth: stageWidth * 0.75, // 스테이지 너비의 75%
          breakWords: true,
          stroke: { color: '#000000', width: 10 },
        }),
      })
      textObj.anchor.set(0.5, 0.5)
      // 스테이지 중앙 하단에 배치
      textObj.x = stageWidth / 2
      textObj.y = stageHeight * 0.885 // 하단 중앙 (88.5% 위치)
      subtitleContainerRef.current.addChild(textObj)
      textsRef.current.set(sceneIndex, textObj)
    } else {
      textObj.text = script
      // 위치도 다시 설정 (스테이지 크기가 변경되었을 수 있음)
      textObj.x = stageWidth / 2
      textObj.y = stageHeight * 0.885
      // wordWrapWidth도 업데이트
      if (textObj.style) {
        textObj.style.wordWrapWidth = stageWidth * 0.75
      }
    }

    // 텍스트 표시
    textObj.visible = true
    textObj.alpha = 1
  }, [scenes, pixiReady])

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

  // 재생 중지 시 정리
  useEffect(() => {
    if (!isPlaying) {
      // 모든 비디오 일시정지
      videoElementsRef.current.forEach((videoElement) => {
        videoElement.pause()
      })
      
      // TTS 오디오 정리
      ttsAudioRefsRef.current.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      ttsAudioRefsRef.current.clear()
      
      // 자막 숨김
      textsRef.current.forEach((textObj) => {
        if (textObj && !textObj.destroyed) {
          textObj.visible = false
          textObj.alpha = 0
        }
      })
      
      // 비디오 스프라이트는 유지 (썸네일 표시용)
      
      // 비동기로 처리하여 cascading renders 방지
      const timeoutId = setTimeout(() => {
        setCurrentTime(0)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [isPlaying])

  // 현재 선택된 씬의 비디오와 자막 표시 (재생 중이 아닐 때)
  useEffect(() => {
    if (!isPlaying && currentVideoUrl && scenes.length > 0) {
      const currentScene = scenes.find((s, idx) => idx === currentSceneIndex) || scenes[0]
      if (currentScene) {
        // 비디오를 Sprite로 로드
        if (currentScene.videoUrl) {
          loadVideoAsSprite(currentSceneIndex, currentScene.videoUrl).catch(console.error)
        }
        // 자막 표시
        if (currentScene.script) {
          renderSubtitle(currentSceneIndex, currentScene.script)
        }
      }
    }
  }, [isPlaying, currentVideoUrl, scenes, currentSceneIndex, renderSubtitle, loadVideoAsSprite])

  // 재생 버튼 클릭 핸들러 (재생 상태만 토글, 실제 재생은 effect에서 처리)
  const handlePlayPause = useCallback(() => {
    // 사용자 제스처 추적 (재생 시작 시에만)
    if (!isPlaying) {
      userGestureRef.current = { timestamp: Date.now() }
    }
    onPlayPause()
  }, [isPlaying, onPlayPause])

  // 재생 로직: 선택된 구간들을 순차적으로 재생
  useEffect(() => {
    if (!isPlaying || !pixiReady) {
      return
    }

    // 초기 마운트 시에는 자동재생하지 않음 (사용자가 재생 버튼을 클릭했을 때만 재생)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      // 사용자 제스처가 없으면 재생하지 않음
      const gesture = userGestureRef.current
      const hasValidGesture = gesture && (Date.now() - gesture.timestamp) < 1000
      if (!hasValidGesture) {
        console.warn('초기 마운트 시 자동재생 방지: 사용자 제스처가 없습니다.')
        return
      }
    }

    const validScenes = scenes.filter(s => s.videoUrl && s.selectionStartSeconds !== undefined && s.selectionEndSeconds !== undefined)
    if (validScenes.length === 0) {
      return
    }

    currentSegmentIndexRef.current = 0
    segmentStartTimeRef.current = 0
    // 비동기로 처리하여 cascading renders 방지
    const timeoutId = setTimeout(() => {
      setTotalDuration(totalDurationValue)
    }, 0)

    // ref 값들을 effect 시작 부분에서 복사하여 cleanup에서 사용
    const videoElementsSnapshot = new Map(videoElementsRef.current)
    const ttsAudiosSnapshot = new Map(ttsAudioRefsRef.current)
    const textsSnapshot = new Map(textsRef.current)
    const spritesSnapshot = new Map(spritesRef.current)

    const playNextSegment = async () => {
      if (currentSegmentIndexRef.current >= validScenes.length) {
        // 모든 구간 재생 완료
        setCurrentTime(totalDurationValue)
        onPlayPause() // 재생 중지
        return
      }

      const scene = validScenes[currentSegmentIndexRef.current]
      if (!scene.videoUrl) {
        currentSegmentIndexRef.current++
        playNextSegment()
        return
      }

      // 이전 구간들의 시간 합 계산
      segmentStartTimeRef.current = scenes.slice(0, currentSegmentIndexRef.current).reduce((sum, s) => {
        if (s.videoUrl && s.selectionStartSeconds !== undefined && s.selectionEndSeconds !== undefined) {
          return sum + (s.selectionEndSeconds - s.selectionStartSeconds)
        }
        return sum
      }, 0)

      // 현재 씬 인덱스 찾기
      const originalSceneIndex = scenes.findIndex(s => s.id === scene.id)
      if (originalSceneIndex < 0) {
        currentSegmentIndexRef.current++
        playNextSegment()
        return
      }

      // 이전 씬의 스프라이트 숨김
      spritesRef.current.forEach((sprite, idx) => {
        if (idx !== originalSceneIndex && sprite && !sprite.destroyed) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })

      // 비디오를 PixiJS Sprite로 로드
      try {
        // 이미 비디오가 로드되어 있고 재생 중인지 확인 (첫 번째 비디오인 경우)
        const existingVideoElement = videoElementsRef.current.get(originalSceneIndex)
        const isAlreadyPlaying = currentSegmentIndexRef.current === 0 && existingVideoElement && !existingVideoElement.paused
        
        if (!isAlreadyPlaying) {
          // 비디오가 아직 로드되지 않았거나 재생 중이 아니면 로드
          await loadVideoAsSprite(originalSceneIndex, scene.videoUrl)
        }
        
        const videoElement = videoElementsRef.current.get(originalSceneIndex)
        const sprite = spritesRef.current.get(originalSceneIndex)
        
        if (!videoElement || !sprite) {
          console.error('비디오 로드 실패')
          currentSegmentIndexRef.current++
          playNextSegment()
          return
        }

        // 현재 씬 인덱스 업데이트
        setCurrentSceneIndex(originalSceneIndex)
        
        // 스프라이트 표시
        sprite.visible = true
        sprite.alpha = 1
        
        // 자막 렌더링
        renderSubtitle(originalSceneIndex, scene.script || '')
        
        // TTS 재생
        if (scene.voiceTemplate && scene.script) {
          playTts(originalSceneIndex, scene.voiceTemplate, scene.script).catch(console.error)
        }

        // 비디오 재생 설정 (이미 재생 중이 아닌 경우에만)
        if (!isAlreadyPlaying) {
          videoElement.currentTime = scene.selectionStartSeconds || 0
          videoElement.playbackRate = playbackSpeed
        }

        const handleTimeUpdate = () => {
          if (!isPlaying) {
            videoElement.removeEventListener('timeupdate', handleTimeUpdate)
            videoElement.removeEventListener('ended', handleEnded)
            return
          }
          // 현재 시간 = 이전 구간들의 시간 합 + 현재 구간의 진행 시간
          const segmentProgress = videoElement.currentTime - (scene.selectionStartSeconds || 0)
          const currentTotalTime = segmentStartTimeRef.current + segmentProgress
          setCurrentTime(Math.max(0, Math.min(currentTotalTime, totalDurationValue)))

          if (videoElement.currentTime >= (scene.selectionEndSeconds || 0)) {
            // 현재 구간 종료, 다음 구간으로
            videoElement.removeEventListener('timeupdate', handleTimeUpdate)
            videoElement.removeEventListener('ended', handleEnded)
            videoElement.pause()
            currentSegmentIndexRef.current++
            playNextSegment()
          }
        }

        const handleEnded = () => {
          if (!isPlaying) {
            videoElement.removeEventListener('timeupdate', handleTimeUpdate)
            videoElement.removeEventListener('ended', handleEnded)
            return
          }
          videoElement.removeEventListener('timeupdate', handleTimeUpdate)
          videoElement.removeEventListener('ended', handleEnded)
          currentSegmentIndexRef.current++
          playNextSegment()
        }

        videoElement.addEventListener('timeupdate', handleTimeUpdate)
        videoElement.addEventListener('ended', handleEnded)
        
        // 재생 시작 (이미 재생 중이 아닌 경우에만)
        if (!isAlreadyPlaying) {
          // 사용자 제스처 확인 (1초 이내 클릭만 유효)
          const gesture = userGestureRef.current
          const hasValidGesture = gesture && (Date.now() - gesture.timestamp) < 1000
          
          if (!hasValidGesture && currentSegmentIndexRef.current === 0) {
            // 첫 번째 비디오인데 사용자 제스처가 없으면 재생하지 않음
            console.warn('사용자 제스처가 없어 비디오 재생을 건너뜁니다.')
            onPlayPause()
            return
          }
          
          try {
            const playPromise = videoElement.play()
            if (playPromise !== undefined) {
              await playPromise
            }
            // 재생 성공 시 사용자 제스처 초기화 (다음 재생을 위해)
            if (currentSegmentIndexRef.current === 0) {
              userGestureRef.current = null
            }
          } catch (error) {
            // NotAllowedError: 사용자 상호작용이 필요한 경우
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
              console.warn('비디오 재생이 차단되었습니다. 사용자 상호작용이 필요합니다.')
              // 재생 중지하고 사용자에게 알림
              onPlayPause()
              alert('비디오 재생을 시작하려면 재생 버튼을 다시 클릭해주세요.')
              return
            }
            console.error('비디오 재생 오류:', error)
            currentSegmentIndexRef.current++
            playNextSegment()
          }
        }
      } catch (error) {
        console.error('비디오 로드 오류:', error)
        currentSegmentIndexRef.current++
        playNextSegment()
      }
    }

    playNextSegment()

    return () => {
      clearTimeout(timeoutId)
      // 복사된 ref 값들로 cleanup 수행
      const videoElements = videoElementsSnapshot
      const ttsAudios = ttsAudiosSnapshot
      const texts = textsSnapshot
      const sprites = spritesSnapshot
      
      // 모든 비디오 일시정지 및 이벤트 제거
      videoElements.forEach((videoElement) => {
        videoElement.pause()
        // 모든 이벤트 리스너 제거 (빈 함수로는 제거되지 않으므로 실제 핸들러 필요)
      })
      // TTS 오디오 정리
      ttsAudios.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      // snapshot으로 이미 정리했으므로 ref는 나중에 자동으로 clear됨
      // 자막 숨김
      texts.forEach((textObj) => {
        if (textObj && !textObj.destroyed) {
          textObj.visible = false
          textObj.alpha = 0
        }
      })
      // 비디오 스프라이트 숨김
      sprites.forEach((sprite) => {
        if (sprite && !sprite.destroyed) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
    }
  }, [isPlaying, scenes, onPlayPause, totalDurationValue, playbackSpeed, renderSubtitle, playTts, loadVideoAsSprite, pixiReady])

  // 현재 선택된 씬의 비디오 썸네일 생성 (격자 시작 지점)
  useEffect(() => {
    if (!currentVideoUrl || !videoRef.current || !canvasRef.current) {
      // 비동기로 처리하여 cascading renders 방지
      const timeoutId = setTimeout(() => {
        setThumbnailUrl(null)
      }, 0)
      return () => clearTimeout(timeoutId)
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    // 비동기로 처리하여 cascading renders 방지
    const timeoutId = setTimeout(() => {
      setIsGeneratingThumbnail(true)
    }, 0)

    const captureThumbnail = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) {
          return
        }

        canvas.width = 1080
        canvas.height = 1920

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return
        }

        // 비디오 비율 유지하며 캔버스에 그리기
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = canvas.width / canvas.height

        let drawWidth = canvas.width
        let drawHeight = canvas.height
        let drawX = 0
        let drawY = 0

        if (videoAspect > canvasAspect) {
          drawHeight = canvas.height
          drawWidth = drawHeight * videoAspect
          drawX = (canvas.width - drawWidth) / 2
        } else {
          drawWidth = canvas.width
          drawHeight = drawWidth / videoAspect
          drawY = (canvas.height - drawHeight) / 2
        }

        // 배경을 검은색으로 채우기
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 비디오 프레임 그리기
        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)

        const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
        setThumbnailUrl(thumbnail)
        setIsGeneratingThumbnail(false)
      } catch (error) {
        console.error('썸네일 생성 오류:', error)
        setIsGeneratingThumbnail(false)
        setThumbnailUrl(null)
      }
    }

    const handleLoadedData = () => {
      if (video.readyState >= 2) {
        const thumbnailTime = currentSelectionStartSeconds > 0 ? currentSelectionStartSeconds : 0.1
        video.currentTime = thumbnailTime
      }
    }

    const handleSeeked = () => {
      captureThumbnail()
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('seeked', handleSeeked)

    if (video.readyState >= 2) {
      const thumbnailTime = currentSelectionStartSeconds > 0 ? currentSelectionStartSeconds : 0.1
      video.currentTime = thumbnailTime
    }

    return () => {
      clearTimeout(timeoutId)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('seeked', handleSeeked)
    }
  }, [currentVideoUrl, currentSelectionStartSeconds])

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* 비디오 썸네일 미리보기 - 9:16 비율 고정 */}
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
          {/* PixiJS 캔버스 컨테이너 (비디오 + 자막 렌더링용) */}
          <div
            ref={pixiContainerRef}
            className="absolute inset-0 z-10"
          />
          
          {/* 썸네일 레이어 (재생 중이 아니고 PixiJS가 준비되지 않았을 때만 표시) */}
          {!isPlaying && !pixiReady && thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt="비디오 썸네일"
              fill
              className="object-contain z-0"
              unoptimized
            />
          ) : !isPlaying && !pixiReady && isGeneratingThumbnail ? (
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : !isPlaying && !pixiReady ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 z-0">
              비디오 없음
            </div>
          ) : null}

          {/* 숨겨진 비디오와 캔버스 - 썸네일 생성용 */}
          {currentVideoUrl && (
            <>
              <video
                ref={videoRef}
                src={currentVideoUrl}
                className="hidden"
                muted
                playsInline
                preload="metadata"
                crossOrigin="anonymous"
              />
              <canvas ref={canvasRef} className="hidden" />
            </>
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
