'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Pause, Clock, Edit2, GripVertical, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { BgmSelector } from '@/components/video-editor/BgmSelector'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import * as fabric from 'fabric'

export default function Step4Page() {
  const router = useRouter()
  const { 
    scenes,
    selectedImages,
    timeline,
    setTimeline,
    setScenes,
    subtitlePosition,
    subtitleFont,
    subtitleColor,
    bgmTemplate,
    transitionTemplate,
    voiceTemplate,
    setSubtitlePosition,
    setSubtitleFont,
    setSubtitleColor,
    setBgmTemplate,
    setTransitionTemplate,
    setVoiceTemplate,
  } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  
  // PixiJS refs
  const pixiContainerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const containerRef = useRef<PIXI.Container | null>(null)
  const texturesRef = useRef<Map<string, PIXI.Texture>>(new Map())
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  const handlesRef = useRef<PIXI.Graphics | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartPosRef = useRef<{ x: number; y: number; boundsWidth?: number; boundsHeight?: number }>({ x: 0, y: 0 })
  const particlesRef = useRef<Map<number, PIXI.Container>>(new Map()) // 씬별 파티클 컨테이너
  const particleAnimationsRef = useRef<Map<number, gsap.core.Timeline>>(new Map()) // 파티클 애니메이션
  const editHandlesRef = useRef<Map<number, PIXI.Container>>(new Map()) // 편집 핸들 컨테이너 (씬별)
  const isResizingRef = useRef(false)
  const resizeHandleRef = useRef<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null)
  const resizeStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const isFirstResizeMoveRef = useRef(true)
  const originalTransformRef = useRef<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number; baseWidth?: number; baseHeight?: number } | null>(null)
  const originalSpriteTransformRef = useRef<Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>>(new Map()) // 편집 시작 시 원래 Transform 저장
  const originalTextTransformRef = useRef<Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>>(new Map()) // 텍스트 편집 시작 시 원래 Transform 저장
  const isSavingTransformRef = useRef(false) // Transform 저장 중 플래그 (loadAllScenes 재호출 방지)
  const savedSceneIndexRef = useRef<number | null>(null) // 편집 종료 시 씬 인덱스 저장
  const textEditHandlesRef = useRef<Map<number, PIXI.Container>>(new Map()) // 텍스트 편집 핸들 컨테이너 (씬별)
  const isResizingTextRef = useRef(false) // 텍스트 리사이즈 중 플래그
  const gridGraphicsRef = useRef<PIXI.Graphics | null>(null) // 격자 Graphics 객체
  // Fabric.js refs
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const useFabricEditing = true
  
  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPreviewingTransition, setIsPreviewingTransition] = useState(false) // 전환 효과 미리보기 중
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const aspectRatio = '9/16' // 9:16 고정
  const [rightPanelTab, setRightPanelTab] = useState('animation')
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0) // 전체 영상 배속
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null)
  const [selectedElementType, setSelectedElementType] = useState<'image' | 'text' | null>(null)
  const [showGrid, setShowGrid] = useState(false) // 격자 표시 여부
  const timelineBarRef = useRef<HTMLDivElement>(null)
  const [pixiReady, setPixiReady] = useState(false)
  const [fabricReady, setFabricReady] = useState(false)
  const fabricScaleRatioRef = useRef<number>(1) // Fabric.js 좌표 스케일 비율
  const rafIdRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const isManualSceneSelectRef = useRef(false)
  const previousSceneIndexRef = useRef<number | null>(null)

  // 클라이언트에서만 렌더링 (SSR/Hydration mismatch 방지)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 스테이지 크기 계산 (9:16 고정)
  const stageDimensions = useMemo(() => {
    const baseSize = 1080
    const ratio = 9 / 16
    return { width: baseSize, height: baseSize / ratio }
  }, [])

  // 대본 길이 기반 자동 duration 계산 (대략 초당 8글자, 1~5초 범위)
  const getSceneDuration = (script: string) => {
    if (!script) return 2.5
    const length = script.replace(/\s+/g, '').length
    const raw = length / 8
    return Math.max(1, Math.min(5, raw))
  }

  // 타임라인 초기화
  useEffect(() => {
    if (scenes.length === 0) return

    console.log('Step4 scenes from store:', scenes)
    console.log('Step4 selectedImages from store:', selectedImages)

    const nextTimeline: TimelineData = {
      fps: 30,
      resolution: '1080x1920',
      playbackSpeed: timeline?.playbackSpeed ?? playbackSpeed ?? 1.0,
      scenes: scenes.map((scene, index) => {
        const existingScene = timeline?.scenes[index]
        return {
          sceneId: scene.sceneId,
          duration: existingScene?.duration || getSceneDuration(scene.script),
          transition: existingScene?.transition || 'fade',
          transitionDuration: existingScene?.transitionDuration || 0.5,
          image: scene.imageUrl || selectedImages[index] || '',
          imageFit: existingScene?.imageFit || 'fill', // 기본값을 fill로 변경하여 9:16 캔버스를 항상 채움
          text: {
            content: scene.script,
            font: subtitleFont || 'Pretendard-Bold',
            color: subtitleColor || '#ffffff',
            position: subtitlePosition || 'center',
            fontSize: existingScene?.text?.fontSize || 32,
          },
        }
      }),
    }

    console.log('Step4 nextTimeline:', nextTimeline)

    const hasChanged = 
      !timeline ||
      timeline.scenes.length !== nextTimeline.scenes.length ||
      timeline.playbackSpeed !== nextTimeline.playbackSpeed ||
      nextTimeline.scenes.some((scene, index) => {
        const existing = timeline.scenes[index]
        return (
          !existing ||
          scene.sceneId !== existing.sceneId ||
          scene.image !== existing.image ||
          scene.text.content !== existing.text.content
        )
      })

    if (hasChanged) {
      setTimeline(nextTimeline)
    }
  }, [scenes, selectedImages, subtitleFont, subtitleColor, subtitlePosition, setTimeline, timeline, playbackSpeed])

  // timeline의 playbackSpeed와 state 동기화
  useEffect(() => {
    if (timeline?.playbackSpeed !== undefined && timeline.playbackSpeed !== playbackSpeed) {
      setPlaybackSpeed(timeline.playbackSpeed)
    }
  }, [timeline?.playbackSpeed])

  // PixiJS 초기화
  useEffect(() => {
    if (!mounted) return
    if (!pixiContainerRef.current) {
      console.log('Step4: pixiContainerRef.current is null')
      return
    }

    const container = pixiContainerRef.current
    const { width, height } = stageDimensions

    console.log('Step4: Initializing PixiJS with dimensions:', width, height)

    if (appRef.current) {
      const existingCanvas = container.querySelector('canvas')
      if (existingCanvas) container.removeChild(existingCanvas)
      appRef.current.destroy(true, { children: true, texture: true })
      appRef.current = null
      containerRef.current = null
    }

    const app = new PIXI.Application()
    
    app.init({
      width,
      height,
      backgroundColor: 0x000000,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      autoStart: true,  // 자동 렌더링 활성화
    }).then(() => {
      console.log('Step4: PixiJS initialized successfully')
      // 9:16 비율을 유지하면서 컨테이너에 맞게 표시
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'
      app.canvas.style.maxWidth = '100%'
      app.canvas.style.maxHeight = '100%'
      app.canvas.style.display = 'block'
      app.canvas.style.objectFit = 'contain'
      container.appendChild(app.canvas)
      appRef.current = app

      const mainContainer = new PIXI.Container()
      app.stage.addChild(mainContainer)
      containerRef.current = mainContainer

      console.log('Step4: appRef and containerRef set, app:', !!appRef.current, 'container:', !!containerRef.current)

      // 다음 프레임에 pixiReady 설정하여 ref가 확실히 업데이트된 후 loadAllScenes가 실행되도록
      requestAnimationFrame(() => {
        setPixiReady(true)
        console.log('Step4: pixiReady set to true')
      })
    }).catch((error) => {
      console.error('Step4: Failed to initialize PixiJS:', error)
    })

    return () => {
      if (appRef.current) {
        // PixiJS destroy가 canvas를 자동으로 정리함
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
        containerRef.current = null
      }
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
        fabricCanvasRef.current = null
      }
      if (fabricCanvasElementRef.current && pixiContainerRef.current?.contains(fabricCanvasElementRef.current)) {
        pixiContainerRef.current.removeChild(fabricCanvasElementRef.current)
      }
      setFabricReady(false)
      setPixiReady(false)
    }
  }, [mounted, stageDimensions])

  // Fabric.js 초기화 (편집 오버레이)
  useEffect(() => {
    console.log('Fabric init effect check', {
      pixiContainerRef: !!pixiContainerRef.current,
      pixiReady,
      useFabricEditing,
      stageDimensions,
    })
    if (!pixiContainerRef.current || !pixiReady || !useFabricEditing) {
      console.log('Fabric init skipped - conditions not met')
      return
    }
    const container = pixiContainerRef.current
    container.style.position = 'relative'
    container.style.pointerEvents = 'auto' // 오버레이가 항상 포인터를 받을 수 있게

    // 기존 Fabric 제거
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose()
      fabricCanvasRef.current = null
    }
    if (fabricCanvasElementRef.current && container.contains(fabricCanvasElementRef.current)) {
      container.removeChild(fabricCanvasElementRef.current)
    }

    const canvasEl = document.createElement('canvas')
    canvasEl.width = stageDimensions.width
    canvasEl.height = stageDimensions.height
    canvasEl.style.position = 'absolute'
    canvasEl.style.inset = '0'
    canvasEl.style.width = '100%'
    canvasEl.style.height = '100%'
    canvasEl.style.pointerEvents = useFabricEditing ? 'auto' : 'none'
    canvasEl.style.zIndex = '5' // Pixi 위에 확실히 노출
    fabricCanvasElementRef.current = canvasEl
    container.appendChild(canvasEl)

    const fabricCanvas = new fabric.Canvas(canvasEl, {
      selection: true,
      preserveObjectStacking: true,
    })
    fabricCanvas.defaultCursor = 'default'
    fabricCanvas.hoverCursor = 'move'
    fabricCanvas.moveCursor = 'move'
    fabricCanvas.skipTargetFind = false
    
    // Fabric.js 핸들러 스타일 커스터마이징 (이쁜 UI)
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#8b5cf6', // 보라색 핸들
      cornerStrokeColor: '#ffffff', // 흰색 테두리
      cornerSize: 12, // 핸들 크기
      cornerStyle: 'circle', // 원형 핸들
      borderColor: '#8b5cf6', // 보라색 선택 테두리
      borderScaleFactor: 2, // 테두리 두께
      padding: 8, // 핸들과 객체 간 여백
    })
    // 회전 핸들 스타일 (Fabric.js 6.x 호환)
    if (fabric.Object.prototype.controls && fabric.Object.prototype.controls.mtr) {
      fabric.Object.prototype.controls.mtr.offsetY = -30
    }
    console.log('Fabric init', {
      width: canvasEl.width,
      height: canvasEl.height,
      editMode,
    })
    // upper 캔버스도 동일한 포인터/레이어 설정
    if (fabricCanvas.upperCanvasEl) {
      fabricCanvas.upperCanvasEl.style.position = 'absolute'
      fabricCanvas.upperCanvasEl.style.inset = '0'
      fabricCanvas.upperCanvasEl.style.width = '100%'
      fabricCanvas.upperCanvasEl.style.height = '100%'
      fabricCanvas.upperCanvasEl.style.pointerEvents = useFabricEditing ? 'auto' : 'none'
      fabricCanvas.upperCanvasEl.style.zIndex = '6'
    }
    // lower 캔버스도 명시적 z-index 지정
    if (fabricCanvas.lowerCanvasEl) {
      fabricCanvas.lowerCanvasEl.style.position = 'absolute'
      fabricCanvas.lowerCanvasEl.style.inset = '0'
      fabricCanvas.lowerCanvasEl.style.width = '100%'
      fabricCanvas.lowerCanvasEl.style.height = '100%'
      fabricCanvas.lowerCanvasEl.style.zIndex = '5'
    }
    // canvas-container (wrapper)를 Pixi 위에 겹치도록 설정
    if (fabricCanvas.wrapperEl) {
      fabricCanvas.wrapperEl.style.position = 'absolute'
      fabricCanvas.wrapperEl.style.inset = '0'
      fabricCanvas.wrapperEl.style.width = '100%'
      fabricCanvas.wrapperEl.style.height = '100%'
      fabricCanvas.wrapperEl.style.zIndex = '5'
    }
    
    fabricCanvasRef.current = fabricCanvas
    
    // CSS 스케일링에 따른 좌표 보정
    // 캔버스를 9:16 비율을 유지하면서 컨테이너에 맞게 설정
    setTimeout(() => {
      const containerEl = container
      if (containerEl && fabricCanvasRef.current) {
        const containerWidth = containerEl.clientWidth
        const containerHeight = containerEl.clientHeight
        const targetRatio = 9 / 16 // 0.5625
        
        // 컨테이너 내에서 9:16 비율을 유지하는 최대 크기 계산
        let displayWidth: number, displayHeight: number
        if (containerWidth / containerHeight > targetRatio) {
          // 컨테이너가 더 넓음 → 높이에 맞춤
          displayHeight = containerHeight
          displayWidth = containerHeight * targetRatio
        } else {
          // 컨테이너가 더 좁음 → 너비에 맞춤
          displayWidth = containerWidth
          displayHeight = containerWidth / targetRatio
        }
        
        const scaleRatio = displayWidth / stageDimensions.width
        fabricScaleRatioRef.current = scaleRatio
        console.log('Fabric scale setup', {
          containerWidth,
          containerHeight,
          displayWidth,
          displayHeight,
          internalWidth: stageDimensions.width,
          internalHeight: stageDimensions.height,
          scaleRatio,
          ratio: displayWidth / displayHeight,
        })
        
        // 캔버스 크기를 9:16 비율로 설정
        fabricCanvasRef.current.setDimensions({ width: displayWidth, height: displayHeight })
        
        // wrapper를 중앙 정렬
        if (fabricCanvasRef.current.wrapperEl) {
          const wrapper = fabricCanvasRef.current.wrapperEl
          wrapper.style.position = 'absolute'
          wrapper.style.left = '50%'
          wrapper.style.top = '50%'
          wrapper.style.transform = 'translate(-50%, -50%)'
          wrapper.style.width = `${displayWidth}px`
          wrapper.style.height = `${displayHeight}px`
        }
        
        fabricCanvasRef.current.calcOffset()
        fabricCanvasRef.current.requestRenderAll()
        
        // 스케일 설정 후에 fabricReady 활성화
        setFabricReady(true)
      }
    }, 100)

    return () => {
      fabricCanvas.dispose()
      if (container.contains(canvasEl)) {
        container.removeChild(canvasEl)
      }
      fabricCanvasRef.current = null
      fabricCanvasElementRef.current = null
      setFabricReady(false)
    }
  }, [pixiReady, useFabricEditing, editMode, stageDimensions])

  // Fabric 포인터 활성화 상태 갱신 (upper/lower 모두)
  useEffect(() => {
    const lower = fabricCanvasElementRef.current
    const upper = fabricCanvasRef.current?.upperCanvasEl
    const pointer = useFabricEditing ? 'auto' : 'none'
    if (lower) lower.style.pointerEvents = pointer
    if (upper) upper.style.pointerEvents = pointer
  }, [editMode, useFabricEditing])

  // Pixi 캔버스 포인터 이벤트 제어 및 Fabric 편집 시 숨김
  // 재생 중 또는 전환 효과 미리보기 중일 때는 PixiJS를 보여서 전환 효과가 보이도록 함
  useEffect(() => {
    if (!pixiContainerRef.current) return
    const pixiCanvas = pixiContainerRef.current.querySelector('canvas:not([data-fabric])') as HTMLCanvasElement
    if (!pixiCanvas) return
    
    // 재생 중 또는 전환 효과 미리보기 중이면 PixiJS 보이기
    if (isPlaying || isPreviewingTransition) {
      pixiCanvas.style.opacity = '1'
      pixiCanvas.style.pointerEvents = 'none' // 클릭 비활성화
    } else if (useFabricEditing && fabricReady) {
      // Fabric.js 편집 활성화 시 PixiJS 캔버스 숨김 (중복 렌더링 방지)
      pixiCanvas.style.opacity = '0'
      pixiCanvas.style.pointerEvents = 'none'
          } else {
      pixiCanvas.style.opacity = '1'
      pixiCanvas.style.pointerEvents = 'auto'
    }
  }, [useFabricEditing, fabricReady, pixiReady, isPlaying, isPreviewingTransition])

  // 재생 중 또는 전환 효과 미리보기 중일 때 Fabric.js 캔버스 숨기기
  useEffect(() => {
    if (!fabricCanvasRef.current) return
    const fabricCanvas = fabricCanvasRef.current
    
    if (isPlaying || isPreviewingTransition) {
      // 재생 중 또는 전환 효과 미리보기 중일 때 Fabric 캔버스 숨기기
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '0'
        fabricCanvas.wrapperEl.style.pointerEvents = 'none'
          }
        } else {
      // 재생 중이 아닐 때 Fabric 캔버스 보이기
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '1'
        fabricCanvas.wrapperEl.style.pointerEvents = 'auto'
      }
    }
  }, [isPlaying, isPreviewingTransition, fabricReady])

  // Fabric 오브젝트 선택 가능 여부를 편집 모드에 맞춰 갱신
  useEffect(() => {
    if (!fabricReady || !fabricCanvasRef.current || !useFabricEditing) return
    const fabricCanvas = fabricCanvasRef.current
    // 항상 선택 가능 (커서가 올라가면 바로 편집 가능)
    fabricCanvas.selection = true
    fabricCanvas.forEachObject((obj: fabric.Object & { dataType?: 'image' | 'text' }) => {
      obj.set({
        selectable: true,
        evented: true,
        lockScalingFlip: true,
        hoverCursor: 'move',
        moveCursor: 'move',
      })
    })
    fabricCanvas.discardActiveObject()
    fabricCanvas.renderAll()
  }, [fabricReady, editMode, useFabricEditing])

  // 이미지 fit 계산
  const calculateSpriteParams = (
    textureWidth: number,
    textureHeight: number,
    stageWidth: number,
    stageHeight: number,
    fit: 'cover' | 'contain' | 'fill'
  ) => {
    const imgAspect = textureWidth / textureHeight
    const stageAspect = stageWidth / stageHeight

    if (fit === 'fill') {
      return { x: 0, y: 0, width: stageWidth, height: stageHeight }
    } else if (fit === 'cover') {
      const scale = imgAspect > stageAspect 
        ? stageHeight / textureHeight 
        : stageWidth / textureWidth
      const width = textureWidth * scale
      const height = textureHeight * scale
      return {
        x: (stageWidth - width) / 2,
        y: (stageHeight - height) / 2,
        width,
        height,
          }
          } else {
      const scale = imgAspect > stageAspect 
        ? stageWidth / textureWidth 
        : stageHeight / textureHeight
      const width = textureWidth * scale
      const height = textureHeight * scale
      return {
        x: (stageWidth - width) / 2,
        y: (stageHeight - height) / 2,
        width,
        height,
      }
    }
  }

  // 텍스처 로드
  const loadPixiTexture = (url: string): Promise<PIXI.Texture> => {
    return new Promise((resolve, reject) => {
      if (texturesRef.current.has(url)) {
        resolve(texturesRef.current.get(url)!)
        return
      }

      if (url.startsWith('data:') || url.startsWith('blob:')) {
        try {
          const texture = PIXI.Texture.from(url)
          texturesRef.current.set(url, texture)
          resolve(texture)
          return
        } catch (error) {
          console.error('Failed to load data/blob URL:', error)
        }
      }

      PIXI.Assets.load(url)
        .then((texture) => {
          if (texture) {
            texturesRef.current.set(url, texture)
            resolve(texture)
          } else {
            reject(new Error(`Invalid texture: ${url}`))
          }
        })
        .catch((error) => {
          try {
            const fallbackTexture = PIXI.Texture.from(url)
            if (fallbackTexture) {
              texturesRef.current.set(url, fallbackTexture)
              resolve(fallbackTexture)
            } else {
              reject(new Error(`Failed to load: ${url}`))
            }
          } catch (fallbackError) {
            reject(new Error(`Failed to load: ${url}`))
          }
        })
    })
  }

  // 진행 중인 애니메이션 추적
  const activeAnimationsRef = useRef<Map<number, gsap.core.Timeline>>(new Map())

  // GlowFilter 구현 (BlurFilter를 조합하여 후광 효과 생성)
  const createGlowFilter = (
    distance: number = 10,
    outerStrength: number = 4,
    innerStrength: number = 0,
    color: number = 0xffffff
  ): PIXI.BlurFilter => {
    const blurFilter = new PIXI.BlurFilter()
    blurFilter.blur = distance
    // 후광 효과를 위해 여러 필터를 조합할 수 있지만, 간단하게 BlurFilter 사용
    return blurFilter
  }

  // GlitchFilter 구현 (DisplacementFilter 사용)
  const createGlitchFilter = (intensity: number = 10): PIXI.DisplacementFilter | null => {
    if (!appRef.current) return null
    
    // 간단한 Displacement 텍스처 생성
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // 랜덤 노이즈 생성
    const imageData = ctx.createImageData(size, size)
    for (let i = 0; i < imageData.data.length; i += 4) {
      const value = Math.random() * 255
      imageData.data[i] = value // R
      imageData.data[i + 1] = value // G
      imageData.data[i + 2] = 128 // B (중간값)
      imageData.data[i + 3] = 255 // A
    }
    ctx.putImageData(imageData, 0, 0)

    const texture = PIXI.Texture.from(canvas)
    const sprite = new PIXI.Sprite(texture)
    const filter = new PIXI.DisplacementFilter(sprite, intensity)
    return filter
  }

  // 파티클 시스템 생성
  const createParticleSystem = (
    type: 'sparkle' | 'snow' | 'confetti' | 'stars',
    count: number,
    stageWidth: number,
    stageHeight: number,
    duration: number
  ): PIXI.Container => {
    const container = new PIXI.Container()
    const particles: PIXI.Graphics[] = []

    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics()
      
      switch (type) {
        case 'sparkle':
          // 반짝이는 별 모양 (수동으로 그리기)
          particle.beginFill(0xffffff, 1)
          const sparkleSize = 5
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5
            const x1 = Math.cos(angle) * sparkleSize
            const y1 = Math.sin(angle) * sparkleSize
            const x2 = Math.cos(angle + Math.PI / 5) * sparkleSize * 0.5
            const y2 = Math.sin(angle + Math.PI / 5) * sparkleSize * 0.5
            if (i === 0) {
              particle.moveTo(x1, y1)
            } else {
              particle.lineTo(x1, y1)
            }
            particle.lineTo(x2, y2)
          }
          particle.closePath()
          particle.endFill()
          break
        case 'snow':
          // 눈송이 (원)
          particle.beginFill(0xffffff, 0.8)
          particle.drawCircle(0, 0, 3)
          particle.endFill()
          break
        case 'confetti':
          // 컨페티 (사각형)
          const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff]
          particle.beginFill(colors[Math.floor(Math.random() * colors.length)], 1)
          particle.drawRect(-5, -5, 10, 10)
          particle.endFill()
          break
        case 'stars':
          // 별 (수동으로 그리기)
          particle.beginFill(0xffff00, 1)
          const starSize = 4
          for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
            const x1 = Math.cos(angle) * starSize
            const y1 = Math.sin(angle) * starSize
            const x2 = Math.cos(angle + Math.PI / 5) * starSize * 0.5
            const y2 = Math.sin(angle + Math.PI / 5) * starSize * 0.5
            if (i === 0) {
              particle.moveTo(x1, y1)
            } else {
              particle.lineTo(x1, y1)
            }
            particle.lineTo(x2, y2)
          }
          particle.closePath()
          particle.endFill()
          break
      }

      // 랜덤 위치
      particle.x = Math.random() * stageWidth
      particle.y = Math.random() * stageHeight
      particle.alpha = 0
      particle.scale.set(0.5 + Math.random() * 0.5)

      container.addChild(particle)
      particles.push(particle)
    }

    // 파티클 애니메이션
    const tl = gsap.timeline()
    particles.forEach((particle, index) => {
      const delay = (index / count) * 0.1
      const fallSpeed = 50 + Math.random() * 100
      const horizontalDrift = (Math.random() - 0.5) * 50

      // 등장 애니메이션
      tl.to(particle, {
        alpha: 1,
        duration: 0.3,
        delay,
      }, 0)

      // 이동 애니메이션
      tl.to(particle, {
        y: stageHeight + 50,
        x: particle.x + horizontalDrift,
        rotation: Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1),
        duration: duration,
        delay,
        ease: 'none',
      }, 0)

      // 사라짐 애니메이션
      tl.to(particle, {
        alpha: 0,
        duration: 0.3,
        delay: delay + duration - 0.3,
      }, 0)
    })

    return container
  }

  // 고급 효과 적용
  const applyAdvancedEffects = useCallback((
    sprite: PIXI.Sprite,
    sceneIndex: number,
    effects?: TimelineScene['advancedEffects']
  ) => {
    if (!effects || !appRef.current || !containerRef.current) return

    const filters: PIXI.Filter[] = []

    // Glow 효과
    if (effects.glow?.enabled) {
      const glowFilter = createGlowFilter(
        effects.glow.distance || 10,
        effects.glow.outerStrength || 4,
        effects.glow.innerStrength || 0,
        effects.glow.color || 0xffffff
      )
      filters.push(glowFilter)
    }

    // Glitch 효과
    if (effects.glitch?.enabled) {
      const glitchFilter = createGlitchFilter(effects.glitch.intensity || 10)
      if (glitchFilter) {
        filters.push(glitchFilter)
      }
    }

    sprite.filters = filters.length > 0 ? filters : null

    // 파티클 효과
    if (effects.particles?.enabled && effects.particles.type) {
      const existingParticles = particlesRef.current.get(sceneIndex)
      if (existingParticles && existingParticles.parent) {
        existingParticles.parent.removeChild(existingParticles)
        particlesRef.current.delete(sceneIndex)
      }

      const particleSystem = createParticleSystem(
        effects.particles.type,
        effects.particles.count || 50,
        stageDimensions.width,
        stageDimensions.height,
        effects.particles.duration || 2
      )

      containerRef.current.addChild(particleSystem)
      particlesRef.current.set(sceneIndex, particleSystem)

      // 파티클 애니메이션 완료 후 제거
      setTimeout(() => {
        if (particleSystem.parent) {
          particleSystem.parent.removeChild(particleSystem)
        }
        particlesRef.current.delete(sceneIndex)
      }, (effects.particles.duration || 2) * 1000)
    }
  }, [stageDimensions])

  // 씬 등장 효과 함수들 (이미지가 나타날 때 적용)
  const applyEnterEffect = useCallback((
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number
  ) => {
    console.log(`Step4: applyEnterEffect called for scene ${sceneIndex}, transition: ${transition}`)
    if (!toSprite) {
      console.log(`Step4: applyEnterEffect - no sprite for scene ${sceneIndex}`)
      return
    }

    // 이전 애니메이션 kill
    const prevAnim = activeAnimationsRef.current.get(sceneIndex)
    if (prevAnim) {
      prevAnim.kill()
      activeAnimationsRef.current.delete(sceneIndex)
    }

    const tl = gsap.timeline({
      onStart: () => {
        console.log(`Step4: GSAP animation started for scene ${sceneIndex}`)
      },
      onComplete: () => {
        console.log(`Step4: GSAP animation completed for scene ${sceneIndex}`)
      }
    })
    activeAnimationsRef.current.set(sceneIndex, tl)
    
    // 원래 위치 저장
    const originalSpriteX = toSprite.x
    const originalSpriteY = toSprite.y
    const originalSpriteScaleX = toSprite.scale.x
    const originalSpriteScaleY = toSprite.scale.y
    const originalSpriteRotation = toSprite.rotation
    
    const originalTextX = toText ? toText.x : 0
    const originalTextY = toText ? toText.y : 0
    const originalTextScaleX = toText ? toText.scale.x : 1
    const originalTextScaleY = toText ? toText.scale.y : 1
    const originalTextRotation = toText ? toText.rotation : 0
    
    // 기본 설정: toSprite는 시작 시 보이지 않음
    console.log(`Step4: Setting sprite ${sceneIndex} to visible=true, alpha=0`)
    if (toSprite) {
      toSprite.visible = true
      toSprite.alpha = 0
    }
    if (toText) {
      toText.visible = true
      toText.alpha = 0
    }

    switch (transition) {
      case 'fade':
        // 페이드
        console.log(`Step4: Applying fade effect for scene ${sceneIndex}`)
        const fadeObj = { alpha: 0 }
        tl.to(fadeObj, { 
          alpha: 1, 
          duration, 
          onUpdate: function() {
            if (toSprite) {
              toSprite.alpha = fadeObj.alpha
            }
            if (toText) {
              toText.alpha = fadeObj.alpha
            }
            // PixiJS 렌더링 강제 실행
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            console.log(`Step4: Fade complete for scene ${sceneIndex}, final alpha:`, toSprite?.alpha)
            // 최종 렌더링
            if (appRef.current) {
              appRef.current.render()
            }
          }
        }, 0)
        break

      case 'slide-left':
        // 슬라이드 좌 (왼쪽에서 나타남)
        const toSlideLeftObj = { x: originalSpriteX - stageWidth, alpha: 0 }
        toSprite.x = originalSpriteX - stageWidth
        if (toText) {
          toText.x = originalTextX - stageWidth
        }
        tl.to(toSlideLeftObj, { x: originalSpriteX, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.x = toSlideLeftObj.x
            toSprite.alpha = toSlideLeftObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideLeftObj = { x: originalTextX - stageWidth, alpha: 0 }
          tl.to(toTextSlideLeftObj, { x: originalTextX, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.x = toTextSlideLeftObj.x
              toText.alpha = toTextSlideLeftObj.alpha
            }
          }}, 0)
        }
        break

      case 'slide-right':
        // 슬라이드 우 (오른쪽에서 나타남)
        const toSlideRightObj = { x: originalSpriteX + stageWidth, alpha: 0 }
        toSprite.x = originalSpriteX + stageWidth
        if (toText) {
          toText.x = originalTextX + stageWidth
        }
        tl.to(toSlideRightObj, { x: originalSpriteX, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.x = toSlideRightObj.x
            toSprite.alpha = toSlideRightObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideRightObj = { x: originalTextX + stageWidth, alpha: 0 }
          tl.to(toTextSlideRightObj, { x: originalTextX, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.x = toTextSlideRightObj.x
              toText.alpha = toTextSlideRightObj.alpha
            }
          }}, 0)
        }
        break

      case 'slide-up':
        // 슬라이드 상 (아래에서 나타남)
        const toSlideUpObj = { y: originalSpriteY + stageHeight, alpha: 0 }
        toSprite.y = originalSpriteY + stageHeight
        if (toText) {
          toText.y = originalTextY + stageHeight
        }
        tl.to(toSlideUpObj, { y: originalSpriteY, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.y = toSlideUpObj.y
            toSprite.alpha = toSlideUpObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideUpObj = { y: originalTextY + stageHeight, alpha: 0 }
          tl.to(toTextSlideUpObj, { y: originalTextY, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.y = toTextSlideUpObj.y
              toText.alpha = toTextSlideUpObj.alpha
            }
          }}, 0)
        }
        break

      case 'slide-down':
        // 슬라이드 하 (위에서 나타남)
        const toSlideDownObj = { y: originalSpriteY - stageHeight, alpha: 0 }
        toSprite.y = originalSpriteY - stageHeight
        if (toText) {
          toText.y = originalTextY - stageHeight
        }
        tl.to(toSlideDownObj, { y: originalSpriteY, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.y = toSlideDownObj.y
            toSprite.alpha = toSlideDownObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideDownObj = { y: originalTextY - stageHeight, alpha: 0 }
          tl.to(toTextSlideDownObj, { y: originalTextY, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.y = toTextSlideDownObj.y
              toText.alpha = toTextSlideDownObj.alpha
            }
          }}, 0)
        }
        break

      case 'zoom-in':
        // 확대 (작은 크기에서 확대)
        const toZoomObj = { scale: 0.5, alpha: 0 }
        toSprite.scale.set(0.5, 0.5)
        toSprite.x = originalSpriteX + (toSprite.width * 0.25)
        toSprite.y = originalSpriteY + (toSprite.height * 0.25)
        if (toText) {
          toText.scale.set(0.5, 0.5)
        }
        tl.to(toZoomObj, { scale: 1, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            const scaleFactor = toZoomObj.scale
            toSprite.scale.set(scaleFactor, scaleFactor)
            toSprite.x = originalSpriteX + (toSprite.width * (1 - scaleFactor) / 2)
            toSprite.y = originalSpriteY + (toSprite.height * (1 - scaleFactor) / 2)
            toSprite.alpha = toZoomObj.alpha
          }
          if (toText) {
            toText.scale.set(toZoomObj.scale, toZoomObj.scale)
            toText.alpha = toZoomObj.alpha
          }
        }}, 0)
        break

      case 'zoom-out':
        // 축소 (큰 크기에서 축소)
        const toZoomOutObj = { scale: 1.5, alpha: 0 }
        toSprite.scale.set(1.5, 1.5)
        toSprite.x = originalSpriteX - (toSprite.width * 0.25)
        toSprite.y = originalSpriteY - (toSprite.height * 0.25)
        if (toText) {
          toText.scale.set(1.5, 1.5)
        }
        tl.to(toZoomOutObj, { scale: 1, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            const scaleFactor = toZoomOutObj.scale
            toSprite.scale.set(scaleFactor, scaleFactor)
            toSprite.x = originalSpriteX - (toSprite.width * (scaleFactor - 1) / 2)
            toSprite.y = originalSpriteY - (toSprite.height * (scaleFactor - 1) / 2)
            toSprite.alpha = toZoomOutObj.alpha
          }
          if (toText) {
            toText.scale.set(toZoomOutObj.scale, toZoomOutObj.scale)
            toText.alpha = toZoomOutObj.alpha
          }
        }}, 0)
        break

      case 'rotate':
        // 회전 (회전하며 나타남)
        const toRotateObj = { rotation: -Math.PI * 2, alpha: 0 }
        toSprite.rotation = -Math.PI * 2
        if (toText) {
          toText.rotation = -Math.PI * 2
        }
        tl.to(toRotateObj, { rotation: 0, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.rotation = toRotateObj.rotation
            toSprite.alpha = toRotateObj.alpha
          }
        }}, 0)
        if (toText) {
          tl.to(toRotateObj, { rotation: 0, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.rotation = toRotateObj.rotation
              toText.alpha = toRotateObj.alpha
            }
          }}, 0)
        }
        break


      case 'blur':
        // 블러 (블러에서 선명하게)
        const toBlurFilter = new PIXI.BlurFilter()
        toBlurFilter.blur = 20
        toSprite.filters = [toBlurFilter]
        const toBlurObj = { blur: 20, alpha: 0 }
        tl.to(toBlurObj, { blur: 0, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toBlurFilter.blur = toBlurObj.blur
            toSprite.alpha = toBlurObj.alpha
          }
          if (toText) {
            toText.alpha = toBlurObj.alpha
          }
        }}, 0)
        break

      case 'glitch':
        // 글리치 (랜덤 위치 이동하며 나타남)
        const glitchObj = { x: originalSpriteX, alpha: 0 }
        toSprite.x = originalSpriteX
        const glitchAnim = () => {
          const offset = (Math.random() - 0.5) * 20
          gsap.to(glitchObj, { x: originalSpriteX + offset, duration: 0.05, yoyo: true, repeat: 5, onUpdate: function() {
            if (toSprite) {
              toSprite.x = glitchObj.x
            }
          }})
        }
        glitchAnim()
        tl.to(glitchObj, { alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.alpha = glitchObj.alpha
          }
          if (toText) {
            toText.alpha = glitchObj.alpha
          }
        }}, 0)
        break


      case 'ripple':
        // 물결 효과 (작은 크기에서 확장)
        const toRippleObj = { scale: 0.8, alpha: 0 }
        toSprite.scale.set(0.8, 0.8)
        toSprite.x = originalSpriteX + (toSprite.width * 0.1)
        toSprite.y = originalSpriteY + (toSprite.height * 0.1)
        tl.to(toRippleObj, { scale: 1, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            const scaleFactor = toRippleObj.scale
            toSprite.scale.set(scaleFactor, scaleFactor)
            toSprite.x = originalSpriteX + (toSprite.width * (1 - scaleFactor) / 2)
            toSprite.y = originalSpriteY + (toSprite.height * (1 - scaleFactor) / 2)
            toSprite.alpha = toRippleObj.alpha
          }
          if (toText) {
            toText.alpha = toRippleObj.alpha
          }
        }}, 0)
        break

      case 'circle':
        // 원형 마스크 확장 (중앙에서 원형으로 확장)
        const circleMask = new PIXI.Graphics()
        circleMask.beginFill(0xffffff)
        circleMask.drawCircle(stageWidth / 2, stageHeight / 2, 0)
        circleMask.endFill()
        toSprite.mask = circleMask
        const maskRadius = { value: 0 }
        const maxRadius = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight) / 2
        const circleAlphaObj = { alpha: 0 }
        tl.to(maskRadius, { 
          value: maxRadius,
          duration,
          onUpdate: function() {
            circleMask.clear()
            circleMask.beginFill(0xffffff)
            circleMask.drawCircle(stageWidth / 2, stageHeight / 2, maskRadius.value)
            circleMask.endFill()
          }
        })
        tl.to(circleAlphaObj, { alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.alpha = circleAlphaObj.alpha
          }
          if (toText) {
            toText.alpha = circleAlphaObj.alpha
          }
        }}, 0)
        break


      default:
        // 기본: 페이드
        const defaultFadeObj = { alpha: 0 }
        tl.to(defaultFadeObj, { alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.alpha = defaultFadeObj.alpha
          }
          if (toText) {
            toText.alpha = defaultFadeObj.alpha
          }
        }}, 0)
    }

    // 애니메이션 완료 후 정리
    tl.call(() => {
      activeAnimationsRef.current.delete(sceneIndex)
      if (appRef.current) {
        appRef.current.render()
      }
    })

    // 고급 효과 적용
    if (toSprite && timeline) {
      const scene = timeline.scenes[sceneIndex]
      if (scene?.advancedEffects) {
        applyAdvancedEffects(toSprite, sceneIndex, scene.advancedEffects)
      }
    }
  }, [timeline, stageDimensions, applyAdvancedEffects])

  // 현재 씬 업데이트
  const updateCurrentScene = useCallback((skipAnimation: boolean = false) => {
    console.log('Step4: updateCurrentScene called, index:', currentSceneIndex, 'skipAnimation:', skipAnimation, 'container:', !!containerRef.current, 'timeline:', !!timeline)
    if (!containerRef.current || !timeline || !appRef.current) {
      console.log('Step4: updateCurrentScene skipped - missing container or timeline')
        return
      }

    const spriteCount = spritesRef.current.size
    const textCount = textsRef.current.size
    console.log('Step4: updateCurrentScene - sprites:', spriteCount, 'texts:', textCount)

    const currentScene = timeline.scenes[currentSceneIndex]
    const previousIndex = previousSceneIndexRef.current
    const previousScene = previousIndex !== null ? timeline.scenes[previousIndex] : null

    const currentSprite = spritesRef.current.get(currentSceneIndex)
    const currentText = textsRef.current.get(currentSceneIndex)
    const previousSprite = previousIndex !== null ? spritesRef.current.get(previousIndex) : null
    const previousText = previousIndex !== null ? textsRef.current.get(previousIndex) : null

    // 이전 씬 숨기기
    if (previousSprite && previousIndex !== null && previousIndex !== currentSceneIndex) {
      previousSprite.visible = false
      previousSprite.alpha = 0
    }
    if (previousText && previousIndex !== null && previousIndex !== currentSceneIndex) {
      previousText.visible = false
      previousText.alpha = 0
    }

    // 애니메이션 스킵 시 즉시 표시
    if (skipAnimation) {
      console.log('Step4: Skipping animation, showing immediately')
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      if (currentText) {
        currentText.visible = true
        currentText.alpha = 1
      }
      if (appRef.current) {
        appRef.current.render()
      }
      previousSceneIndexRef.current = currentSceneIndex
        return
      }

    // 현재 씬 등장 효과 적용
    if (currentSprite) {
      const transition = currentScene.transition || 'fade'
      const transitionDuration = currentScene.transitionDuration || 0.5
      const { width, height } = stageDimensions

      // 이전 씬의 애니메이션 모두 kill
      activeAnimationsRef.current.forEach((anim, idx) => {
        if (idx !== currentSceneIndex) {
          anim.kill()
          activeAnimationsRef.current.delete(idx)
        }
      })

      // 고급 효과 적용
      if (currentScene.advancedEffects) {
        applyAdvancedEffects(currentSprite, currentSceneIndex, currentScene.advancedEffects)
      }

      applyEnterEffect(
        currentSprite,
        currentText || null,
        transition,
        transitionDuration,
        width,
        height,
        currentSceneIndex
      )
    } else {
      // 스프라이트가 없으면 즉시 표시
      spritesRef.current.forEach((sprite, index) => {
        if (sprite?.parent) {
          sprite.visible = index === currentSceneIndex
          sprite.alpha = index === currentSceneIndex ? 1 : 0
        }
      })
      textsRef.current.forEach((text, index) => {
        if (text?.parent) {
          text.visible = index === currentSceneIndex
          text.alpha = index === currentSceneIndex ? 1 : 0
        }
      })

      if (appRef.current) {
        appRef.current.render()
      }
    }

    previousSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex, timeline, stageDimensions, applyEnterEffect])

  // Fabric 오브젝트를 현재 씬 상태에 맞게 동기화
  const syncFabricWithScene = useCallback(async () => {
    if (!useFabricEditing || !fabricCanvasRef.current || !timeline) return
    const fabricCanvas = fabricCanvasRef.current
    const scene = timeline.scenes[currentSceneIndex]
    if (!scene) return
    const scale = fabricScaleRatioRef.current
    console.log('Fabric sync start', {
      sceneIndex: currentSceneIndex,
      image: !!scene.image,
      text: scene.text?.content,
      scale,
    })
    fabricCanvas.clear()

    const { width, height } = stageDimensions

    // 이미지 (좌표를 스케일 비율에 맞게 조정)
    if (scene.image) {
      const img = await (fabric.Image.fromURL as any)(scene.image, { crossOrigin: 'anonymous' }) as fabric.Image
      if (img) {
        const transform = scene.imageTransform
        let left: number, top: number, imgScaleX: number, imgScaleY: number, angleDeg: number
        
        if (transform) {
          angleDeg = (transform.rotation || 0) * (180 / Math.PI)
          const effectiveWidth = transform.width * (transform.scaleX || 1)
          const effectiveHeight = transform.height * (transform.scaleY || 1)
          imgScaleX = (effectiveWidth / img.width) * scale
          imgScaleY = (effectiveHeight / img.height) * scale
          left = transform.x * scale
          top = transform.y * scale
        } else {
          // 초기 contain/cover 계산과 동일하게 배치
          const params = calculateSpriteParams(img.width, img.height, width, height, scene.imageFit || 'fill')
          imgScaleX = (params.width / img.width) * scale
          imgScaleY = (params.height / img.height) * scale
          left = params.x * scale
          top = params.y * scale
          angleDeg = 0
        }
        
        img.set({
          originX: 'left',
          originY: 'top',
          left,
          top,
          scaleX: imgScaleX,
          scaleY: imgScaleY,
          angle: angleDeg,
          selectable: true,
          evented: true,
        })
        ;(img as any).dataType = 'image'
        fabricCanvas.add(img)
      }
    }

    // 텍스트 (좌표를 스케일 비율에 맞게 조정)
    if (scene.text?.content) {
      const transform = scene.text.transform
      const angleDeg = (transform?.rotation || 0) * (180 / Math.PI)
      const baseFontSize = scene.text.fontSize || 32
      const scaledFontSize = baseFontSize * scale
      
      const textObj = new fabric.Textbox(scene.text.content, {
        left: (transform?.x ?? width / 2) * scale,
        top: (transform?.y ?? height * 0.9) * scale,
        originX: 'center',
        originY: 'center',
        fontFamily: scene.text.font || 'Arial',
        fontSize: scaledFontSize,
        fill: scene.text.color || '#ffffff',
        fontWeight: scene.text.style?.bold ? 'bold' : 'normal',
        fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
        underline: scene.text.style?.underline || false,
        textAlign: scene.text.style?.align || 'center',
        selectable: true,
        evented: true,
        angle: angleDeg,
      })
      if (transform) {
        // width가 있으면 박스 크기 반영
        if (transform.width) {
          textObj.set({ width: transform.width * scale })
        }
        // scaleX/scaleY는 이미 fontSize와 width에 반영됨
      }
      ;(textObj as any).dataType = 'text'
      fabricCanvas.add(textObj)
    }

    console.log('Fabric sync done', {
      objects: fabricCanvas.getObjects().length,
      scale,
    })
    fabricCanvas.renderAll()
  }, [currentSceneIndex, editMode, stageDimensions, timeline, useFabricEditing, calculateSpriteParams])

  // Fabric 변경사항을 타임라인에 반영
  useEffect(() => {
    if (!fabricReady || !fabricCanvasRef.current || !timeline) return
    const fabricCanvas = fabricCanvasRef.current

    const handleModified = (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e?.target as (fabric.Object & { dataType?: 'image' | 'text' })
      if (!target || currentSceneIndex == null) return
      
      // 스케일된 좌표를 원래 좌표로 역변환
      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale
      
      // 씬 이동 방지: 현재 씬 인덱스 저장 및 플래그 설정
      const savedIndex = currentSceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true
      
      if (target.dataType === 'image') {
        const nextTransform = {
          x: (target.left ?? 0) * invScale,
          y: (target.top ?? 0) * invScale,
          width: (target.getScaledWidth() ?? (target.width || 0)) * invScale,
          height: (target.getScaledHeight() ?? (target.height || 0)) * invScale,
          scaleX: 1,
          scaleY: 1,
          rotation: ((target.angle || 0) * Math.PI) / 180,
        }
        console.log('Fabric image modified', { scale, invScale, nextTransform, savedIndex })
        const nextTimeline: TimelineData = {
          ...timeline,
          scenes: timeline.scenes.map((scene, idx) =>
            idx === savedIndex
              ? {
                  ...scene,
                  imageTransform: nextTransform,
                }
              : scene
          ),
        }
        setTimeline(nextTimeline)
      } else if (target.dataType === 'text') {
        const textbox = target as fabric.Textbox
        const nextTransform = {
          x: (target.left ?? 0) * invScale,
          y: (target.top ?? 0) * invScale,
          width: (target.getScaledWidth() ?? (target.width || 0)) * invScale,
          height: (target.getScaledHeight() ?? (target.height || 0)) * invScale,
          scaleX: 1,
          scaleY: 1,
          rotation: ((target.angle || 0) * Math.PI) / 180,
        }
        const textContent = textbox.text ?? ''
        // 리사이즈 시 scaleY를 fontSize에 반영 (scaleY * fontSize = 실제 표시 크기)
        const baseFontSize = textbox.fontSize ?? 32
        const textScaleY = textbox.scaleY ?? 1
        // 실제 표시되는 폰트 크기 계산 후 좌표계 역변환
        const actualFontSize = baseFontSize * textScaleY * invScale
        const fontFamily = textbox.fontFamily ?? 'Arial'
        const fill = textbox.fill ?? '#ffffff'
        const align = textbox.textAlign ?? 'center'

        console.log('Fabric text modified', { 
          scale, invScale, nextTransform, 
          baseFontSize, textScaleY, actualFontSize, 
          savedIndex 
        })
        const nextTimeline: TimelineData = {
          ...timeline,
          scenes: timeline.scenes.map((scene, idx) =>
            idx === savedIndex
              ? {
                  ...scene,
                  text: {
                    ...scene.text,
                    content: textContent,
                    fontSize: actualFontSize,
                    font: fontFamily,
                    color: typeof fill === 'string' ? fill : '#ffffff',
                    style: {
                      ...scene.text.style,
                      align: align as 'left' | 'center' | 'right' | 'justify',
                    },
                    transform: nextTransform,
                  },
                }
              : scene
          ),
        }
        setTimeline(nextTimeline)
        
        // 리사이즈 후 scale을 1로 리셋하고 fontSize를 실제 크기로 설정
        textbox.set({
          fontSize: baseFontSize * textScaleY,
          scaleX: 1,
          scaleY: 1,
        })
        fabricCanvasRef.current?.requestRenderAll()
      }
      
      // 플래그 해제 (약간의 지연)
      setTimeout(() => {
        isSavingTransformRef.current = false
        isManualSceneSelectRef.current = false
      }, 200)
    }

    const handleMouseDown = (e: any) => {
      const objects = fabricCanvas.getObjects()
      const vpt = fabricCanvas.viewportTransform
      console.log('Fabric mouse:down', {
        pointer: e.pointer,
        absolutePointer: e.absolutePointer,
        viewportTransform: vpt,
        canvasWidth: fabricCanvas.width,
        canvasHeight: fabricCanvas.height,
        objectsCount: objects.length,
        objects: objects.map((o: any) => ({
          type: o.type,
          dataType: o.dataType,
          left: o.left,
          top: o.top,
          width: o.width,
          height: o.height,
          scaleX: o.scaleX,
          scaleY: o.scaleY,
          selectable: o.selectable,
          evented: o.evented,
        })),
        targetType: (e.target as any)?.dataType,
        target: e.target,
      })
    }

    // 텍스트 내용 변경 시 저장 (typing으로 변경할 때)
    const handleTextChanged = (e: any) => {
      const target = e?.target as (fabric.Textbox & { dataType?: 'image' | 'text' })
      if (!target || target.dataType !== 'text' || currentSceneIndex == null) return
      
      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale
      
      const savedIndex = currentSceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true
      
      const textContent = target.text ?? ''
      const scaledFontSize = target.fontSize ?? 32
      const fontSize = scaledFontSize * invScale
      
      console.log('Fabric text:changed', { textContent, fontSize, savedIndex })
      
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === savedIndex
            ? {
                ...scene,
                text: {
                  ...scene.text,
                  content: textContent,
                  fontSize,
                },
              }
            : scene
        ),
      }
      setTimeline(nextTimeline)
      
      setTimeout(() => {
        isSavingTransformRef.current = false
        isManualSceneSelectRef.current = false
      }, 200)
    }

    // 텍스트 편집 종료 시 저장
    const handleTextEditingExited = (e: any) => {
      const target = e?.target as (fabric.Textbox & { dataType?: 'image' | 'text' })
      if (!target || target.dataType !== 'text' || currentSceneIndex == null) return
      
      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale
      
      const savedIndex = currentSceneIndex
      isSavingTransformRef.current = true
      savedSceneIndexRef.current = savedIndex
      isManualSceneSelectRef.current = true
      
      const nextTransform = {
        x: (target.left ?? 0) * invScale,
        y: (target.top ?? 0) * invScale,
        width: (target.getScaledWidth() ?? (target.width || 0)) * invScale,
        height: (target.getScaledHeight() ?? (target.height || 0)) * invScale,
        scaleX: 1,
        scaleY: 1,
        rotation: ((target.angle || 0) * Math.PI) / 180,
      }
      const textContent = target.text ?? ''
      // 리사이즈 시 scaleY를 fontSize에 반영
      const baseFontSize = target.fontSize ?? 32
      const textScaleY = target.scaleY ?? 1
      const actualFontSize = baseFontSize * textScaleY * invScale
      const fontFamily = target.fontFamily ?? 'Arial'
      const fill = target.fill ?? '#ffffff'
      const align = target.textAlign ?? 'center'

      console.log('Fabric text:editing:exited', { textContent, nextTransform, baseFontSize, textScaleY, actualFontSize, savedIndex })
      
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === savedIndex
            ? {
                ...scene,
                text: {
                  ...scene.text,
                  content: textContent,
                  fontSize: actualFontSize,
                  font: fontFamily,
                  color: typeof fill === 'string' ? fill : '#ffffff',
                  style: {
                    ...scene.text.style,
                    align: align as 'left' | 'center' | 'right' | 'justify',
                  },
                  transform: nextTransform,
                },
              }
            : scene
        ),
      }
      setTimeline(nextTimeline)
      
      // 리사이즈 후 scale을 1로 리셋하고 fontSize를 실제 크기로 설정
      target.set({
        fontSize: baseFontSize * textScaleY,
        scaleX: 1,
        scaleY: 1,
      })
      fabricCanvasRef.current?.requestRenderAll()
      
      setTimeout(() => {
        isSavingTransformRef.current = false
        isManualSceneSelectRef.current = false
      }, 200)
    }

    fabricCanvas.on('object:modified', handleModified as any)
    fabricCanvas.on('mouse:down', handleMouseDown as any)
    fabricCanvas.on('text:changed', handleTextChanged as any)
    fabricCanvas.on('text:editing:exited', handleTextEditingExited as any)
    return () => {
      fabricCanvas.off('object:modified', handleModified as any)
      fabricCanvas.off('mouse:down', handleMouseDown as any)
      fabricCanvas.off('text:changed', handleTextChanged as any)
      fabricCanvas.off('text:editing:exited', handleTextEditingExited as any)
    }
  }, [fabricReady, timeline, currentSceneIndex, setTimeline])

  // 모든 씬 로드
  const loadAllScenes = useCallback(async () => {
    if (!appRef.current || !containerRef.current || !timeline) {
      console.log('Step4: loadAllScenes skipped - app:', !!appRef.current, 'container:', !!containerRef.current, 'timeline:', !!timeline)
        return
      }

    console.log('Step4: loadAllScenes started, scenes count:', timeline.scenes.length)

    const container = containerRef.current
    const { width, height } = stageDimensions

    container.removeChildren()
    spritesRef.current.clear()
    textsRef.current.clear()

    const loadScene = async (sceneIndex: number) => {
      const scene = timeline.scenes[sceneIndex]
      if (!scene || !scene.image) {
        console.log(`Step4: Scene ${sceneIndex} skipped - no scene or image`)
        return
      }

      try {
        console.log(`Step4: Loading scene ${sceneIndex}, image:`, scene.image)
        const texture = await loadPixiTexture(scene.image)
        console.log(`Step4: Texture loaded for scene ${sceneIndex}, size:`, texture.width, texture.height)
        const sprite = new PIXI.Sprite(texture)
        const imageFit = scene.imageFit || 'fill' // 기본값을 fill로 변경하여 9:16 캔버스를 항상 채움
        const params = calculateSpriteParams(
          texture.width,
          texture.height,
          width,
          height,
          imageFit
        )

        sprite.x = params.x
        sprite.y = params.y
        sprite.width = params.width
        sprite.height = params.height
        sprite.anchor.set(0, 0)
        sprite.visible = false
        sprite.alpha = 0

        // Transform 데이터 적용
        // 주의: sprite.width/height 설정 시 PixiJS가 내부적으로 scale을 계산하므로
        // scale.set()을 별도로 호출하면 안됨
        if (scene.imageTransform) {
          sprite.x = scene.imageTransform.x
          sprite.y = scene.imageTransform.y
          sprite.width = scene.imageTransform.width
          sprite.height = scene.imageTransform.height
          // scale.set() 호출 제거 - width/height에 이미 스케일이 적용된 크기가 저장됨
          sprite.rotation = scene.imageTransform.rotation
        }

        container.addChild(sprite)
        spritesRef.current.set(sceneIndex, sprite)
        console.log(`Step4: Sprite added for scene ${sceneIndex}`)

          if (scene.text?.content) {
          const textStyle = new PIXI.TextStyle({
            fontFamily: scene.text.font || 'Arial',
            fontSize: scene.text.fontSize || 32,
            fill: scene.text.color || '#ffffff',
            align: scene.text.style?.align || 'center',
            fontWeight: scene.text.style?.bold ? 'bold' : 'normal',
            fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
            dropShadow: {
              color: '#000000',
              blur: 10,
              angle: Math.PI / 4,
              distance: 2,
            },
          })

          const text = new PIXI.Text({
            text: scene.text.content,
            style: textStyle,
          })

          text.anchor.set(0.5, 0.5)
          let textY = height / 2
            if (scene.text.position === 'top') {
              textY = 200
            } else if (scene.text.position === 'bottom') {
            textY = height - 200
          }
          text.x = width / 2
          text.y = textY
          text.visible = false
          text.alpha = 0

          // 텍스트 Transform 적용
          if (scene.text.transform) {
            // scaleX, scaleY가 있으면 사용, 없으면 기본값 1 사용
            const scaleX = scene.text.transform.scaleX ?? 1
            const scaleY = scene.text.transform.scaleY ?? 1
            text.x = scene.text.transform.x
            text.y = scene.text.transform.y
            text.scale.set(scaleX, scaleY)
            text.rotation = scene.text.transform.rotation
          }

          container.addChild(text)
          textsRef.current.set(sceneIndex, text)
          }
        } catch (error) {
        console.error(`Failed to load scene ${sceneIndex}:`, error)
      }
    }

    await Promise.all(timeline.scenes.map((_, index) => loadScene(index)))
    
    console.log(
      'Step4: All scenes loaded - sprites:',
      spritesRef.current.size,
      'texts:',
      textsRef.current.size
    )
    
    // 렌더링 강제 실행
    requestAnimationFrame(() => {
      console.log('Step4: Updating current scene after load, index:', currentSceneIndex)
      // Transform 저장 중이 아닐 때만 updateCurrentScene 호출
      if (!isSavingTransformRef.current) {
        updateCurrentScene()
      }
      if (appRef.current) {
        console.log('Step4: Rendering PixiJS app')
        appRef.current.render()
      } else {
        console.error('Step4: appRef.current is null after loadAllScenes')
      }
    })
  }, [timeline, stageDimensions, updateCurrentScene, currentSceneIndex])

  // Pixi와 타임라인이 모두 준비되면 씬 로드
  useEffect(() => {
    console.log('Step4: loadAllScenes effect - pixiReady:', pixiReady, 'app:', !!appRef.current, 'container:', !!containerRef.current, 'timeline:', !!timeline, 'scenes:', timeline?.scenes.length, 'isSavingTransform:', isSavingTransformRef.current)
    if (!pixiReady || !appRef.current || !containerRef.current || !timeline || timeline.scenes.length === 0) {
      console.log('Step4: loadAllScenes effect skipped - waiting for refs')
      return
    }
    // Transform 저장 중일 때는 loadAllScenes를 호출하지 않음 (편집 종료 시 원래 Transform으로 되돌아가는 것 방지)
    if (isSavingTransformRef.current) {
      console.log('Step4: loadAllScenes effect skipped - saving transform')
      return
    }
    console.log('Step4: Calling loadAllScenes')
    // 다음 프레임에 실행하여 ref가 확실히 설정된 후 실행
    requestAnimationFrame(() => {
      loadAllScenes()
    })
  }, [pixiReady, timeline, loadAllScenes])

  // Fabric 씬 동기화
  useEffect(() => {
    if (!fabricReady || !timeline || timeline.scenes.length === 0) return
    syncFabricWithScene()
  }, [fabricReady, timeline, currentSceneIndex, editMode, syncFabricWithScene])
  
  // timeline 변경 시 저장된 씬 인덱스 복원 (더 이상 필요 없음 - 편집 종료 버튼에서 직접 처리)

  // 현재 씬의 시작 시간 계산
  const getSceneStartTime = useCallback((sceneIndex: number) => {
    if (!timeline) return 0
    let time = 0
    for (let i = 0; i < sceneIndex; i++) {
      time += timeline.scenes[i].duration + (timeline.scenes[i].transitionDuration || 0.5)
    }
    return time
  }, [timeline])

  // 재생/일시정지
  const handlePlayPause = () => {
    if (!isPlaying) {
      // 재생 시작: 현재 선택된 씬의 시작 시간으로 설정
      if (!timeline) return
      
      console.log('Step4: Play button clicked, currentSceneIndex:', currentSceneIndex)
      
      // PixiJS가 준비되지 않으면 재생하지 않음
      if (!pixiReady || spritesRef.current.size === 0) {
        console.log('Step4: PixiJS not ready or no sprites loaded, skipping sync')
    setIsPlaying(!isPlaying)
        return
      }
      
      // 재생 시작 전에 모든 PixiJS 스프라이트를 timeline 데이터와 동기화
      timeline.scenes.forEach((scene, index) => {
        const sprite = spritesRef.current.get(index)
        const text = textsRef.current.get(index)
        
        // 스프라이트가 유효한 경우에만 처리
        if (sprite && sprite.x !== undefined) {
          // 모든 스프라이트를 먼저 숨김
          sprite.visible = false
          sprite.alpha = 0
          
          // Transform 동기화
          // 주의: sprite.width/height 설정 후 scale.set()을 호출하면 안됨
          // PixiJS에서 width/height 설정 시 내부적으로 scale이 계산됨
          if (scene.imageTransform) {
            sprite.x = scene.imageTransform.x
            sprite.y = scene.imageTransform.y
            sprite.width = scene.imageTransform.width
            sprite.height = scene.imageTransform.height
            sprite.rotation = scene.imageTransform.rotation || 0
          }
        }
        
        // 텍스트가 유효한 경우에만 처리
        if (text && text.x !== undefined) {
          text.visible = false
          text.alpha = 0
          
          if (scene.text.transform) {
            text.x = scene.text.transform.x
            text.y = scene.text.transform.y
            text.rotation = scene.text.transform.rotation || 0
          }
          if (scene.text.fontSize) {
            text.style.fontSize = scene.text.fontSize
          }
        }
      })
      
      // 현재 씬만 보이게 설정
      const currentSprite = spritesRef.current.get(currentSceneIndex)
      const currentText = textsRef.current.get(currentSceneIndex)
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      if (currentText) {
        currentText.visible = true
        currentText.alpha = 1
      }
      
      const startTime = getSceneStartTime(currentSceneIndex)
      console.log('Step4: Setting currentTime to:', startTime)
      setCurrentTime(startTime)
      
      // 재생 시작 시 현재 씬에도 등장 효과 적용 (첫 번째 씬 포함)
      console.log('Step4: Showing scene with animation')
      updateCurrentScene(false)  // skipAnimation = false, 등장 효과 적용
      
      // PixiJS 캔버스 강제 렌더링
      if (appRef.current) {
        appRef.current.render()
      }
    }
    setIsPlaying(!isPlaying)
  }

  // 씬 선택
  const handleSceneSelect = (index: number) => {
    if (!timeline) return
    if (isPlaying) setIsPlaying(false)
    
    console.log('Step4: Scene selected:', index)
    
    let timeUntilScene = 0
    for (let i = 0; i < index; i++) {
      timeUntilScene += timeline.scenes[i].duration + (timeline.scenes[i].transitionDuration || 0.5)
    }
    
    // 수동 선택 플래그 설정
    isManualSceneSelectRef.current = true
    setCurrentSceneIndex(index)
    setCurrentTime(timeUntilScene)
    
    // 선택된 씬을 즉시 표시 (애니메이션 없이)
    const selectedSprite = spritesRef.current.get(index)
    const selectedText = textsRef.current.get(index)
    
    console.log('Step4: Immediately showing selected scene', index, 'sprite:', !!selectedSprite, 'text:', !!selectedText)
    
    // 모든 씬 숨기기
    spritesRef.current.forEach((sprite, idx) => {
      if (sprite) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })
    textsRef.current.forEach((text, idx) => {
      if (text) {
        text.visible = false
        text.alpha = 0
      }
    })
    
    // 선택된 씬만 즉시 표시
    if (selectedSprite) {
      selectedSprite.visible = true
      selectedSprite.alpha = 1
      console.log('Step4: Set sprite alpha to 1 for scene', index)
    }
    if (selectedText) {
      selectedText.visible = true
      selectedText.alpha = 1
      console.log('Step4: Set text alpha to 1 for scene', index)
    }
    
    if (appRef.current) {
      console.log('Step4: Rendering PixiJS app for scene selection')
      appRef.current.render()
    }
    
    // useEffect가 실행된 후 플래그 리셋 (다음 이벤트 루프에서)
    setTimeout(() => {
      isManualSceneSelectRef.current = false
    }, 0)
  }

  // 전체 재생 시간 계산
  const totalDuration = useMemo(() => {
    if (!timeline) return 0
    return timeline.scenes.reduce(
      (acc, scene) => acc + scene.duration + (scene.transitionDuration || 0.5),
      0
    )
  }, [timeline])

  // 재생 루프 (requestAnimationFrame)
  useEffect(() => {
    if (!isPlaying || totalDuration === 0) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      lastTimestampRef.current = null
      return
    }

    const step = (timestamp: number) => {
      if (lastTimestampRef.current == null) {
        lastTimestampRef.current = timestamp
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000
      lastTimestampRef.current = timestamp

      setCurrentTime((prev) => {
        // 전체 영상 배속 적용
        const speed = timeline?.playbackSpeed || playbackSpeed || 1.0
        const speedAdjustedDelta = delta * speed
        const next = prev + speedAdjustedDelta
        if (next >= totalDuration) {
          // 재생 끝
          setIsPlaying(false)
          return totalDuration
        }
        return next
      })

      if (isPlaying) {
        rafIdRef.current = requestAnimationFrame(step)
      }
    }

    rafIdRef.current = requestAnimationFrame(step)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      lastTimestampRef.current = null
    }
  }, [isPlaying, totalDuration, timeline?.playbackSpeed, playbackSpeed])

  // currentTime 변화에 따라 현재 씬 인덱스만 업데이트
  useEffect(() => {
    if (!timeline || timeline.scenes.length === 0) return
    if (totalDuration === 0) return
    // 수동 씬 선택 중이면 건너뛰기
    if (isManualSceneSelectRef.current) return

        let accumulated = 0
        let sceneIndex = 0
        for (let i = 0; i < timeline.scenes.length; i++) {
      const sceneDuration =
        timeline.scenes[i].duration + (timeline.scenes[i].transitionDuration || 0.5)
      accumulated += sceneDuration
      if (currentTime <= accumulated) {
            sceneIndex = i
            break
          }
        }
    
    // 씬 인덱스가 바뀌었을 때만 업데이트
    if (sceneIndex !== currentSceneIndex) {
      setCurrentSceneIndex(sceneIndex)
    }
  }, [currentTime, timeline, totalDuration, currentSceneIndex])

  // 씬 인덱스 변경 시 전환 효과 적용 (재생 중일 때만 애니메이션)
  useEffect(() => {
    if (!timeline || timeline.scenes.length === 0) return
    if (isManualSceneSelectRef.current) return
    
    const previousIndex = previousSceneIndexRef.current
    // 재생 중이고 씬이 바뀌면 전환 효과 적용
    if (isPlaying && previousIndex !== null && previousIndex !== currentSceneIndex) {
      updateCurrentScene(false) // 전환 효과 적용
    } else if (previousIndex !== currentSceneIndex) {
      updateCurrentScene(true) // 즉시 표시
    }
  }, [currentSceneIndex, isPlaying, timeline, updateCurrentScene])

  // 진행률 계산
  const progressRatio = useMemo(() => {
    if (totalDuration === 0) return 0
    return Math.min(1, currentTime / totalDuration)
  }, [totalDuration, currentTime])

  // 씬 편집 핸들러들
  const handleSceneScriptChange = (index: number, value: string) => {
    const updatedScenes = scenes.map((scene, i) =>
      i === index ? { ...scene, script: value } : scene
    )
    setScenes(updatedScenes)
    
    if (timeline) {
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, i) =>
          i === index ? { ...scene, text: { ...scene.text, content: value } } : scene
        ),
      }
      setTimeline(nextTimeline)
    }
  }

  const handleSceneDurationChange = (index: number, value: number) => {
    if (!timeline) return
    const clampedValue = Math.max(0.5, Math.min(10, value))
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) =>
        i === index ? { ...scene, duration: clampedValue } : scene
      ),
    }
    setTimeline(nextTimeline)
  }

  const handleSceneTransitionChange = (index: number, value: string) => {
    if (!timeline) return
    // 씬 선택 유지
    isManualSceneSelectRef.current = true
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) =>
        i === index ? { ...scene, transition: value } : scene
      ),
    }
    setTimeline(nextTimeline)
    
    // 전환 효과 미리보기 활성화 (PixiJS 캔버스 표시)
    setIsPreviewingTransition(true)
    
    // 효과 적용 후 미리보기 업데이트 - 애니메이션 포함
    requestAnimationFrame(() => {
      // 선택된 씬으로 이동하여 전환 효과 미리보기
      if (index !== currentSceneIndex) {
        setCurrentSceneIndex(index)
      }
      // 전환 효과 미리보기 (애니메이션 적용)
      updateCurrentScene(false)
      
      // 애니메이션 완료 후 미리보기 상태 해제
      const transitionDuration = timeline.scenes[index]?.transitionDuration || 0.5
      setTimeout(() => {
        setIsPreviewingTransition(false)
        isManualSceneSelectRef.current = false
      }, transitionDuration * 1000 + 200) // 전환 시간 + 여유시간
    })
  }

  const handleSceneImageFitChange = (index: number, value: 'cover' | 'contain' | 'fill') => {
    if (!timeline) return
    // 씬 선택 유지
    isManualSceneSelectRef.current = true
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) =>
        i === index ? { ...scene, imageFit: value } : scene
      ),
    }
    setTimeline(nextTimeline)
    // 이미지 fit 변경 시 해당 씬만 재로드
    if (pixiReady && appRef.current && containerRef.current) {
      loadAllScenes().then(() => {
        setTimeout(() => {
          isManualSceneSelectRef.current = false
        }, 50)
      })
    } else {
      setTimeout(() => {
        isManualSceneSelectRef.current = false
      }, 50)
    }
  }

  const handlePlaybackSpeedChange = (value: number) => {
    setPlaybackSpeed(value)
    if (timeline) {
      const nextTimeline: TimelineData = {
        ...timeline,
        playbackSpeed: value,
      }
      setTimeline(nextTimeline)
    }
  }

  // 편집 핸들 그리기
  const drawEditHandles = useCallback((sprite: PIXI.Sprite, sceneIndex: number, handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void, saveImageTransform: (sceneIndex: number, sprite: PIXI.Sprite) => void) => {
    if (useFabricEditing) return
    if (!containerRef.current || !sprite) return

    // 기존 핸들 제거
    const existingHandles = editHandlesRef.current.get(sceneIndex)
    if (existingHandles && existingHandles.parent) {
      existingHandles.parent.removeChild(existingHandles)
    }

    const handlesContainer = new PIXI.Container()
    handlesContainer.interactive = true

    // 스프라이트의 경계 박스 계산
    const bounds = sprite.getBounds()
    const handleSize = 20 // 핸들 크기 증가
    const handleColor = 0x8b5cf6 // 보라색
    const handleBorderColor = 0xffffff // 흰색 테두리

    // 8방향 핸들 위치
    const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' }> = [
      { x: bounds.x, y: bounds.y, type: 'nw' }, // 좌상
      { x: bounds.x + bounds.width / 2, y: bounds.y, type: 'n' }, // 상
      { x: bounds.x + bounds.width, y: bounds.y, type: 'ne' }, // 우상
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, type: 'e' }, // 우
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, type: 'se' }, // 우하
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, type: 's' }, // 하
      { x: bounds.x, y: bounds.y + bounds.height, type: 'sw' }, // 좌하
      { x: bounds.x, y: bounds.y + bounds.height / 2, type: 'w' }, // 좌
    ]

    handles.forEach((handle) => {
      const handleGraphics = new PIXI.Graphics()
      handleGraphics.beginFill(handleColor, 1)
      handleGraphics.lineStyle(2, handleBorderColor, 1)
      handleGraphics.drawRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
      handleGraphics.endFill()
      handleGraphics.x = handle.x
      handleGraphics.y = handle.y
      handleGraphics.interactive = true
      handleGraphics.cursor = 'pointer'
      handleGraphics.name = handle.type

      // 드래그 시작
      handleGraphics.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        isResizingRef.current = true
        resizeHandleRef.current = handle.type
        isFirstResizeMoveRef.current = true
        const sprite = spritesRef.current.get(sceneIndex)
        if (sprite && appRef.current) {
          // 리사이즈 시작 시 현재 스프라이트의 실제 bounds를 기준으로 설정
          // getBounds()를 사용하여 스케일과 앵커를 고려한 실제 위치와 크기를 가져옴
          const bounds = sprite.getBounds()
          const baseWidth = bounds.width / (sprite.scale.x || 1)
          const baseHeight = bounds.height / (sprite.scale.y || 1)
          // 스프라이트의 실제 width/height를 저장 (스케일 적용 전)
          originalTransformRef.current = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width, // getBounds()는 스케일이 적용된 크기
            height: bounds.height, // getBounds()는 스케일이 적용된 크기
            scaleX: sprite.scale.x,
            scaleY: sprite.scale.y,
            rotation: sprite.rotation,
            baseWidth,
            baseHeight,
          }
          // 핸들러 클릭 시점의 마우스 위치를 저장 (스테이지 좌표)
          resizeStartPosRef.current = {
            x: e.global.x,
            y: e.global.y,
          }
        }
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('image')
      })

      // 리사이즈 중 (전역 이벤트로 처리)
      const handleGlobalMove = (e: MouseEvent) => {
        if (isResizingRef.current && resizeHandleRef.current === handle.type && appRef.current && resizeStartPosRef.current) {
          // MouseEvent를 PixiJS 스테이지 좌표로 변환
          const canvas = appRef.current.canvas
          const rect = canvas.getBoundingClientRect()
          const scaleX = canvas.width / rect.width
          const scaleY = canvas.height / rect.height
          const globalPos = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
          }
          
          // 첫 번째 mousemove는 무시 (핸들러 클릭 시점의 위치와 동일하면 리사이즈 시작하지 않음)
          if (isFirstResizeMoveRef.current) {
            const dx = Math.abs(globalPos.x - resizeStartPosRef.current.x)
            const dy = Math.abs(globalPos.y - resizeStartPosRef.current.y)
            // 마우스가 최소 3픽셀 이상 이동했을 때만 리사이즈 시작
            if (dx < 3 && dy < 3) {
              return
            }
            isFirstResizeMoveRef.current = false
          }
          
          // PixiJS 이벤트처럼 변환
          const pixiEvent = {
            global: globalPos,
          } as PIXI.FederatedPointerEvent
          handleResize(pixiEvent, sceneIndex)
        }
      }

      const handleGlobalUp = () => {
        if (isResizingRef.current && resizeHandleRef.current === handle.type) {
          isResizingRef.current = false
          resizeHandleRef.current = null
          resizeStartPosRef.current = null
          isFirstResizeMoveRef.current = true
          // 리사이즈 종료 시 Transform 저장하지 않음 (편집 종료 시 저장)
          document.removeEventListener('mousemove', handleGlobalMove)
          document.removeEventListener('mouseup', handleGlobalUp)
        }
      }

      handleGraphics.on('pointerdown', () => {
        document.addEventListener('mousemove', handleGlobalMove)
        document.addEventListener('mouseup', handleGlobalUp)
      })

      handlesContainer.addChild(handleGraphics)
    })

    // 경계선 그리기
    const borderGraphics = new PIXI.Graphics()
    borderGraphics.lineStyle(2, handleColor, 1)
    borderGraphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
    handlesContainer.addChild(borderGraphics)

    containerRef.current.addChild(handlesContainer)
    editHandlesRef.current.set(sceneIndex, handlesContainer)
  }, []) // handleResize와 saveImageTransform은 파라미터로 받으므로 의존성 배열에 포함하지 않음

  // Transform 데이터 저장 (단일 씬)
  const saveImageTransform = useCallback((sceneIndex: number, sprite: PIXI.Sprite) => {
    if (!timeline || !sprite) return

    const transform = {
      x: sprite.x,
      y: sprite.y,
      width: sprite.width,
      height: sprite.height,
      scaleX: sprite.scale.x,
      scaleY: sprite.scale.y,
      rotation: sprite.rotation,
    }

    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) => {
        if (i === sceneIndex) {
          return {
            ...scene,
            imageTransform: transform,
          }
        }
        return scene
      }),
    }
    setTimeline(nextTimeline)
  }, [timeline, setTimeline])
  
  // 모든 Transform 데이터 일괄 저장
  const saveAllImageTransforms = useCallback((transforms: Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>) => {
    if (!timeline || transforms.size === 0) return

    // Transform 저장 중 플래그 설정 (loadAllScenes 재호출 방지)
    isSavingTransformRef.current = true

    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) => {
        if (transforms.has(i)) {
          const transform = transforms.get(i)!
          return {
            ...scene,
            imageTransform: transform,
          }
        }
        return scene
      }),
    }
    setTimeline(nextTimeline)
    
    // 모든 저장이 완료된 후 플래그 해제 (약간의 지연을 두어 timeline 업데이트가 완료되도록)
    setTimeout(() => {
      isSavingTransformRef.current = false
    }, 100)
  }, [timeline, setTimeline])

  // 리사이즈 핸들러
  const handleResize = useCallback((e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => {
    if (!isResizingRef.current || !resizeHandleRef.current || !originalTransformRef.current) return

    const sprite = spritesRef.current.get(sceneIndex)
    if (!sprite || !appRef.current) return

    // 마우스 좌표를 PixiJS 좌표로 변환
    let globalPos: { x: number; y: number }
    if (e instanceof MouseEvent) {
      // MouseEvent인 경우
      const canvas = appRef.current.canvas
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      globalPos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    } else {
      // PIXI.FederatedPointerEvent인 경우
      const pixiEvent = e as PIXI.FederatedPointerEvent
      globalPos = pixiEvent.global
    }

    const handleType = resizeHandleRef.current
    const original = originalTransformRef.current

    // 각 핸들 타입에 따라 크기와 위치 계산
    // 반대편 모서리/변을 기준으로 계산하여 예측 가능한 리사이즈 구현
    let newWidth = original.width
    let newHeight = original.height
    let newX = original.x
    let newY = original.y

    // 반대편 모서리/변의 위치 계산
    const rightEdge = original.x + original.width
    const bottomEdge = original.y + original.height

    switch (handleType) {
      case 'nw': // 좌상: 우하 모서리(rightEdge, bottomEdge)가 고정
        newWidth = rightEdge - globalPos.x
        newHeight = bottomEdge - globalPos.y
        newX = globalPos.x
        newY = globalPos.y
        break
      case 'n': // 상: 하단 변(bottomEdge)이 고정
        newHeight = bottomEdge - globalPos.y
        newY = globalPos.y
        // 너비와 X는 유지
        break
      case 'ne': // 우상: 좌하 모서리(original.x, bottomEdge)가 고정
        newWidth = globalPos.x - original.x
        newHeight = bottomEdge - globalPos.y
        newY = globalPos.y
        // X는 유지
        break
      case 'e': // 우: 좌측 변(original.x)이 고정
        newWidth = globalPos.x - original.x
        // 높이, X, Y는 유지
        break
      case 'se': // 우하: 좌상 모서리(original.x, original.y)가 고정
        newWidth = globalPos.x - original.x
        newHeight = globalPos.y - original.y
        // X, Y는 유지
        break
      case 's': // 하: 상단 변(original.y)이 고정
        newHeight = globalPos.y - original.y
        // 너비, X, Y는 유지
        break
      case 'sw': // 좌하: 우상 모서리(rightEdge, original.y)가 고정
        newWidth = rightEdge - globalPos.x
        newHeight = globalPos.y - original.y
        newX = globalPos.x
        // Y는 유지
        break
      case 'w': // 좌: 우측 변(rightEdge)이 고정
        newWidth = rightEdge - globalPos.x
        newX = globalPos.x
        // 높이와 Y는 유지
        break
    }

    // 최소 크기 제한
    const minSize = 50
    if (newWidth < minSize) {
      newWidth = minSize
      if (handleType === 'nw' || handleType === 'w' || handleType === 'sw') {
        newX = original.x + original.width - minSize
      }
    }
    if (newHeight < minSize) {
      newHeight = minSize
      if (handleType === 'nw' || handleType === 'n' || handleType === 'ne') {
        newY = original.y + original.height - minSize
      }
    }

    // 스프라이트 업데이트
    // baseWidth/baseHeight(스케일 적용 전 크기)를 기준으로 스케일 계산
    const baseWidth = original.baseWidth || original.width / (original.scaleX || 1)
    const baseHeight = original.baseHeight || original.height / (original.scaleY || 1)
    const scaleX = newWidth / baseWidth
    const scaleY = newHeight / baseHeight

    sprite.scale.set(scaleX, scaleY)
    sprite.x = newX
    sprite.y = newY

    // 핸들 위치 업데이트 (기존 핸들 컨테이너 업데이트)
    const existingHandles = editHandlesRef.current.get(sceneIndex)
    if (existingHandles && sprite) {
      const bounds = sprite.getBounds()
      // 핸들 위치 업데이트
      existingHandles.children.forEach((child, index) => {
        if (child instanceof PIXI.Graphics && child.name) {
          const handleType = child.name as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
          const handlePositions: Record<string, { x: number; y: number }> = {
            'nw': { x: bounds.x, y: bounds.y },
            'n': { x: bounds.x + bounds.width / 2, y: bounds.y },
            'ne': { x: bounds.x + bounds.width, y: bounds.y },
            'e': { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
            'se': { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            's': { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            'sw': { x: bounds.x, y: bounds.y + bounds.height },
            'w': { x: bounds.x, y: bounds.y + bounds.height / 2 },
          }
          const pos = handlePositions[handleType]
          if (pos) {
            child.x = pos.x
            child.y = pos.y
          }
        } else if (child instanceof PIXI.Graphics && index === existingHandles.children.length - 1) {
          // 마지막 자식은 경계선
          child.clear()
          child.lineStyle(2, 0x8b5cf6, 1)
          child.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
        }
      })
    }

    if (appRef.current) {
      appRef.current.render()
    }
  }, [])

  // 스프라이트 드래그 핸들러
  const setupSpriteDrag = useCallback((sprite: PIXI.Sprite, sceneIndex: number) => {
    if (!sprite) return

    // 기존 이벤트 리스너 제거
    sprite.off('pointerdown')
    sprite.off('pointermove')
    sprite.off('pointerup')
    sprite.off('pointerupoutside')

    sprite.interactive = true
    sprite.cursor = editMode === 'image' && !useFabricEditing ? 'move' : 'default'

    if (editMode === 'image' && !useFabricEditing) {
      sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        isDraggingRef.current = true
        const globalPos = e.global
        dragStartPosRef.current = {
          x: globalPos.x - sprite.x,
          y: globalPos.y - sprite.y,
        }
        // 편집 시작 시 원래 Transform 저장 (취소 시 복원용)
        if (!originalSpriteTransformRef.current.has(sceneIndex)) {
          const scene = timeline?.scenes[sceneIndex]
          if (scene?.imageTransform) {
            originalSpriteTransformRef.current.set(sceneIndex, scene.imageTransform)
          } else {
            originalSpriteTransformRef.current.set(sceneIndex, {
              x: sprite.x,
              y: sprite.y,
              width: sprite.width,
              height: sprite.height,
              scaleX: sprite.scale.x,
              scaleY: sprite.scale.y,
              rotation: sprite.rotation,
            })
          }
        }
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('image')
        drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)
      })

      sprite.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
        if (isDraggingRef.current && !isResizingRef.current) {
          const globalPos = e.global
          sprite.x = globalPos.x - dragStartPosRef.current.x
          sprite.y = globalPos.y - dragStartPosRef.current.y
          if (appRef.current) {
            appRef.current.render()
          }
          // 핸들 위치 업데이트
          drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)
        }
      })

      sprite.on('pointerup', () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false
          // 드래그 종료 시 Transform 저장하지 않음 (편집 종료 시 저장)
        }
      })

      sprite.on('pointerupoutside', () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false
          // 드래그 종료 시 Transform 저장하지 않음 (편집 종료 시 저장)
        }
      })
    }
  }, [editMode, drawEditHandles, saveImageTransform, handleResize, timeline])

  // Transform 데이터 적용
  // 주의: sprite.width/height 설정 시 PixiJS가 내부적으로 scale을 계산하므로
  // scale.set()을 별도로 호출하면 안됨
  const applyImageTransform = useCallback((sprite: PIXI.Sprite, transform?: TimelineScene['imageTransform']) => {
    if (!transform || !sprite) return

    sprite.x = transform.x
    sprite.y = transform.y
    sprite.width = transform.width
    sprite.height = transform.height
    // scale.set() 호출 제거 - width/height에 이미 스케일이 적용된 크기가 저장됨
    sprite.rotation = transform.rotation
  }, [])

  // 텍스트 Transform 데이터 저장
  const saveTextTransform = useCallback((sceneIndex: number, text: PIXI.Text) => {
    if (!timeline || !text) return

    const transform = {
      x: text.x,
      y: text.y,
      width: text.width * text.scale.x,
      height: text.height * text.scale.y,
      scaleX: text.scale.x,
      scaleY: text.scale.y,
      rotation: text.rotation,
    }

    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) => {
        if (i === sceneIndex) {
          return {
            ...scene,
            text: {
              ...scene.text,
              transform,
            },
          }
        }
        return scene
      }),
    }
    setTimeline(nextTimeline)
  }, [timeline, setTimeline])

  // 텍스트 Transform 데이터 적용
  const applyTextTransform = useCallback((text: PIXI.Text, transform?: TimelineScene['text']['transform']) => {
    if (!transform || !text) return

    text.x = transform.x
    text.y = transform.y
    text.scale.set(transform.scaleX, transform.scaleY)
    text.rotation = transform.rotation
  }, [])

  // 텍스트 리사이즈 핸들러 (이미지 리사이즈 로직 재사용)
  const handleTextResize = useCallback((e: PIXI.FederatedPointerEvent | MouseEvent, sceneIndex: number) => {
    if (!isResizingTextRef.current || !resizeHandleRef.current || !originalTransformRef.current) return

    const text = textsRef.current.get(sceneIndex)
    if (!text || !appRef.current) return

    // 마우스 좌표를 PixiJS 좌표로 변환
    let globalPos: { x: number; y: number }
    if (e instanceof MouseEvent) {
      const canvas = appRef.current.canvas
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      globalPos = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    } else {
      const pixiEvent = e as PIXI.FederatedPointerEvent
      globalPos = pixiEvent.global
    }

    const handleType = resizeHandleRef.current
    const original = originalTransformRef.current

    // 이미지 리사이즈와 동일한 계산 로직 사용
    let newWidth = original.width
    let newHeight = original.height
    let newX = original.x
    let newY = original.y

    const rightEdge = original.x + original.width
    const bottomEdge = original.y + original.height

    switch (handleType) {
      case 'nw':
        newWidth = rightEdge - globalPos.x
        newHeight = bottomEdge - globalPos.y
        newX = globalPos.x
        newY = globalPos.y
        break
      case 'n':
        newHeight = bottomEdge - globalPos.y
        newY = globalPos.y
        break
      case 'ne':
        newWidth = globalPos.x - original.x
        newHeight = bottomEdge - globalPos.y
        newY = globalPos.y
        break
      case 'e':
        newWidth = globalPos.x - original.x
        break
      case 'se':
        newWidth = globalPos.x - original.x
        newHeight = globalPos.y - original.y
        break
      case 's':
        newHeight = globalPos.y - original.y
        break
      case 'sw':
        newWidth = rightEdge - globalPos.x
        newHeight = globalPos.y - original.y
        newX = globalPos.x
        break
      case 'w':
        newWidth = rightEdge - globalPos.x
        newX = globalPos.x
        break
    }

    // 최소 크기 제한
    const minSize = 20
    if (newWidth < minSize) {
      newWidth = minSize
      if (handleType === 'nw' || handleType === 'w' || handleType === 'sw') {
        newX = original.x + original.width - minSize
      }
    }
    if (newHeight < minSize) {
      newHeight = minSize
      if (handleType === 'nw' || handleType === 'n' || handleType === 'ne') {
        newY = original.y + original.height - minSize
      }
    }

    // 텍스트는 scale을 사용하고 anchor가 0.5, 0.5이므로 중심점으로 변환
    // baseWidth/baseHeight(스케일 적용 전 크기)를 기준으로 스케일 계산
    const baseWidth = original.baseWidth || original.width / (original.scaleX || 1)
    const baseHeight = original.baseHeight || original.height / (original.scaleY || 1)
    const scaleX = newWidth / baseWidth
    const scaleY = newHeight / baseHeight
    const centerX = newX + newWidth / 2
    const centerY = newY + newHeight / 2
    
    text.scale.set(scaleX, scaleY)
    text.x = centerX
    text.y = centerY

    // 핸들 위치 업데이트
    const existingHandles = textEditHandlesRef.current.get(sceneIndex)
    if (existingHandles && text) {
      const bounds = text.getBounds()
      existingHandles.children.forEach((child, index) => {
        if (child instanceof PIXI.Graphics && child.name) {
          const handleType = child.name as 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w'
          const handlePositions: Record<string, { x: number; y: number }> = {
            'nw': { x: bounds.x, y: bounds.y },
            'n': { x: bounds.x + bounds.width / 2, y: bounds.y },
            'ne': { x: bounds.x + bounds.width, y: bounds.y },
            'e': { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
            'se': { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
            's': { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
            'sw': { x: bounds.x, y: bounds.y + bounds.height },
            'w': { x: bounds.x, y: bounds.y + bounds.height / 2 },
          }
          const pos = handlePositions[handleType]
          if (pos) {
            child.x = pos.x
            child.y = pos.y
          }
        }
      })
    }

    if (appRef.current) {
      appRef.current.render()
    }
  }, [])

  // 텍스트 편집 핸들 그리기
  const drawTextEditHandles = useCallback((text: PIXI.Text, sceneIndex: number, handleResize: (e: PIXI.FederatedPointerEvent, sceneIndex: number) => void, saveTextTransform: (sceneIndex: number, text: PIXI.Text) => void) => {
    if (useFabricEditing) return
    if (!containerRef.current || !text) return

    // 기존 핸들 제거
    const existingHandles = textEditHandlesRef.current.get(sceneIndex)
    if (existingHandles && existingHandles.parent) {
      existingHandles.parent.removeChild(existingHandles)
    }

    const handlesContainer = new PIXI.Container()
    handlesContainer.interactive = true

    const bounds = text.getBounds()
    const handleSize = 16
    const handleColor = 0x8b5cf6
    const handleBorderColor = 0xffffff

    const handles: Array<{ x: number; y: number; type: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' }> = [
      { x: bounds.x, y: bounds.y, type: 'nw' },
      { x: bounds.x + bounds.width / 2, y: bounds.y, type: 'n' },
      { x: bounds.x + bounds.width, y: bounds.y, type: 'ne' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2, type: 'e' },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height, type: 'se' },
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height, type: 's' },
      { x: bounds.x, y: bounds.y + bounds.height, type: 'sw' },
      { x: bounds.x, y: bounds.y + bounds.height / 2, type: 'w' },
    ]

    handles.forEach((handle) => {
      const handleGraphics = new PIXI.Graphics()
      handleGraphics.beginFill(handleColor, 1)
      handleGraphics.lineStyle(2, handleBorderColor, 1)
      handleGraphics.drawRect(-handleSize / 2, -handleSize / 2, handleSize, handleSize)
      handleGraphics.endFill()
      handleGraphics.x = handle.x
      handleGraphics.y = handle.y
      handleGraphics.interactive = true
      handleGraphics.cursor = 'pointer'
      handleGraphics.name = handle.type

      handleGraphics.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        isResizingTextRef.current = true
        resizeHandleRef.current = handle.type
        isFirstResizeMoveRef.current = true
        const text = textsRef.current.get(sceneIndex)
        if (text && appRef.current) {
          // 텍스트의 현재 bounds를 가져와서 리사이즈 시작점으로 사용
          const bounds = text.getBounds()
          const baseWidth = bounds.width / (text.scale.x || 1)
          const baseHeight = bounds.height / (text.scale.y || 1)
          
          // originalTransformRef에 현재 bounds 저장 (리사이즈 계산용)
          originalTransformRef.current = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            scaleX: text.scale.x,
            scaleY: text.scale.y,
            rotation: text.rotation,
            baseWidth,
            baseHeight,
          }
          // 핸들러 클릭 시점의 마우스 위치를 저장 (스테이지 좌표)
          resizeStartPosRef.current = {
            x: e.global.x,
            y: e.global.y,
          }
        }
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('text')
      })

      const handleGlobalMove = (e: MouseEvent) => {
        if (isResizingTextRef.current && resizeHandleRef.current === handle.type && appRef.current && resizeStartPosRef.current) {
          const canvas = appRef.current.canvas
          const rect = canvas.getBoundingClientRect()
          const scaleX = canvas.width / rect.width
          const scaleY = canvas.height / rect.height
          const globalPos = {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
          }
          
          // 첫 번째 mousemove는 무시 (핸들러 클릭 시점의 위치와 동일하면 리사이즈 시작하지 않음)
          if (isFirstResizeMoveRef.current) {
            const dx = Math.abs(globalPos.x - resizeStartPosRef.current.x)
            const dy = Math.abs(globalPos.y - resizeStartPosRef.current.y)
            // 마우스가 최소 3픽셀 이상 이동했을 때만 리사이즈 시작
            if (dx < 3 && dy < 3) {
              return
            }
            isFirstResizeMoveRef.current = false
          }
          
          const pixiEvent = {
            global: globalPos,
          } as PIXI.FederatedPointerEvent
          handleTextResize(pixiEvent, sceneIndex)
        }
      }

      const handleGlobalUp = () => {
        if (isResizingTextRef.current && resizeHandleRef.current === handle.type) {
          isResizingTextRef.current = false
          resizeHandleRef.current = null
          resizeStartPosRef.current = null
          isFirstResizeMoveRef.current = true
          document.removeEventListener('mousemove', handleGlobalMove)
          document.removeEventListener('mouseup', handleGlobalUp)
        }
      }

      handleGraphics.on('pointerdown', () => {
        document.addEventListener('mousemove', handleGlobalMove)
        document.addEventListener('mouseup', handleGlobalUp)
      })

      handlesContainer.addChild(handleGraphics)
    })

    // 경계선 그리기
    const borderGraphics = new PIXI.Graphics()
    borderGraphics.lineStyle(2, handleColor, 1)
    borderGraphics.drawRect(bounds.x, bounds.y, bounds.width, bounds.height)
    handlesContainer.addChild(borderGraphics)

    containerRef.current.addChild(handlesContainer)
    textEditHandlesRef.current.set(sceneIndex, handlesContainer)
  }, [timeline])

  // 텍스트 드래그 설정
  const setupTextDrag = useCallback((text: PIXI.Text, sceneIndex: number) => {
    if (!text) return

    text.off('pointerdown')
    text.off('pointermove')
    text.off('pointerup')
    text.off('pointerupoutside')

    text.interactive = true
    text.cursor = editMode === 'text' && !useFabricEditing ? 'move' : 'default'

    if (editMode === 'text' && !useFabricEditing) {
      text.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        isDraggingRef.current = true
        const globalPos = e.global
        // 텍스트의 bounds를 기준으로 드래그 시작 위치 계산
        // anchor가 0.5, 0.5이므로 bounds의 좌상단 모서리를 기준으로 계산
        const bounds = text.getBounds()
        // 드래그 시작 시점의 bounds 크기를 저장 (드래그 중 크기 변경 방지)
        dragStartPosRef.current = {
          x: globalPos.x - bounds.x,
          y: globalPos.y - bounds.y,
          boundsWidth: bounds.width,
          boundsHeight: bounds.height,
        }
        // 편집 시작 시 원래 Transform 저장 (취소 시 복원용)
        if (!originalTextTransformRef.current.has(sceneIndex)) {
          const scene = timeline?.scenes[sceneIndex]
          if (scene?.text?.transform) {
            // transform에 scaleX, scaleY가 없으면 기본값 사용
            const transform = scene.text.transform
            originalTextTransformRef.current.set(sceneIndex, {
              ...transform,
              scaleX: transform.scaleX ?? 1,
              scaleY: transform.scaleY ?? 1,
            })
          } else {
            originalTextTransformRef.current.set(sceneIndex, {
              x: text.x,
              y: text.y,
              width: text.width * text.scale.x,
              height: text.height * text.scale.y,
              scaleX: text.scale.x,
              scaleY: text.scale.y,
              rotation: text.rotation,
            })
          }
        }
        setSelectedElementIndex(sceneIndex)
        setSelectedElementType('text')
        drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)
      })

      text.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
        if (isDraggingRef.current && !isResizingTextRef.current) {
          const globalPos = e.global
          // bounds의 좌상단 모서리를 기준으로 새 위치 계산
          const newBoundsX = globalPos.x - dragStartPosRef.current.x
          const newBoundsY = globalPos.y - dragStartPosRef.current.y
          // 텍스트의 anchor가 0.5, 0.5이므로 중심점으로 변환
          // 드래그 시작 시 저장한 bounds 크기를 사용 (드래그 중 크기 변경 방지)
          const centerX = newBoundsX + (dragStartPosRef.current.boundsWidth || 0) / 2
          const centerY = newBoundsY + (dragStartPosRef.current.boundsHeight || 0) / 2
          text.x = centerX
          text.y = centerY
          if (appRef.current) {
            appRef.current.render()
          }
          // 핸들 위치 업데이트
          drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)
        }
      })

      text.on('pointerup', () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false
        }
      })

      text.on('pointerupoutside', () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false
        }
      })
    }
  }, [editMode, drawTextEditHandles, saveTextTransform, handleTextResize, timeline])

  // 편집 모드 변경 시 핸들 표시/숨김
  useEffect(() => {
    if (!containerRef.current || !timeline) return

    // 편집 모드가 종료되면 핸들 제거
    if (editMode === 'none') {
      editHandlesRef.current.forEach((handles, index) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      editHandlesRef.current.clear()
      textEditHandlesRef.current.forEach((handles, index) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      textEditHandlesRef.current.clear()
      setSelectedElementIndex(null)
      setSelectedElementType(null)
    } else if (editMode === 'image' && selectedElementIndex !== null && selectedElementType === 'image') {
      // 선택된 이미지 요소가 있으면 핸들 표시
      const sprite = spritesRef.current.get(selectedElementIndex)
      if (sprite) {
        drawEditHandles(sprite, selectedElementIndex, handleResize, saveImageTransform)
        setupSpriteDrag(sprite, selectedElementIndex)
      }
    } else if (editMode === 'text' && selectedElementIndex !== null && selectedElementType === 'text') {
      // 선택된 텍스트 요소가 있으면 핸들 표시
      const text = textsRef.current.get(selectedElementIndex)
      if (text) {
        drawTextEditHandles(text, selectedElementIndex, handleTextResize, saveTextTransform)
        setupTextDrag(text, selectedElementIndex)
      }
    }

    // 모든 스프라이트에 드래그 설정 적용
    spritesRef.current.forEach((sprite, index) => {
      setupSpriteDrag(sprite, index)
    })
    
    // 모든 텍스트에 드래그 설정 적용
    textsRef.current.forEach((text, index) => {
      setupTextDrag(text, index)
    })

    if (appRef.current) {
      appRef.current.render()
    }
  }, [editMode, selectedElementIndex, selectedElementType, timeline, drawEditHandles, setupSpriteDrag, handleResize, saveImageTransform, drawTextEditHandles, setupTextDrag, handleTextResize, saveTextTransform])

  // 격자 그리기 함수 (이미지/자막 배치 가이드)
  const drawGrid = useCallback(() => {
    if (!appRef.current) {
      console.log('drawGrid: appRef.current is null')
      return
    }

    // 기존 격자 제거
    if (gridGraphicsRef.current && gridGraphicsRef.current.parent) {
      gridGraphicsRef.current.parent.removeChild(gridGraphicsRef.current)
      gridGraphicsRef.current.destroy()
      gridGraphicsRef.current = null
    }

    if (!showGrid) {
      console.log('drawGrid: showGrid is false, skipping')
      return
    }

    const { width, height } = stageDimensions
    console.log('drawGrid: Drawing grid with dimensions:', width, height)
    const gridGraphics = new PIXI.Graphics()
    
    // 격자 색상 설정
    const lineColor = 0xffffff
    const lineAlpha = 0.6
    const lineWidth = 2
    const areaAlpha = 0.1

    // 이미지 영역: 상단 15%부터 시작, 높이 70% (하단 15% 여백)
    const imageAreaY = height * 0.15
    const imageAreaHeight = height * 0.7
    
    // 자막 영역: 하단에서 약 8% 위에 위치, 높이 7%
    const textAreaY = height * 0.92
    const textAreaHeight = height * 0.07
    const textAreaWidth = width * 0.75
    const textAreaX = width * 0.5 - textAreaWidth / 2

    // 이미지 영역 배경 (반투명)
    gridGraphics.beginFill(0x00ff00, areaAlpha) // 초록색 반투명
    gridGraphics.drawRect(0, imageAreaY, width, imageAreaHeight)
    gridGraphics.endFill()

    // 이미지 영역 테두리
    gridGraphics.lineStyle(lineWidth, 0x00ff00, lineAlpha) // 초록색
    gridGraphics.drawRect(0, imageAreaY, width, imageAreaHeight)

    // 자막 영역 배경 (반투명)
    gridGraphics.beginFill(0x0000ff, areaAlpha) // 파란색 반투명
    gridGraphics.drawRect(textAreaX, textAreaY - textAreaHeight / 2, textAreaWidth, textAreaHeight)
    gridGraphics.endFill()

    // 자막 영역 테두리
    gridGraphics.lineStyle(lineWidth, 0x0000ff, lineAlpha) // 파란색
    gridGraphics.drawRect(textAreaX, textAreaY - textAreaHeight / 2, textAreaWidth, textAreaHeight)

    // 3x3 격자선 (Rule of Thirds) - 흰색
    gridGraphics.lineStyle(1, lineColor, lineAlpha * 0.5)
    // 수직선 2개 (1/3, 2/3 위치)
    gridGraphics.moveTo(width / 3, 0)
    gridGraphics.lineTo(width / 3, height)
    gridGraphics.moveTo(width * 2 / 3, 0)
    gridGraphics.lineTo(width * 2 / 3, height)
    // 수평선 2개 (1/3, 2/3 위치)
    gridGraphics.moveTo(0, height / 3)
    gridGraphics.lineTo(width, height / 3)
    gridGraphics.moveTo(0, height * 2 / 3)
    gridGraphics.lineTo(width, height * 2 / 3)

    // 중앙선 (가로, 세로)
    gridGraphics.moveTo(0, height / 2)
    gridGraphics.lineTo(width, height / 2)
    gridGraphics.moveTo(width / 2, 0)
    gridGraphics.lineTo(width / 2, height)

    // 격자를 stage에 직접 추가하여 항상 최상위에 표시
    appRef.current.stage.addChild(gridGraphics)
    gridGraphicsRef.current = gridGraphics
    console.log('drawGrid: Grid added to stage, children count:', appRef.current.stage.children.length)

    if (appRef.current) {
      appRef.current.render()
    }
  }, [showGrid, stageDimensions])

  // 격자 표시/숨김
  useEffect(() => {
    if (!pixiReady) return
    drawGrid()
  }, [showGrid, pixiReady, drawGrid])

  // loadAllScenes 후 격자 다시 그리기
  useEffect(() => {
    if (!pixiReady || !showGrid) return
    // loadAllScenes가 완료된 후 격자를 다시 그리기 위해 약간의 지연
    const timer = setTimeout(() => {
      drawGrid()
    }, 100)
    return () => clearTimeout(timer)
  }, [pixiReady, timeline?.scenes.length, showGrid, drawGrid])

  // 고급 효과 핸들러
  const handleAdvancedEffectChange = (
    sceneIndex: number,
    effectType: 'glow' | 'particles' | 'glitch',
    value: any
  ) => {
    if (!timeline) return
    
    isManualSceneSelectRef.current = true
    const currentScene = timeline.scenes[sceneIndex]
    const currentEffects = currentScene.advancedEffects || {}
    
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) => {
        if (i === sceneIndex) {
          return {
            ...scene,
            advancedEffects: {
              ...currentEffects,
              [effectType]: value,
            },
          }
        }
        return scene
      }),
    }
    setTimeline(nextTimeline)
    
    // 효과 적용
    requestAnimationFrame(() => {
      const sprite = spritesRef.current.get(sceneIndex)
      if (sprite) {
        applyAdvancedEffects(sprite, sceneIndex, nextTimeline.scenes[sceneIndex].advancedEffects)
      }
      updateCurrentScene()
      setTimeout(() => {
        isManualSceneSelectRef.current = false
      }, 50)
    })
  }

  // 타임라인 드래그
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline) return
    if (isPlaying) setIsPlaying(false)
    setIsDraggingTimeline(true)
    handleTimelineClick(e)
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline || !timelineBarRef.current) return
    
    const rect = timelineBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const ratio = Math.max(0, Math.min(1, clickX / rect.width))
    
    if (isPlaying) setIsPlaying(false)
    
    const totalDuration = timeline.scenes.reduce(
      (acc, scene) => acc + scene.duration + (scene.transitionDuration || 0.5),
      0
    )
    const targetTime = ratio * totalDuration
    setCurrentTime(targetTime)
    
    let accumulated = 0
    let sceneIndex = 0
    for (let i = 0; i < timeline.scenes.length; i++) {
      const sceneDuration = timeline.scenes[i].duration + (timeline.scenes[i].transitionDuration || 0.5)
      accumulated += sceneDuration
      if (targetTime <= accumulated) {
        sceneIndex = i
        break
      }
    }
    setCurrentSceneIndex(sceneIndex)
    updateCurrentScene()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingTimeline || !timeline || !timelineBarRef.current) return
      
      const rect = timelineBarRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const ratio = Math.max(0, Math.min(1, mouseX / rect.width))
      
      const totalDuration = timeline.scenes.reduce(
        (acc, scene) => acc + scene.duration + (scene.transitionDuration || 0.5),
        0
      )
      const targetTime = ratio * totalDuration
      setCurrentTime(targetTime)
      
      let accumulated = 0
      let sceneIndex = 0
      for (let i = 0; i < timeline.scenes.length; i++) {
        const sceneDuration = timeline.scenes[i].duration + (timeline.scenes[i].transitionDuration || 0.5)
        accumulated += sceneDuration
        if (targetTime <= accumulated) {
          sceneIndex = i
          break
        }
      }
      setCurrentSceneIndex(sceneIndex)
      updateCurrentScene()
    }

    const handleMouseUp = () => {
      setIsDraggingTimeline(false)
    }

    if (isDraggingTimeline) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingTimeline, timeline, updateCurrentScene])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 전환 효과 한글 매핑
  const transitionLabels: Record<string, string> = {
    'fade': '페이드',
    'slide-left': '슬라이드 좌',
    'slide-right': '슬라이드 우',
    'slide-up': '슬라이드 상',
    'slide-down': '슬라이드 하',
    'zoom-in': '확대',
    'zoom-out': '축소',
    'rotate': '회전',
    'blur': '블러',
    'glitch': '글리치',
    'ripple': '물결',
    'circle': '원형',
  }

  // 모든 전환 효과 옵션
  const allTransitions = [
    { value: 'fade', label: '페이드' },
    { value: 'slide-left', label: '슬라이드 좌' },
    { value: 'slide-right', label: '슬라이드 우' },
    { value: 'slide-up', label: '슬라이드 상' },
    { value: 'slide-down', label: '슬라이드 하' },
    { value: 'zoom-in', label: '확대' },
    { value: 'zoom-out', label: '축소' },
    { value: 'rotate', label: '회전' },
    { value: 'blur', label: '블러' },
    { value: 'glitch', label: '글리치' },
    { value: 'ripple', label: '물결' },
    { value: 'circle', label: '원형' },
  ]

  // 서버 전송
  const handleExport = async () => {
    if (!timeline) {
      alert('타임라인 데이터가 없습니다.')
      return
    }

    try {
      // TimelineData를 JSON으로 직렬화
      const exportData = {
        ...timeline,
        globalSettings: {
          bgmTemplate,
          transitionTemplate,
          voiceTemplate,
          subtitlePosition,
          subtitleFont,
          subtitleColor,
        },
      }

      console.log('Exporting timeline data:', exportData)

      // API 엔드포인트로 전송
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || '영상 생성 실패')
      }

      const result = await response.json()
      alert('영상 생성이 시작되었습니다. 완료되면 알림을 받으실 수 있습니다.')
      
      // 성공 시 다음 단계로 이동하거나 결과 페이지로 이동
      // router.push(`/video/create/result?id=${result.videoId}`)
    } catch (error) {
      console.error('Export error:', error)
      alert(`영상 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const sceneThumbnails = useMemo(
    () => scenes.map((scene, index) => scene.imageUrl || selectedImages[index] || ''),
    [scenes, selectedImages]
  )

  if (!mounted) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-screen overflow-hidden"
    >
      <StepIndicator />
      <div className="flex-1 flex overflow-hidden h-full">
        {/* 왼쪽 패널: 미리보기 + 타임라인 */}
        <div className="w-[30%] border-r flex flex-col h-full overflow-hidden" style={{
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          backgroundColor: theme === 'dark' ? '#111827' : '#ffffff'
        }}>
          <div className="p-4 border-b shrink-0 flex items-center" style={{
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            minHeight: '64px',
            marginTop: '7px', // 씬 리스트와 상단선 맞춤을 위해 미세 조정
          }}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold" style={{
                color: theme === 'dark' ? '#ffffff' : '#111827'
              }}>
                미리보기
              </h2>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
            {/* PixiJS 미리보기 - 9:16 비율 고정 (1080x1920) */}
            <div 
              className="flex-1 flex items-center justify-center rounded-lg overflow-hidden min-h-0"
              onClick={(e) => {
                // 편집 모드일 때 캔버스 배경 클릭 시 선택만 해제 (편집 모드는 유지)
                if (editMode === 'image' && e.target === e.currentTarget) {
                  setSelectedElementIndex(null)
                  setSelectedElementType(null)
                }
              }}
            >
              <div
                ref={pixiContainerRef}
                className="relative bg-black"
                style={{ 
                  aspectRatio: '9 / 16',
                  height: '100%',
                  maxHeight: '100%',
                }}
              >
                {/* 격자 오버레이 (크기 조정하기 템플릿 가이드) */}
                {showGrid && (
                  <div 
                    className="absolute inset-0 pointer-events-none z-50"
                    style={{ aspectRatio: '9 / 16' }}
                  >
                    {/* 이미지 추천 영역 (녹색) - 상단 15%부터 70% 높이 */}
                    <div 
                      className="absolute border-2 border-green-500"
                      style={{
                        top: '15%',
                        left: '0',
                        right: '0',
                        height: '70%',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      }}
                    >
                      <span className="absolute top-1 left-1 text-xs text-green-400 bg-black/50 px-1 rounded">
                        이미지 영역
                      </span>
                    </div>
                    
                    {/* 텍스트 추천 영역 (파란색) - 하단 중앙, 75% 너비 */}
                    <div 
                      className="absolute border-2 border-blue-500"
                      style={{
                        top: '88.5%',
                        left: '12.5%',
                        width: '75%',
                        height: '7%',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      }}
                    >
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-blue-400 bg-black/50 px-1 rounded whitespace-nowrap">
                        자막 영역
                      </span>
                    </div>
                    
                    {/* 3x3 격자선 (Rule of Thirds) */}
                    <div className="absolute inset-0">
                      {/* 수직선 */}
                      <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/30" />
                      <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/30" />
                      {/* 수평선 */}
                      <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
                      <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />
                      {/* 중심선 */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/50" />
                      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/50" />
                    </div>
                  </div>
                )}
              </div>
                      </div>

            {/* 재생 컨트롤 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs" style={{
                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
              }}>
                <span>
                  {(() => {
                    const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
                    const actualTime = currentTime / speed
                    return formatTime(actualTime)
                  })()}
                </span>
                <span>
                  {(() => {
                    const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
                    const actualDuration = totalDuration / speed
                    return formatTime(actualDuration)
                  })()}
                </span>
                        </div>
              
                        <div
                          ref={timelineBarRef}
                className="w-full h-2 rounded-full cursor-pointer relative"
                style={{
                  backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                }}
                          onMouseDown={handleTimelineMouseDown}
                        >
                          <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressRatio * 100}%`,
                    backgroundColor: '#8b5cf6'
                  }}
                />
                        </div>

              <div className="flex items-center gap-2">
                        <Button
                          onClick={handlePlayPause}
                          variant="outline"
                          size="sm"
                  className="flex-1"
                        >
                          {isPlaying ? (
                            <>
                      <Pause className="w-4 h-4 mr-2" />
                              일시정지
                            </>
                          ) : (
                            <>
                      <Play className="w-4 h-4 mr-2" />
                              재생
                            </>
                          )}
                        </Button>
                        <Button
                  onClick={handleExport}
                          size="sm"
                  className="flex-1"
                        >
                  내보내기
                        </Button>
                      </div>
              
              {/* 배속 선택 */}
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  배속:
                </label>
                <select
                  value={(() => {
                    const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
                    // 숫자를 문자열로 변환하되, 정수는 정수로, 소수는 소수로
                    if (speed === 1 || speed === 1.0) return "1"
                    if (speed === 2 || speed === 2.0) return "2"
                    return String(speed)
                  })()}
                  onChange={(e) => handlePlaybackSpeedChange(parseFloat(e.target.value))}
                  className="flex-1 px-2 py-1 rounded border text-xs"
                  style={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }}
                >
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
                <span className="text-xs" style={{
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}>
                  {(() => {
                    const speed = timeline?.playbackSpeed || playbackSpeed || 1.0
                    const totalTime = totalDuration / speed
                    return `실제 재생: ${formatTime(totalTime)}`
                  })()}
                </span>
                    </div>
              </div>

            {/* 선택된 애셋 정보 */}
            {timeline && timeline.scenes[currentSceneIndex] && (
              <div className="p-3 rounded-lg border text-sm" style={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
                borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                color: theme === 'dark' ? '#d1d5db' : '#374151'
              }}>
                <div className="font-semibold mb-2">선택된 애셋</div>
                <div className="space-y-1 text-xs">
                  <div>씬: {currentSceneIndex + 1}</div>
                  <div>이미지: {timeline.scenes[currentSceneIndex].imageFit || 'fill'}</div>
                  <div>텍스트: {timeline.scenes[currentSceneIndex].text.content.substring(0, 30)}...</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 중앙 패널: 씬 리스트 */}
        <div className="w-[40%] border-r flex flex-col h-full overflow-hidden" style={{
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          backgroundColor: theme === 'dark' ? '#111827' : '#ffffff'
        }}>
          <div className="p-4 border-b shrink-0 flex items-center" style={{
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            minHeight: '64px',
            marginTop: '2px', // 씬 리스트와 상단선 맞춤을 위해 미세 조정
          }}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold" style={{
                color: theme === 'dark' ? '#ffffff' : '#111827'
              }}>
                씬 리스트
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowGrid(!showGrid)}
                  variant={showGrid ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                >
                  <Grid3x3 className="w-3 h-3 mr-1" />
                  격자
                </Button>
                <Button
                  onClick={() => {
                    if (!timeline || scenes.length === 0) return
                    
                    // 쇼츠용 추천 템플릿 적용
                    const { width, height } = stageDimensions
                    
                    // 모든 씬에 템플릿 적용
                    const updatedScenes = timeline.scenes.map((scene) => {
                      // 이미지 Transform: 상단 15%부터 시작, 가로 100%, 높이 70% (하단 15% 여백)
                      // contain 모드로 이미지 비율 유지하면서 영역 내에 맞춤
                      const imageTransform = {
                        x: 0, // 왼쪽 끝 (0%)
                        y: height * 0.15, // 상단에서 15% 위치
                        width: width, // 전체 너비 (100%)
                        height: height * 0.7, // 높이의 70% (상단 15% + 이미지 70% + 하단 15% = 100%)
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                      }
                      
                      // 텍스트 Transform: 하단 중앙 위치 (비율 기반)
                      // 텍스트는 하단에서 약 8% 위에 위치, 너비는 75%
                      const textY = height * 0.92 // 하단에서 8% 위 (92% 위치)
                      const textWidth = width * 0.75 // 화면 너비의 75%
                      const textHeight = height * 0.07 // 화면 높이의 7%
                      
                      const textTransform = {
                        x: width * 0.5, // 중앙 (50%)
                        y: textY,
                        width: textWidth,
                        height: textHeight,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                      }
                      
                      return {
                        ...scene,
                        imageFit: 'contain' as const, // 이미지 비율 유지하면서 영역 내에 맞춤
                        imageTransform,
                        text: {
                          ...scene.text,
                          position: 'bottom',
                          color: '#ffffff',
                          fontSize: 48,
                          font: 'Arial',
                          transform: textTransform,
                          style: {
                            bold: true,
                            italic: false,
                            underline: false,
                            align: 'center' as const,
                          },
                        },
                      }
                    })
                    
                    const nextTimeline: TimelineData = {
                      ...timeline,
                      scenes: updatedScenes,
                    }
                    
                    setTimeline(nextTimeline)
                    
                    // 모든 씬을 다시 로드하여 Transform 적용
                    setTimeout(() => {
                      loadAllScenes()
                    }, 100)
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  크기 조정하기
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    {scenes.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{
                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
              }}>
                        Step3에서 이미지와 스크립트를 먼저 생성해주세요.
              </div>
                    ) : (
              <div className="space-y-3">
                        {scenes.map((scene, index) => {
                          const isActive = currentSceneIndex === index
                  const sceneData = timeline?.scenes[index]
                  
                          return (
                            <div
                              key={scene.sceneId ?? index}
                      className="rounded-lg border p-3 cursor-pointer transition-colors"
                      style={{
                        borderColor: isActive 
                          ? '#8b5cf6' 
                          : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                        backgroundColor: isActive
                          ? (theme === 'dark' ? '#3b1f5f' : '#f3e8ff')
                          : (theme === 'dark' ? '#1f2937' : '#ffffff')
                      }}
                              onClick={() => handleSceneSelect(index)}
                            >
                      <div className="flex gap-3">
                        {/* 썸네일 */}
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200 shrink-0">
                          {sceneThumbnails[index] && (
                            <img
                              src={sceneThumbnails[index]}
                                    alt={`Scene ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                          )}
                              </div>

                        {/* 씬 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4" style={{
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }} />
                              <span className="text-sm font-semibold" style={{
                                color: theme === 'dark' ? '#ffffff' : '#111827'
                              }}>
                                씬 {index + 1}
                                      </span>
                                    </div>
                          </div>

                          {/* 텍스트 입력 */}
                          <textarea
                            rows={2}
                            value={scene.script}
                            onChange={(e) => handleSceneScriptChange(index, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm rounded-md border px-2 py-1 resize-none mb-2"
                            style={{
                              backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                              borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                              color: theme === 'dark' ? '#ffffff' : '#111827'
                            }}
                            placeholder="씬 텍스트 입력..."
                          />

                          {/* 설정 */}
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span
                              className="px-2 py-1 rounded border text-xs"
                              style={{
                                backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
                                borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }}
                            >
                              {transitionLabels[sceneData?.transition || 'fade'] || '페이드'}
                                  </span>
                                  <select
                              value={sceneData?.imageFit || 'fill'}
                              onChange={(e) => handleSceneImageFitChange(index, e.target.value as 'cover' | 'contain' | 'fill')}
                                    onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 rounded border text-xs"
                              style={{
                                backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                                borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                                color: theme === 'dark' ? '#ffffff' : '#111827'
                              }}
                                  >
                                    <option value="cover">Cover</option>
                                    <option value="contain">Contain</option>
                                    <option value="fill">Fill</option>
                                  </select>
                                </div>
                        </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
              </div>
            </div>

        {/* 오른쪽 패널: 효과 선택 */}
        <div className="w-[30%] flex flex-col h-full overflow-hidden" style={{
          backgroundColor: theme === 'dark' ? '#111827' : '#ffffff'
        }}>
          <div className="p-4 border-b shrink-0 flex items-center" style={{
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            minHeight: '64px',
            marginTop: '7px', // 씬 리스트와 상단선 맞춤을 위해 미세 조정
          }}>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold" style={{
                color: theme === 'dark' ? '#ffffff' : '#111827'
              }}>
                효과
              </h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="p-4">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="animation">애니메이션</TabsTrigger>
                <TabsTrigger value="bgm">배경음악</TabsTrigger>
                <TabsTrigger value="subtitle">자막</TabsTrigger>
              </TabsList>
              
              <TabsContent value="animation" className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }}>
                    전환 효과
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {allTransitions.map((transition) => {
                      const isSelected = timeline?.scenes[currentSceneIndex]?.transition === transition.value
                      return (
                        <button
                          key={transition.value}
                          onClick={() => {
                            if (timeline && currentSceneIndex >= 0) {
                              handleSceneTransitionChange(currentSceneIndex, transition.value)
                            }
                          }}
                          className={`p-3 rounded-lg border text-sm transition-colors ${
                            isSelected 
                              ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500' 
                              : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
                          }`}
                          style={{
                            borderColor: isSelected 
                              ? '#8b5cf6' 
                              : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                            color: theme === 'dark' ? '#d1d5db' : '#374151'
                          }}
                        >
                          {transition.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 고급 효과 */}
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }}>
                    고급 효과
                  </h3>
                  
                  {/* 후광 효과 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        후광 효과
                      </label>
                      <input
                        type="checkbox"
                        checked={timeline?.scenes[currentSceneIndex]?.advancedEffects?.glow?.enabled || false}
                        onChange={(e) => {
                          if (timeline && currentSceneIndex >= 0) {
                            handleAdvancedEffectChange(
                              currentSceneIndex,
                              'glow',
                              e.target.checked
                                ? {
                                    enabled: true,
                                    distance: 10,
                                    outerStrength: 4,
                                    innerStrength: 0,
                                    color: 0xffffff,
                                  }
                                : { enabled: false }
                            )
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>

                  {/* 글리치 효과 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        글리치 효과
                      </label>
                      <input
                        type="checkbox"
                        checked={timeline?.scenes[currentSceneIndex]?.advancedEffects?.glitch?.enabled || false}
                        onChange={(e) => {
                          if (timeline && currentSceneIndex >= 0) {
                            handleAdvancedEffectChange(
                              currentSceneIndex,
                              'glitch',
                              e.target.checked
                                ? {
                                    enabled: true,
                                    intensity: 10,
                                  }
                                : { enabled: false }
                            )
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>

                  {/* 파티클 효과 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        파티클 효과
                      </label>
                      <select
                        value={timeline?.scenes[currentSceneIndex]?.advancedEffects?.particles?.type || 'none'}
                        onChange={(e) => {
                          if (timeline && currentSceneIndex >= 0) {
                            const value = e.target.value
                            handleAdvancedEffectChange(
                              currentSceneIndex,
                              'particles',
                              value !== 'none'
                                ? {
                                    enabled: true,
                                    type: value as 'sparkle' | 'snow' | 'confetti' | 'stars',
                                    count: 50,
                                    duration: 2,
                                  }
                                : { enabled: false }
                            )
                          }
                        }}
                        className="px-2 py-1 rounded border text-xs"
                        style={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                          borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                          color: theme === 'dark' ? '#ffffff' : '#111827'
                        }}
                      >
                        <option value="none">없음</option>
                        <option value="sparkle">반짝임</option>
                        <option value="snow">눈송이</option>
                        <option value="confetti">컨페티</option>
                        <option value="stars">별</option>
                      </select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bgm" className="space-y-4">
                <BgmSelector bgmTemplate={bgmTemplate} theme={theme} setBgmTemplate={setBgmTemplate} />
              </TabsContent>

              <TabsContent value="subtitle" className="space-y-4">
                {/* 현재 씬 자막 설정 */}
                {timeline && timeline.scenes[currentSceneIndex] && (
                  <>
                    <div className="p-3 rounded-lg border" style={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
                      borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold" style={{
                          color: theme === 'dark' ? '#ffffff' : '#111827'
                        }}>
                          씬 {currentSceneIndex + 1} 자막 설정
                        </h3>
                      </div>
                      
                      {/* 자막 내용 미리보기 */}
                      <p 
                        className="text-sm mb-2 p-2 rounded truncate"
                        style={{
                          fontFamily: timeline.scenes[currentSceneIndex]?.text?.font || 'Arial',
                          fontSize: Math.min(timeline.scenes[currentSceneIndex]?.text?.fontSize || 32, 20),
                          color: timeline.scenes[currentSceneIndex]?.text?.color || '#ffffff',
                          fontWeight: timeline.scenes[currentSceneIndex]?.text?.style?.bold ? 'bold' : 'normal',
                          fontStyle: timeline.scenes[currentSceneIndex]?.text?.style?.italic ? 'italic' : 'normal',
                          textDecoration: timeline.scenes[currentSceneIndex]?.text?.style?.underline ? 'underline' : 'none',
                          backgroundColor: theme === 'dark' ? '#111827' : '#374151',
                        }}
                      >
                        {timeline.scenes[currentSceneIndex]?.text?.content || '(자막 없음)'}
                      </p>
                    </div>

                    {/* 폰트 선택 - 워드 스타일 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        폰트
                      </label>
                      <select
                        value={timeline.scenes[currentSceneIndex]?.text?.font || 'Arial'}
                        onChange={(e) => {
                          if (timeline) {
                            const newFont = e.target.value
                            const nextTimeline: TimelineData = {
                              ...timeline,
                              scenes: timeline.scenes.map((scene, i) => {
                                if (i === currentSceneIndex) {
                                  return {
                                    ...scene,
                                    text: {
                                      ...scene.text,
                                      font: newFont,
                                    },
                                  }
                                }
                                return scene
                              }),
                            }
                            setTimeline(nextTimeline)
                            // useEffect가 자동으로 syncFabricWithScene 호출함
                          }
                        }}
                        className="w-full px-3 py-2 rounded border text-sm"
                        style={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                          borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                          color: theme === 'dark' ? '#ffffff' : '#111827',
                          fontFamily: timeline.scenes[currentSceneIndex]?.text?.font || 'Arial',
                        }}
                      >
                        {[
                          'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 
                          'Verdana', 'Georgia', 'Palatino', 'Garamond', 
                          'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Lucida Console'
                        ].map((font) => (
                          <option key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 폰트 크기 - 개선된 UX */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        크기
                      </label>
                      <div className="flex items-center gap-2">
                        {/* 직접 입력 - 포커스 아웃 또는 Enter 시에만 적용 */}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          defaultValue={timeline.scenes[currentSceneIndex]?.text?.fontSize || 32}
                          key={`fontSize-${currentSceneIndex}-${timeline.scenes[currentSceneIndex]?.text?.fontSize}`}
                          onBlur={(e) => {
                            if (timeline) {
                              const value = parseInt(e.target.value) || 32
                              const fontSize = Math.max(8, Math.min(200, value))
                              const nextTimeline: TimelineData = {
                                ...timeline,
                                scenes: timeline.scenes.map((scene, i) => {
                                  if (i === currentSceneIndex) {
                                    return {
                                      ...scene,
                                      text: {
                                        ...scene.text,
                                        fontSize,
                                      },
                                    }
                                  }
                                  return scene
                                }),
                              }
                              setTimeline(nextTimeline)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur()
                            }
                          }}
                          className="w-16 px-2 py-1 rounded border text-sm text-center"
                          style={{
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                            color: theme === 'dark' ? '#ffffff' : '#111827'
                          }}
                        />
                        <span className="text-xs" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>px</span>
                        
                        {/* 크기 프리셋 버튼 */}
                        <div className="flex gap-1 ml-2">
                          {[24, 32, 48, 64, 80].map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                if (timeline) {
                                  const nextTimeline: TimelineData = {
                                    ...timeline,
                                    scenes: timeline.scenes.map((scene, i) => {
                                      if (i === currentSceneIndex) {
                                        return {
                                          ...scene,
                                          text: {
                                            ...scene.text,
                                            fontSize: size,
                                          },
                                        }
                                      }
                                      return scene
                                    }),
                                  }
                                  setTimeline(nextTimeline)
                                }
                              }}
                              className={`px-2 py-1 rounded text-xs ${
                                timeline.scenes[currentSceneIndex]?.text?.fontSize === size
                                  ? 'bg-purple-500 text-white'
                                  : ''
                              }`}
                              style={{
                                backgroundColor: timeline.scenes[currentSceneIndex]?.text?.fontSize === size
                                  ? undefined
                                  : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                                color: timeline.scenes[currentSceneIndex]?.text?.fontSize === size
                                  ? undefined
                                  : (theme === 'dark' ? '#d1d5db' : '#374151')
                              }}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 슬라이더 - 보라색 */}
                      <input
                        type="range"
                        min="8"
                        max="120"
                        value={timeline.scenes[currentSceneIndex]?.text?.fontSize || 32}
                        onChange={(e) => {
                          if (timeline) {
                            const fontSize = parseInt(e.target.value)
                            const nextTimeline: TimelineData = {
                              ...timeline,
                              scenes: timeline.scenes.map((scene, i) => {
                                if (i === currentSceneIndex) {
                                  return {
                                    ...scene,
                                    text: {
                                      ...scene.text,
                                      fontSize,
                                    },
                                  }
                                }
                                return scene
                              }),
                            }
                            setTimeline(nextTimeline)
                          }
                        }}
                        className="w-full mt-2"
                        style={{ accentColor: '#8b5cf6' }}
                      />
                    </div>

                    {/* 색상 선택 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        색상
                      </label>
                      <div className="flex gap-2 flex-wrap items-center">
                        {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              if (timeline) {
                                const nextTimeline: TimelineData = {
                                  ...timeline,
                                  scenes: timeline.scenes.map((scene, i) => {
                                    if (i === currentSceneIndex) {
                                      return {
                                        ...scene,
                                        text: {
                                          ...scene.text,
                                          color,
                                        },
                                      }
                                    }
                                    return scene
                                  }),
                                }
                                setTimeline(nextTimeline)
                              }
                            }}
                            className={`w-7 h-7 rounded border-2 transition-colors`}
                            style={{
                              backgroundColor: color,
                              borderColor: timeline.scenes[currentSceneIndex]?.text?.color === color 
                                ? '#8b5cf6' 
                                : (theme === 'dark' ? '#374151' : '#e5e7eb')
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={timeline.scenes[currentSceneIndex]?.text?.color || '#ffffff'}
                          onChange={(e) => {
                            if (timeline) {
                              const nextTimeline: TimelineData = {
                                ...timeline,
                                scenes: timeline.scenes.map((scene, i) => {
                                  if (i === currentSceneIndex) {
                                    return {
                                      ...scene,
                                      text: {
                                        ...scene.text,
                                        color: e.target.value,
                                      },
                                    }
                                  }
                                  return scene
                                }),
                              }
                              setTimeline(nextTimeline)
                            }
                          }}
                          className="w-7 h-7 rounded cursor-pointer border"
                          style={{ borderColor: theme === 'dark' ? '#374151' : '#d1d5db' }}
                        />
                      </div>
                    </div>

                    {/* 스타일 (굵기, 기울임, 밑줄) */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        스타일
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (timeline) {
                              const currentBold = timeline.scenes[currentSceneIndex]?.text?.style?.bold || false
                              const nextTimeline: TimelineData = {
                                ...timeline,
                                scenes: timeline.scenes.map((scene, i) => {
                                  if (i === currentSceneIndex) {
                                    return {
                                      ...scene,
                                      text: {
                                        ...scene.text,
                                        style: {
                                          ...scene.text.style,
                                          bold: !currentBold,
                                        },
                                      },
                                    }
                                  }
                                  return scene
                                }),
                              }
                              setTimeline(nextTimeline)
                            }
                          }}
                          className={`px-3 py-1.5 rounded border text-sm font-bold transition-all ${
                            timeline.scenes[currentSceneIndex]?.text?.style?.bold 
                              ? 'bg-purple-500 text-white border-purple-500' 
                              : ''
                          }`}
                          style={{
                            borderColor: timeline.scenes[currentSceneIndex]?.text?.style?.bold 
                              ? '#8b5cf6' 
                              : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                            color: timeline.scenes[currentSceneIndex]?.text?.style?.bold 
                              ? '#ffffff' 
                              : (theme === 'dark' ? '#d1d5db' : '#374151'),
                            backgroundColor: timeline.scenes[currentSceneIndex]?.text?.style?.bold 
                              ? '#8b5cf6' 
                              : 'transparent'
                          }}
                        >
                          B
                        </button>
                        <button
                          onClick={() => {
                            if (timeline) {
                              const currentItalic = timeline.scenes[currentSceneIndex]?.text?.style?.italic || false
                              const nextTimeline: TimelineData = {
                                ...timeline,
                                scenes: timeline.scenes.map((scene, i) => {
                                  if (i === currentSceneIndex) {
                                    return {
                                      ...scene,
                                      text: {
                                        ...scene.text,
                                        style: {
                                          ...scene.text.style,
                                          italic: !currentItalic,
                                        },
                                      },
                                    }
                                  }
                                  return scene
                                }),
                              }
                              setTimeline(nextTimeline)
                            }
                          }}
                          className={`px-3 py-1.5 rounded border text-sm italic transition-all ${
                            timeline.scenes[currentSceneIndex]?.text?.style?.italic 
                              ? 'bg-purple-500 text-white border-purple-500' 
                              : ''
                          }`}
                          style={{
                            borderColor: timeline.scenes[currentSceneIndex]?.text?.style?.italic 
                              ? '#8b5cf6' 
                              : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                            color: timeline.scenes[currentSceneIndex]?.text?.style?.italic 
                              ? '#ffffff' 
                              : (theme === 'dark' ? '#d1d5db' : '#374151'),
                            backgroundColor: timeline.scenes[currentSceneIndex]?.text?.style?.italic 
                              ? '#8b5cf6' 
                              : 'transparent'
                          }}
                        >
                          I
                        </button>
                        <button
                          onClick={() => {
                            if (timeline) {
                              const currentUnderline = timeline.scenes[currentSceneIndex]?.text?.style?.underline || false
                              const nextTimeline: TimelineData = {
                                ...timeline,
                                scenes: timeline.scenes.map((scene, i) => {
                                  if (i === currentSceneIndex) {
                                    return {
                                      ...scene,
                                      text: {
                                        ...scene.text,
                                        style: {
                                          ...scene.text.style,
                                          underline: !currentUnderline,
                                        },
                                      },
                                    }
                                  }
                                  return scene
                                }),
                              }
                              setTimeline(nextTimeline)
                            }
                          }}
                          className={`px-3 py-1.5 rounded border text-sm underline transition-all ${
                            timeline.scenes[currentSceneIndex]?.text?.style?.underline 
                              ? 'bg-purple-500 text-white border-purple-500' 
                              : ''
                          }`}
                          style={{
                            borderColor: timeline.scenes[currentSceneIndex]?.text?.style?.underline 
                              ? '#8b5cf6' 
                              : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                            color: timeline.scenes[currentSceneIndex]?.text?.style?.underline 
                              ? '#ffffff' 
                              : (theme === 'dark' ? '#d1d5db' : '#374151'),
                            backgroundColor: timeline.scenes[currentSceneIndex]?.text?.style?.underline 
                              ? '#8b5cf6' 
                              : 'transparent'
                          }}
                        >
                          U
                        </button>
                      </div>
                    </div>

                    {/* 정렬 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        정렬
                      </label>
                      <div className="flex gap-2">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => {
                              if (timeline) {
                                const nextTimeline: TimelineData = {
                                  ...timeline,
                                  scenes: timeline.scenes.map((scene, i) => {
                                    if (i === currentSceneIndex) {
                                      return {
                                        ...scene,
                                        text: {
                                          ...scene.text,
                                          style: {
                                            ...scene.text.style,
                                            align,
                                          },
                                        },
                                      }
                                    }
                                    return scene
                                  }),
                                }
                                setTimeline(nextTimeline)
                              }
                            }}
                            className={`px-3 py-1.5 rounded border text-xs transition-all ${
                              timeline.scenes[currentSceneIndex]?.text?.style?.align === align 
                                ? 'bg-purple-500 text-white' 
                                : ''
                            }`}
                            style={{
                              borderColor: timeline.scenes[currentSceneIndex]?.text?.style?.align === align 
                                ? '#8b5cf6' 
                                : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                              color: timeline.scenes[currentSceneIndex]?.text?.style?.align === align 
                                ? '#ffffff' 
                                : (theme === 'dark' ? '#d1d5db' : '#374151'),
                              backgroundColor: timeline.scenes[currentSceneIndex]?.text?.style?.align === align 
                                ? '#8b5cf6' 
                                : 'transparent'
                            }}
                          >
                            {align === 'left' ? '좌측' : align === 'center' ? '중앙' : '우측'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 위치 프리셋 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        위치
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { pos: 'top', label: '상단', y: 0.1 },
                          { pos: 'center', label: '중앙', y: 0.5 },
                          { pos: 'bottom', label: '하단', y: 0.92 }
                        ].map(({ pos, label, y }) => (
                          <button
                            key={pos}
                            onClick={() => {
                              if (timeline) {
                                const { width, height } = stageDimensions
                                const nextTimeline: TimelineData = {
                                  ...timeline,
                                  scenes: timeline.scenes.map((scene, i) => {
                                    if (i === currentSceneIndex) {
                                      return {
                                        ...scene,
                                        text: {
                                          ...scene.text,
                                          position: pos,
                                          transform: {
                                            ...scene.text.transform,
                                            x: width / 2,
                                            y: height * y,
                                            width: width * 0.75,
                                            height: height * 0.07,
                                            scaleX: 1,
                                            scaleY: 1,
                                            rotation: 0,
                                          },
                                        },
                                      }
                                    }
                                    return scene
                                  }),
                                }
                                setTimeline(nextTimeline)
                                setSubtitlePosition(pos)
                              }
                            }}
                            className={`p-2 rounded-lg border text-xs transition-all ${
                              timeline.scenes[currentSceneIndex]?.text?.position === pos 
                                ? 'bg-purple-500 text-white' 
                                : ''
                            } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
                            style={{
                              borderColor: timeline.scenes[currentSceneIndex]?.text?.position === pos 
                                ? '#8b5cf6' 
                                : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                              color: timeline.scenes[currentSceneIndex]?.text?.position === pos 
                                ? '#ffffff' 
                                : (theme === 'dark' ? '#d1d5db' : '#374151'),
                              backgroundColor: timeline.scenes[currentSceneIndex]?.text?.position === pos 
                                ? '#8b5cf6' 
                                : 'transparent'
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* 모든 씬에 적용하기 버튼 */}
                <div className="pt-4 border-t" style={{
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                }}>
                  <Button
                    onClick={() => {
                      if (!timeline) return
                      
                      const currentText = timeline.scenes[currentSceneIndex]?.text
                      if (!currentText) return
                      
                      const nextTimeline: TimelineData = {
                        ...timeline,
                        scenes: timeline.scenes.map((scene) => ({
                          ...scene,
                          text: {
                            ...scene.text,
                            font: currentText.font,
                            fontSize: currentText.fontSize,
                            color: currentText.color,
                            position: currentText.position,
                            style: { ...currentText.style },
                            transform: currentText.transform ? { ...currentText.transform } : scene.text.transform,
                          },
                        })),
                      }
                      setTimeline(nextTimeline)
                      
                      // 알림
                      alert(`현재 자막 스타일이 모든 씬(${timeline.scenes.length}개)에 적용되었습니다.`)
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    ✨ 모든 씬에 적용하기
                  </Button>
                  <p className="text-xs mt-2 text-center" style={{
                    color: theme === 'dark' ? '#6b7280' : '#9ca3af'
                  }}>
                    현재 씬의 자막 스타일을 모든 씬에 일괄 적용합니다
                  </p>
                </div>

              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
