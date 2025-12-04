'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, Image as ImageIcon, Clock, Edit2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, TimelineData } from '@/store/useVideoCreateStore'
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
  const dragStartPosRef = useRef({ x: 0, y: 0 })
  
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
  }, [])

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

        container.addChild(sprite)
        spritesRef.current.set(sceneIndex, sprite)
        console.log(`Step4: Sprite added for scene ${sceneIndex}`)

        if (scene.text?.content) {
          const textStyle = new PIXI.TextStyle({
            fontFamily: scene.text.font || 'Arial',
            fontSize: scene.text.fontSize || 32,
            fill: scene.text.color || '#ffffff',
            align: 'center',
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
      updateCurrentScene()
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
    console.log('Step4: loadAllScenes effect - pixiReady:', pixiReady, 'app:', !!appRef.current, 'container:', !!containerRef.current, 'timeline:', !!timeline, 'scenes:', timeline?.scenes.length)
    if (!pixiReady || !appRef.current || !containerRef.current || !timeline || timeline.scenes.length === 0) {
      console.log('Step4: loadAllScenes effect skipped - waiting for refs')
      return
    }
    console.log('Step4: Calling loadAllScenes')
    // 다음 프레임에 실행하여 ref가 확실히 설정된 후 실행
    requestAnimationFrame(() => {
      loadAllScenes()
    })
  }, [pixiReady, timeline, loadAllScenes])

  useEffect(() => {
    updateCurrentScene()
  }, [updateCurrentScene])

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
            <h2 className="text-lg font-semibold" style={{
              color: theme === 'dark' ? '#ffffff' : '#111827'
            }}>
              미리보기
            </h2>
          </div>
          
          <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
            {/* PixiJS 미리보기 */}
            <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden min-h-0">
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
            <h2 className="text-lg font-semibold" style={{
              color: theme === 'dark' ? '#ffffff' : '#111827'
            }}>
              씬 리스트
            </h2>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
