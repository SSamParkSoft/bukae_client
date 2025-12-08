'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, Image as ImageIcon, Clock, Edit2, GripVertical, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'

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
  
  // State
  const [isPlaying, setIsPlaying] = useState(false)
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
      app.canvas.style.width = '100%'
      app.canvas.style.height = '100%'
      app.canvas.style.display = 'block'
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
        const existingCanvas = container.querySelector('canvas')
        if (existingCanvas) container.removeChild(existingCanvas)
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
        containerRef.current = null
      }
      setPixiReady(false)
    }
  }, [mounted, stageDimensions])

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
        if (scene.imageTransform) {
          sprite.x = scene.imageTransform.x
          sprite.y = scene.imageTransform.y
          sprite.width = scene.imageTransform.width
          sprite.height = scene.imageTransform.height
          sprite.scale.set(scene.imageTransform.scaleX, scene.imageTransform.scaleY)
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
      
      const startTime = getSceneStartTime(currentSceneIndex)
      console.log('Step4: Setting currentTime to:', startTime)
      setCurrentTime(startTime)
      
      // 재생 시작 시 현재 씬을 애니메이션 없이 즉시 표시
      console.log('Step4: Showing scene without animation')
      updateCurrentScene(true)  // skipAnimation = true
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

  // currentTime 변화에 따라 현재 씬 업데이트 (수동 선택 시 제외)
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
    setCurrentSceneIndex(sceneIndex)
    
    // 재생 중에는 애니메이션 없이 즉시 표시 (씬 클릭과 동일하게)
    updateCurrentScene(true)
  }, [currentTime, timeline, totalDuration, updateCurrentScene])

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
    // 효과 적용 후 미리보기 업데이트
    requestAnimationFrame(() => {
      updateCurrentScene()
      setTimeout(() => {
        isManualSceneSelectRef.current = false
      }, 50)
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
    sprite.cursor = editMode === 'image' ? 'move' : 'default'

    if (editMode === 'image') {
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
  const applyImageTransform = useCallback((sprite: PIXI.Sprite, transform?: TimelineScene['imageTransform']) => {
    if (!transform || !sprite) return

    sprite.x = transform.x
    sprite.y = transform.y
    sprite.width = transform.width
    sprite.height = transform.height
    sprite.scale.set(transform.scaleX, transform.scaleY)
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
    text.cursor = editMode === 'text' ? 'move' : 'default'

    if (editMode === 'text') {
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
          <div className="p-4 border-b shrink-0" style={{
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
          }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{
                color: theme === 'dark' ? '#ffffff' : '#111827'
              }}>
                미리보기
              </h2>
              {/* 편집 모드 토글 */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const newMode = editMode === 'text' ? 'none' : 'text'
                    if (newMode === 'none') {
                      // 텍스트 편집 종료 시 현재 씬 인덱스 저장 (변경 방지)
                      const savedSceneIndex = currentSceneIndex
                      savedSceneIndexRef.current = savedSceneIndex
                      
                      // 자동 씬 인덱스 계산 방지
                      isManualSceneSelectRef.current = true
                      
                      // 모든 편집된 텍스트의 Transform 수집
                      const transformsToSave = new Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>()
                      
                      // 선택된 요소의 Transform 저장
                      if (selectedElementIndex !== null && selectedElementType === 'text') {
                        const text = textsRef.current.get(selectedElementIndex)
                        if (text) {
                          transformsToSave.set(selectedElementIndex, {
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
                      
                      // 모든 편집된 텍스트의 Transform 수집
                      textsRef.current.forEach((text, index) => {
                        if (originalTextTransformRef.current.has(index)) {
                          transformsToSave.set(index, {
                            x: text.x,
                            y: text.y,
                            width: text.width * text.scale.x,
                            height: text.height * text.scale.y,
                            scaleX: text.scale.x,
                            scaleY: text.scale.y,
                            rotation: text.rotation,
                          })
                        }
                      })
                      
                      // 모든 Transform을 한 번에 저장
                      if (transformsToSave.size > 0 && timeline) {
                        isSavingTransformRef.current = true
                        const nextTimeline: TimelineData = {
                          ...timeline,
                          scenes: timeline.scenes.map((scene, i) => {
                            if (transformsToSave.has(i)) {
                              const transform = transformsToSave.get(i)!
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
                        setTimeout(() => {
                          isSavingTransformRef.current = false
                        }, 100)
                      }
                      
                      originalTextTransformRef.current.clear()
                      setSelectedElementIndex(null)
                      setSelectedElementType(null)
                      
                      // 씬 인덱스 강제 복원 및 자동 계산 방지 해제
                      setTimeout(() => {
                        if (currentSceneIndex !== savedSceneIndex) {
                          setCurrentSceneIndex(savedSceneIndex)
                        }
                        setTimeout(() => {
                          isManualSceneSelectRef.current = false
                        }, 100)
                      }, 200)
                    } else {
                      // 텍스트 편집 모드 시작 시 모든 텍스트의 원래 Transform 저장
                      originalTextTransformRef.current.clear()
                      if (timeline) {
                        textsRef.current.forEach((text, index) => {
                          const scene = timeline.scenes[index]
                          if (scene?.text?.transform) {
                            const transform = scene.text.transform
                            originalTextTransformRef.current.set(index, {
                              ...transform,
                              scaleX: transform.scaleX ?? 1,
                              scaleY: transform.scaleY ?? 1,
                            })
                          } else if (text) {
                            originalTextTransformRef.current.set(index, {
                              x: text.x,
                              y: text.y,
                              width: text.width * text.scale.x,
                              height: text.height * text.scale.y,
                              scaleX: text.scale.x,
                              scaleY: text.scale.y,
                              rotation: text.rotation,
                            })
                          }
                        })
                      }
                    }
                    setEditMode(newMode)
                  }}
                  variant={editMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                >
                  <Type className="w-3 h-3 mr-1" />
                  {editMode === 'text' ? '텍스트 편집 종료' : '텍스트 편집'}
                </Button>
                <Button
                  onClick={() => {
                    const newMode = editMode === 'image' ? 'none' : 'image'
                    if (newMode === 'none') {
                      // 편집 종료 시 현재 씬 인덱스 저장 (변경 방지)
                      const savedSceneIndex = currentSceneIndex
                      savedSceneIndexRef.current = savedSceneIndex
                      
                      // 자동 씬 인덱스 계산 방지
                      isManualSceneSelectRef.current = true
                      
                      // 모든 편집된 스프라이트의 Transform 수집
                      const transformsToSave = new Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>()
                      
                      // 선택된 요소의 Transform 저장
                      if (selectedElementIndex !== null && selectedElementType === 'image') {
                        const sprite = spritesRef.current.get(selectedElementIndex)
                        if (sprite) {
                          transformsToSave.set(selectedElementIndex, {
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
                      
                      // 모든 편집된 스프라이트의 Transform 수집
                      spritesRef.current.forEach((sprite, index) => {
                        if (originalSpriteTransformRef.current.has(index)) {
                          transformsToSave.set(index, {
                            x: sprite.x,
                            y: sprite.y,
                            width: sprite.width,
                            height: sprite.height,
                            scaleX: sprite.scale.x,
                            scaleY: sprite.scale.y,
                            rotation: sprite.rotation,
                          })
                        }
                      })
                      
                      // 모든 Transform을 한 번에 저장
                      if (transformsToSave.size > 0) {
                        saveAllImageTransforms(transformsToSave)
                      }
                      
                      originalSpriteTransformRef.current.clear()
                      setSelectedElementIndex(null)
                      setSelectedElementType(null)
                      
                      // 씬 인덱스 강제 복원 및 자동 계산 방지 해제
                      setTimeout(() => {
                        if (currentSceneIndex !== savedSceneIndex) {
                          setCurrentSceneIndex(savedSceneIndex)
                        }
                        // 자동 계산 방지 해제는 조금 더 늦게
                        setTimeout(() => {
                          isManualSceneSelectRef.current = false
                        }, 100)
                      }, 200)
                    } else {
                      // 편집 모드 시작 시 모든 스프라이트의 원래 Transform 저장
                      originalSpriteTransformRef.current.clear()
                      if (timeline) {
                        spritesRef.current.forEach((sprite, index) => {
                          const scene = timeline.scenes[index]
                          if (scene?.imageTransform) {
                            originalSpriteTransformRef.current.set(index, scene.imageTransform)
                          } else if (sprite) {
                            // timeline에 Transform이 없으면 현재 스프라이트 위치 저장
                            originalSpriteTransformRef.current.set(index, {
                              x: sprite.x,
                              y: sprite.y,
                              width: sprite.width,
                              height: sprite.height,
                              scaleX: sprite.scale.x,
                              scaleY: sprite.scale.y,
                              rotation: sprite.rotation,
                            })
                          }
                        })
                      }
                    }
                    setEditMode(newMode)
                  }}
                  variant={editMode === 'image' ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  {editMode === 'image' ? '편집 종료' : '이미지 편집'}
                </Button>
                        </div>
                          </div>
                      </div>

          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
            {/* PixiJS 미리보기 */}
            <div 
              className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden min-h-0"
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
                className="w-full h-full"
                style={{ 
                  aspectRatio: '9/16',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                        />
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
          <div className="p-4 border-b shrink-0" style={{
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
          }}>
            <div className="flex items-center justify-between mb-3">
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
          <div className="p-4 border-b shrink-0" style={{
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
          }}>
            <h2 className="text-lg font-semibold" style={{
              color: theme === 'dark' ? '#ffffff' : '#111827'
            }}>
              효과
            </h2>
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
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }}>
                    배경음악
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setBgmTemplate('library')}
                      className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
                        bgmTemplate === 'library' ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500' : ''
                      } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
                      style={{
                        borderColor: bgmTemplate === 'library' 
                          ? '#8b5cf6' 
                          : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4" />
                        <span>무료 음악 라이브러리</span>
                      </div>
                    </button>
                    <button
                      onClick={() => setBgmTemplate('custom')}
                      className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
                        bgmTemplate === 'custom' ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500' : ''
                      } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
                      style={{
                        borderColor: bgmTemplate === 'custom' 
                          ? '#8b5cf6' 
                          : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        <span>내 음악</span>
                      </div>
                    </button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="subtitle" className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }}>
                    자막 위치
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['top', 'center', 'bottom'].map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setSubtitlePosition(pos)}
                        className={`p-3 rounded-lg border text-sm transition-colors ${
                          subtitlePosition === pos ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500' : ''
                        } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
                        style={{
                          borderColor: subtitlePosition === pos 
                            ? '#8b5cf6' 
                            : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                          color: theme === 'dark' ? '#d1d5db' : '#374151'
                        }}
                      >
                        {pos === 'top' ? '상단' : pos === 'center' ? '중앙' : '하단'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{
                    color: theme === 'dark' ? '#ffffff' : '#111827'
                  }}>
                    자막 색상
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {['#ffffff', '#000000', '#ff0000', '#0000ff'].map((color) => (
                      <button
                        key={color}
                        onClick={() => setSubtitleColor(color)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          subtitleColor === color ? 'border-purple-500' : ''
                        }`}
                        style={{
                          backgroundColor: color,
                          borderColor: subtitleColor === color ? '#8b5cf6' : (theme === 'dark' ? '#374151' : '#e5e7eb')
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* 텍스트 스타일 편집 (텍스트 선택 시에만 표시) */}
                {editMode === 'text' && selectedElementIndex !== null && selectedElementType === 'text' && timeline && (
                  <div className="space-y-4 mt-6 pt-6 border-t" style={{
                    borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                  }}>
                    <h3 className="text-sm font-semibold mb-2" style={{
                      color: theme === 'dark' ? '#ffffff' : '#111827'
                    }}>
                      텍스트 스타일
                    </h3>

                    {/* 폰트 선택 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        폰트
                      </label>
                      <select
                        value={timeline.scenes[selectedElementIndex]?.text?.font || 'Arial'}
                        onChange={(e) => {
                          if (timeline && selectedElementIndex >= 0) {
                            const nextTimeline: TimelineData = {
                              ...timeline,
                              scenes: timeline.scenes.map((scene, i) => {
                                if (i === selectedElementIndex) {
                                  return {
                                    ...scene,
                                    text: {
                                      ...scene.text,
                                      font: e.target.value,
                                    },
                                  }
                                }
                                return scene
                              }),
                            }
                            setTimeline(nextTimeline)
                            // 텍스트 스타일 업데이트
                            const text = textsRef.current.get(selectedElementIndex)
                            if (text) {
                              const currentStyle = text.style as PIXI.TextStyle
                              text.style = new PIXI.TextStyle({
                                ...currentStyle,
                                fontFamily: e.target.value,
                              })
                              if (appRef.current) {
                                appRef.current.render()
                              }
                            }
                          }
                        }}
                        className="w-full px-2 py-1 rounded border text-xs"
                        style={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                          borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                          color: theme === 'dark' ? '#ffffff' : '#111827'
                        }}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Palatino">Palatino</option>
                        <option value="Garamond">Garamond</option>
                      </select>
                    </div>

                    {/* 폰트 크기 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        크기: {timeline.scenes[selectedElementIndex]?.text?.fontSize || 32}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="120"
                        value={timeline.scenes[selectedElementIndex]?.text?.fontSize || 32}
                        onChange={(e) => {
                          if (timeline && selectedElementIndex >= 0) {
                            const fontSize = parseInt(e.target.value)
                            const nextTimeline: TimelineData = {
                              ...timeline,
                              scenes: timeline.scenes.map((scene, i) => {
                                if (i === selectedElementIndex) {
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
                            // 텍스트 크기 업데이트
                            const text = textsRef.current.get(selectedElementIndex)
                            if (text) {
                              const currentStyle = text.style as PIXI.TextStyle
                              text.style = new PIXI.TextStyle({
                                ...currentStyle,
                                fontSize,
                              })
                              if (appRef.current) {
                                appRef.current.render()
                              }
                            }
                          }
                        }}
                        className="w-full"
                      />
                    </div>

                    {/* 색상 선택 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        색상
                      </label>
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {['#ffffff', '#000000', '#ff0000', '#0000ff', '#00ff00', '#ffff00', '#ff00ff', '#00ffff'].map((color) => (
                          <button
                            key={color}
                            onClick={() => {
                              if (timeline && selectedElementIndex >= 0) {
                                const nextTimeline: TimelineData = {
                                  ...timeline,
                                  scenes: timeline.scenes.map((scene, i) => {
                                    if (i === selectedElementIndex) {
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
                                // 텍스트 색상 업데이트
                                const text = textsRef.current.get(selectedElementIndex)
                                if (text) {
                                  const currentStyle = text.style as PIXI.TextStyle
                                  text.style = new PIXI.TextStyle({
                                    ...currentStyle,
                                    fill: color,
                                  })
                                  if (appRef.current) {
                                    appRef.current.render()
                                  }
                                }
                              }
                            }}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              timeline.scenes[selectedElementIndex]?.text?.color === color ? 'border-purple-500' : ''
                            }`}
                            style={{
                              backgroundColor: color,
                              borderColor: timeline.scenes[selectedElementIndex]?.text?.color === color ? '#8b5cf6' : (theme === 'dark' ? '#374151' : '#e5e7eb')
                            }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        value={timeline.scenes[selectedElementIndex]?.text?.color || '#ffffff'}
                        onChange={(e) => {
                          if (timeline && selectedElementIndex >= 0) {
                            const nextTimeline: TimelineData = {
                              ...timeline,
                              scenes: timeline.scenes.map((scene, i) => {
                                if (i === selectedElementIndex) {
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
                            // 텍스트 색상 업데이트
                            const text = textsRef.current.get(selectedElementIndex)
                            if (text) {
                              const currentStyle = text.style as PIXI.TextStyle
                              text.style = new PIXI.TextStyle({
                                ...currentStyle,
                                fill: e.target.value,
                              })
                              if (appRef.current) {
                                appRef.current.render()
                              }
                            }
                          }
                        }}
                        className="w-full h-8 rounded border"
                        style={{
                          borderColor: theme === 'dark' ? '#374151' : '#d1d5db'
                        }}
                      />
                    </div>

                    {/* 정렬 */}
                    <div>
                      <label className="text-xs mb-1 block" style={{
                        color: theme === 'dark' ? '#d1d5db' : '#374151'
                      }}>
                        정렬
                      </label>
                      <div className="flex gap-2">
                        {[
                          { value: 'left', icon: AlignLeft, label: '왼쪽' },
                          { value: 'center', icon: AlignCenter, label: '중앙' },
                          { value: 'right', icon: AlignRight, label: '오른쪽' },
                          { value: 'justify', icon: AlignJustify, label: '양쪽' },
                        ].map(({ value, icon: Icon, label }) => (
                          <button
                            key={value}
                            onClick={() => {
                              if (timeline && selectedElementIndex >= 0) {
                                const nextTimeline: TimelineData = {
                                  ...timeline,
                                  scenes: timeline.scenes.map((scene, i) => {
                                    if (i === selectedElementIndex) {
                                      return {
                                        ...scene,
                                        text: {
                                          ...scene.text,
                                          style: {
                                            ...scene.text.style,
                                            align: value as 'left' | 'center' | 'right' | 'justify',
                                          },
                                        },
                                      }
                                    }
                                    return scene
                                  }),
                                }
                                setTimeline(nextTimeline)
                                // 텍스트 정렬 업데이트
                                const text = textsRef.current.get(selectedElementIndex)
                                if (text) {
                                  const currentStyle = text.style as PIXI.TextStyle
                                  text.style = new PIXI.TextStyle({
                                    ...currentStyle,
                                    align: value as PIXI.TextStyleAlign,
                                  })
                                  if (appRef.current) {
                                    appRef.current.render()
                                  }
                                }
                              }
                            }}
                            className={`flex-1 p-2 rounded-lg border text-xs transition-colors flex items-center justify-center gap-1 ${
                              timeline.scenes[selectedElementIndex]?.text?.style?.align === value
                                ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                                : ''
                            } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
                            style={{
                              borderColor: timeline.scenes[selectedElementIndex]?.text?.style?.align === value
                                ? '#8b5cf6'
                                : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                              color: theme === 'dark' ? '#d1d5db' : '#374151'
                            }}
                          >
                            <Icon className="w-3 h-3" />
                            {label}
                          </button>
                        ))}
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
                        {[
                          { key: 'bold', icon: Bold, label: '굵게' },
                          { key: 'italic', icon: Italic, label: '기울임' },
                          { key: 'underline', icon: Underline, label: '밑줄' },
                        ].map(({ key, icon: Icon, label }) => {
                          const isActive = timeline.scenes[selectedElementIndex]?.text?.style?.[key as 'bold' | 'italic' | 'underline'] || false
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                if (timeline && selectedElementIndex >= 0) {
                                  const nextTimeline: TimelineData = {
                                    ...timeline,
                                    scenes: timeline.scenes.map((scene, i) => {
                                      if (i === selectedElementIndex) {
                                        return {
                                          ...scene,
                                          text: {
                                            ...scene.text,
                                            style: {
                                              ...scene.text.style,
                                              [key]: !isActive,
                                            },
                                          },
                                        }
                                      }
                                      return scene
                                    }),
                                  }
                                  setTimeline(nextTimeline)
                                  // 텍스트 스타일 업데이트
                                  const text = textsRef.current.get(selectedElementIndex)
                                  if (text) {
                                    const currentStyle = text.style as PIXI.TextStyle
                                    text.style = new PIXI.TextStyle({
                                      ...currentStyle,
                                      fontWeight: key === 'bold' ? (!isActive ? 'bold' : 'normal') : currentStyle.fontWeight,
                                      fontStyle: key === 'italic' ? (!isActive ? 'italic' : 'normal') : currentStyle.fontStyle,
                                      // PixiJS는 underline을 직접 지원하지 않으므로 dropShadow나 다른 방법 사용
                                    })
                                    if (appRef.current) {
                                      appRef.current.render()
                                    }
                                  }
                                }
                              }}
                              className={`flex-1 p-2 rounded-lg border text-xs transition-colors flex items-center justify-center gap-1 ${
                                isActive
                                  ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500'
                                  : ''
                              } hover:bg-purple-50 dark:hover:bg-purple-900/20`}
                              style={{
                                borderColor: isActive
                                  ? '#8b5cf6'
                                  : (theme === 'dark' ? '#374151' : '#e5e7eb'),
                                color: theme === 'dark' ? '#d1d5db' : '#374151'
                              }}
                            >
                              <Icon className="w-3 h-3" />
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
