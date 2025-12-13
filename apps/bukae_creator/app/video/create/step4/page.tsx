'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Pause, Clock, Edit2, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useSceneHandlers } from '@/hooks/video/useSceneHandlers'
import { useTimelinePlayer } from '@/hooks/video/useTimelinePlayer'
import { usePixiFabric } from '@/hooks/video/usePixiFabric'
import { usePixiEffects } from '@/hooks/video/usePixiEffects'
import { useSceneManager } from '@/hooks/video/useSceneManager'
import { SceneList } from '@/components/video-editor/SceneList'
import { EffectsPanel } from '@/components/video-editor/EffectsPanel'
import { loadPixiTexture, calculateSpriteParams } from '@/utils/pixi'
import { formatTime, getSceneDuration } from '@/utils/timeline'
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
  const previousSceneIndexRef = useRef<number | null>(null)
  const currentSceneIndexRef = useRef(0)
  const updateCurrentSceneRef = useRef<(skipAnimation?: boolean) => void>(() => {})
  // Fabric.js refs
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const useFabricEditing = true
  
  // State
  const [rightPanelTab, setRightPanelTab] = useState('animation')
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null)
  const [selectedElementType, setSelectedElementType] = useState<'image' | 'text' | null>(null)
  const [showGrid, setShowGrid] = useState(false) // 격자 표시 여부
  const timelineBarRef = useRef<HTMLDivElement>(null)
  const [pixiReady, setPixiReady] = useState(false)
  const [fabricReady, setFabricReady] = useState(false)
  const fabricScaleRatioRef = useRef<number>(1) // Fabric.js 좌표 스케일 비율
  const [mounted, setMounted] = useState(false)

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


  // 타임라인 초기화
  useEffect(() => {
    if (scenes.length === 0) return

    console.log('Step4 scenes from store:', scenes)
    console.log('Step4 selectedImages from store:', selectedImages)

    const nextTimeline: TimelineData = {
      fps: 30,
      resolution: '1080x1920',
      playbackSpeed: timeline?.playbackSpeed ?? 1.0,
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
  }, [scenes, selectedImages, subtitleFont, subtitleColor, subtitlePosition, setTimeline, timeline])

  // timeline의 playbackSpeed와 state 동기화
  useEffect(() => {
    if (timeline?.playbackSpeed !== undefined && timeline.playbackSpeed !== playbackSpeed) {
      setPlaybackSpeed(timeline.playbackSpeed)
    }
  }, [timeline?.playbackSpeed])

  usePixiFabric({
    pixiContainerRef,
    appRef,
    containerRef,
    fabricCanvasRef,
    fabricCanvasElementRef,
    setPixiReady,
    setFabricReady,
    useFabricEditing,
    stageDimensions,
    fabricScaleRatioRef,
    editMode,
  })

  // Fabric 포인터 활성화 상태 갱신 (upper/lower 모두)
  useEffect(() => {
    const lower = fabricCanvasElementRef.current
    const upper = fabricCanvasRef.current?.upperCanvasEl
    const pointer = useFabricEditing ? 'auto' : 'none'
    if (lower) lower.style.pointerEvents = pointer
    if (upper) upper.style.pointerEvents = pointer
  }, [editMode, useFabricEditing])


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

  // 텍스처 로드 래퍼 (texturesRef 사용)
  const loadPixiTextureWithCache = (url: string): Promise<PIXI.Texture> => {
    return loadPixiTexture(url, texturesRef.current)
  }

  // 진행 중인 애니메이션 추적
  const activeAnimationsRef = useRef<Map<number, gsap.core.Timeline>>(new Map())

  // PixiJS 효과 적용 hook
  const { applyAdvancedEffects, applyEnterEffect } = usePixiEffects({
    appRef,
    containerRef,
    particlesRef,
    activeAnimationsRef,
    stageDimensions,
    timeline,
  })

  // 씬 관리 hook
  const { updateCurrentScene, syncFabricWithScene, loadAllScenes } = useSceneManager({
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    previousSceneIndexRef,
    activeAnimationsRef,
    fabricCanvasRef,
    fabricScaleRatioRef,
    isSavingTransformRef,
    timeline,
    stageDimensions,
    useFabricEditing,
    loadPixiTextureWithCache,
    applyAdvancedEffects,
    applyEnterEffect,
  })


  // Fabric 변경사항을 타임라인에 반영
  useEffect(() => {
    if (!fabricReady || !fabricCanvasRef.current || !timeline) return
    const fabricCanvas = fabricCanvasRef.current

    const handleModified = (e: fabric.ModifiedEvent<fabric.TPointerEvent>) => {
      const target = e?.target as (fabric.Object & { dataType?: 'image' | 'text' })
      const sceneIndex = currentSceneIndexRef.current
      if (!target) return
      
      // 스케일된 좌표를 원래 좌표로 역변환
      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale
      
      // 씬 이동 방지: 현재 씬 인덱스 저장 및 플래그 설정
      const savedIndex = sceneIndex
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
      if (!target || target.dataType !== 'text') return
      const sceneIndex = currentSceneIndexRef.current
      
      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale
      
      const savedIndex = sceneIndex
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
      if (!target || target.dataType !== 'text') return
      const sceneIndex = currentSceneIndexRef.current
      
      const scale = fabricScaleRatioRef.current || 1
      const invScale = 1 / scale
      
      const savedIndex = sceneIndex
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
  }, [fabricReady, timeline, setTimeline])


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
  }, [fabricReady, timeline, editMode, syncFabricWithScene])
  
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

  const {
    isPlaying,
    setIsPlaying,
    isPreviewingTransition,
    setIsPreviewingTransition,
    currentSceneIndex,
    setCurrentSceneIndex,
    currentTime,
    setCurrentTime,
    progressRatio,
    playbackSpeed,
    setPlaybackSpeed,
    totalDuration,
    selectScene,
    togglePlay,
    getStageDimensions,
    isManualSceneSelectRef,
  } = useTimelinePlayer({
    timeline,
    updateCurrentScene,
    loadAllScenes,
    appRef,
    containerRef,
    pixiReady,
  })

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

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

  // 씬 편집 핸들러들
  const {
    handleSceneScriptChange,
    handleSceneDurationChange,
    handleSceneTransitionChange,
    handleSceneImageFitChange,
    handlePlaybackSpeedChange,
  } = useSceneHandlers({
    scenes,
    timeline,
    setScenes,
    setTimeline,
    currentSceneIndex,
    setCurrentSceneIndex,
    updateCurrentScene,
    setIsPreviewingTransition,
    isManualSceneSelectRef,
    pixiReady,
    appRef,
    containerRef,
    loadAllScenes,
    setPlaybackSpeed,
  })

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
  }, [isPlaying, isPreviewingTransition, fabricReady, useFabricEditing])

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
            <SceneList
              scenes={scenes}
              timeline={timeline}
              sceneThumbnails={sceneThumbnails}
              currentSceneIndex={currentSceneIndex}
              theme={theme}
              transitionLabels={transitionLabels}
              onSelect={handleSceneSelect}
              onScriptChange={handleSceneScriptChange}
              onImageFitChange={handleSceneImageFitChange}
            />
            </div>

        <EffectsPanel
          theme={theme}
          rightPanelTab={rightPanelTab}
          setRightPanelTab={setRightPanelTab}
          timeline={timeline}
          currentSceneIndex={currentSceneIndex}
          allTransitions={allTransitions}
          onTransitionChange={handleSceneTransitionChange}
          onAdvancedEffectChange={handleAdvancedEffectChange}
          bgmTemplate={bgmTemplate}
          setBgmTemplate={setBgmTemplate}
          setTimeline={setTimeline}
        />
      </div>
      </div>
    </motion.div>
  )
}
