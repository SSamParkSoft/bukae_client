'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Pause, Clock, Edit2, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, Grid3x3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StepIndicator from '@/components/StepIndicator'
import { useVideoCreateStore, TimelineData, TimelineScene, SceneScript } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useSceneHandlers } from '@/hooks/video/useSceneHandlers'
import { useTimelinePlayer } from '@/hooks/video/useTimelinePlayer'
import { usePixiFabric } from '@/hooks/video/usePixiFabric'
import { usePixiEffects } from '@/hooks/video/usePixiEffects'
import { useSceneManager } from '@/hooks/video/useSceneManager'
import { usePixiEditor } from '@/hooks/video/usePixiEditor'
import { SceneList } from '@/components/video-editor/SceneList'
import { EffectsPanel } from '@/components/video-editor/EffectsPanel'
import { loadPixiTexture, calculateSpriteParams } from '@/utils/pixi'
import { formatTime, getSceneDuration } from '@/utils/timeline'
import { splitSceneBySentences } from '@/lib/utils/scene-splitter'
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
  const draggingElementRef = useRef<'image' | 'text' | null>(null) // 현재 드래그 중인 요소 타입
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
  const currentSceneIndexRef = useRef(0)
  const previousSceneIndexRef = useRef<number | null>(null) // useTimelinePlayer와 공유
  const lastRenderedSceneIndexRef = useRef<number | null>(null) // 전환 효과 추적용 (로컬)
  const updateCurrentSceneRef = useRef<(skipAnimation?: boolean) => void>(() => {})
  // Fabric.js refs
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElementRef = useRef<HTMLCanvasElement | null>(null)
  
  // State
  const [rightPanelTab, setRightPanelTab] = useState('animation')
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')
  
  // PixiJS 편집 모드일 때는 Fabric.js 편집 비활성화
  const useFabricEditing = false // PixiJS 편집 사용
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null)
  const [selectedElementType, setSelectedElementType] = useState<'image' | 'text' | null>(null)
  const [showGrid, setShowGrid] = useState(false) // 격자 표시 여부
  const timelineBarRef = useRef<HTMLDivElement>(null)
  const [pixiReady, setPixiReady] = useState(false)
  const [fabricReady, setFabricReady] = useState(false)
  const fabricScaleRatioRef = useRef<number>(1) // Fabric.js 좌표 스케일 비율
  const [mounted, setMounted] = useState(false)
  const [canvasSize, setCanvasSize] = useState<{ width: string; height: string }>({ width: '100%', height: '100%' }) // Canvas 크기 상태

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

    const nextTimeline: TimelineData = {
      fps: 30,
      resolution: '1080x1920',
      playbackSpeed: timeline?.playbackSpeed ?? 1.0,
      scenes: scenes.map((scene, index) => {
        const existingScene = timeline?.scenes[index]
        return {
          sceneId: scene.sceneId,
          duration: existingScene?.duration || getSceneDuration(scene.script),
          transition: existingScene?.transition || 'none',
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

  // 진행 중인 애니메이션 추적 (usePixiFabric보다 먼저 선언)
  const activeAnimationsRef = useRef<Map<number, gsap.core.Timeline>>(new Map())

  // mounted 상태와 pixiContainerRef가 준비된 후에만 PixiJS 초기화
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
    mounted, // mounted 상태 전달
    setCanvasSize, // Canvas 크기 상태 업데이트 함수 전달
    activeAnimationsRef, // 전환 효과 중인지 확인용
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

  // 편집 핸들러 hook (먼저 선언하여 콜백에서 사용 가능하도록)
  const {
    drawEditHandles,
    saveImageTransform,
    saveAllImageTransforms,
    handleResize,
    setupSpriteDrag,
    applyImageTransform,
    saveTextTransform,
    applyTextTransform,
    handleTextResize,
    drawTextEditHandles,
    setupTextDrag,
  } = usePixiEditor({
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    editHandlesRef,
    textEditHandlesRef,
    isDraggingRef,
    draggingElementRef,
    dragStartPosRef,
    isResizingRef,
    resizeHandleRef,
    resizeStartPosRef,
    isFirstResizeMoveRef,
    originalTransformRef,
    originalSpriteTransformRef,
    originalTextTransformRef,
    isResizingTextRef,
    currentSceneIndexRef,
    isSavingTransformRef,
    editMode,
    setEditMode,
    selectedElementIndex,
    setSelectedElementIndex,
    selectedElementType,
    setSelectedElementType,
    timeline,
    setTimeline,
    useFabricEditing,
  })

  // 애니메이션 완료 후 드래그 설정 재적용
  const handleAnimationComplete = useCallback((sceneIndex: number) => {
    const sprite = spritesRef.current.get(sceneIndex)
    const text = textsRef.current.get(sceneIndex)
    
    if (sprite && sprite.visible) {
      setupSpriteDrag(sprite, sceneIndex)
    }
    
    if (text && text.visible) {
      setupTextDrag(text, sceneIndex)
    }
  }, [setupSpriteDrag, setupTextDrag])

  // 로드 완료 후 드래그 설정 재적용
  const handleLoadComplete = useCallback((sceneIndex: number) => {
    const sprite = spritesRef.current.get(sceneIndex)
    const text = textsRef.current.get(sceneIndex)
    
    if (sprite) {
      setupSpriteDrag(sprite, sceneIndex)
    }
    
    if (text) {
      setupTextDrag(text, sceneIndex)
    }
  }, [setupSpriteDrag, setupTextDrag])

  // PixiJS 효과 적용 hook (playbackSpeed는 timeline에서 가져옴)
  const { applyAdvancedEffects, applyEnterEffect } = usePixiEffects({
    appRef,
    containerRef,
    particlesRef,
    activeAnimationsRef,
    stageDimensions,
    timeline,
    playbackSpeed: timeline?.playbackSpeed ?? 1.0,
    onAnimationComplete: handleAnimationComplete,
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
    onLoadComplete: handleLoadComplete,
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


  // timeline의 scenes 배열 길이나 구조가 변경될 때만 loadAllScenes 호출
  const timelineScenesLengthRef = useRef<number>(0)
  const timelineScenesRef = useRef<any[]>([])

  // Pixi와 타임라인이 모두 준비되면 씬 로드
  useEffect(() => {
    if (!pixiReady || !appRef.current || !containerRef.current || !timeline || timeline.scenes.length === 0) {
      return
    }
    
    // Transform 저장 중일 때는 loadAllScenes를 호출하지 않음
    if (isSavingTransformRef.current) {
      return
    }

    // scenes 배열의 길이나 구조가 변경되었는지 확인 (Transform만 변경된 경우는 제외)
    const scenesLength = timeline.scenes.length
    const scenesChanged = timelineScenesLengthRef.current !== scenesLength || 
      timeline.scenes.some((scene, i) => {
        const prevScene = timelineScenesRef.current[i]
        if (!prevScene) return true
        // 이미지나 텍스트 내용이 변경되었는지 확인 (Transform 제외)
        return prevScene.image !== scene.image || 
               prevScene.text?.content !== scene.text?.content ||
               prevScene.duration !== scene.duration ||
               prevScene.transition !== scene.transition
      })

    if (!scenesChanged && timelineScenesLengthRef.current > 0) {
      return
    }

    // scenes 정보 업데이트
    timelineScenesLengthRef.current = scenesLength
    timelineScenesRef.current = timeline.scenes.map(scene => ({
      image: scene.image,
      text: scene.text ? { content: scene.text.content } : null,
      duration: scene.duration,
      transition: scene.transition,
    }))

    // 다음 프레임에 실행하여 ref가 확실히 설정된 후 실행
    requestAnimationFrame(async () => {
      await loadAllScenes()
      // loadAllScenes 완료 후 현재 씬 표시
      setTimeout(() => {
        const sceneIndex = currentSceneIndexRef.current
        if (appRef.current && containerRef.current) {
          // 모든 씬 숨기기
          spritesRef.current.forEach((sprite) => {
            if (sprite) {
              sprite.visible = false
              sprite.alpha = 0
            }
          })
          textsRef.current.forEach((text) => {
            if (text) {
              text.visible = false
              text.alpha = 0
            }
          })
          // 현재 씬만 표시
          const currentSprite = spritesRef.current.get(sceneIndex)
          const currentText = textsRef.current.get(sceneIndex)
          if (currentSprite) {
            currentSprite.visible = true
            currentSprite.alpha = 1
          }
          if (currentText) {
            currentText.visible = true
            currentText.alpha = 1
          }
          appRef.current.render()
          
          // lastRenderedSceneIndexRef 초기화 (전환 효과 추적용)
          lastRenderedSceneIndexRef.current = sceneIndex
          previousSceneIndexRef.current = sceneIndex
        }
      }, 100)
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

  // 씬을 표시하는 공통 함수 (씬 선택과 재생 모두에서 사용)
  const showScene = useCallback((index: number) => {
    if (!appRef.current || !containerRef.current) {
      return
    }
    
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
    const selectedSprite = spritesRef.current.get(index)
    const selectedText = textsRef.current.get(index)
    
    if (selectedSprite) {
      if (!selectedSprite.parent && containerRef.current) {
        containerRef.current.addChild(selectedSprite)
      }
      selectedSprite.visible = true
      selectedSprite.alpha = 1
    }
    
    if (selectedText) {
      if (!selectedText.parent && containerRef.current) {
        containerRef.current.addChild(selectedText)
      }
      selectedText.visible = true
      selectedText.alpha = 1
    }
    
    appRef.current.render()
  }, [appRef, containerRef])

  // 씬 선택 (씬 클릭할 때와 재생 버튼 눌렀을 때 모두 사용)
  const handleSceneSelect = (index: number, skipStopPlaying: boolean = false, onTransitionComplete?: () => void) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:701',message:'handleSceneSelect 시작',data:{index,skipStopPlaying,isPlaying,currentSceneIndex,lastRenderedSceneIndexRef:lastRenderedSceneIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!timeline) return
    
    // 재생 중이 아니거나 skipStopPlaying이 false일 때만 재생 중지
    if (isPlaying && !skipStopPlaying) {
      setIsPlaying(false)
    }
    
    let timeUntilScene = 0
    for (let i = 0; i < index; i++) {
      timeUntilScene += timeline.scenes[i].duration + (timeline.scenes[i].transitionDuration || 0.5)
    }
    
    // 전환 효과 미리보기 활성화
    setIsPreviewingTransition(true)
    
    // 이전 씬 인덱스 계산
    // 씬 리스트에서 선택할 때: 현재 렌더링된 씬을 이전 씬으로 사용
    // 같은 씬을 다시 선택하는 경우: null로 설정하여 페이드 인 효과 적용
    let prevIndex: number | null = null
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:723',message:'prevIndex 계산 전 조건 확인',data:{skipStopPlaying,lastRenderedSceneIndexRef:lastRenderedSceneIndexRef.current,index,currentSceneIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (skipStopPlaying && lastRenderedSceneIndexRef.current === index && index === currentSceneIndex) {
      // 재생 시작 시 현재 씬을 다시 선택: 이전 씬으로 설정
      // 첫 씬일 때는 null로 설정하여 페이드 인 효과가 나타나도록 함
      if (index > 0) {
        prevIndex = index - 1
      } else {
        // 첫 씬일 때는 null로 설정하여 페이드 인 효과 적용
        prevIndex = null
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:725',message:'재생 시작 시 현재 씬 재선택 감지',data:{prevIndex,index},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } else {
      // 씬 리스트에서 선택할 때: 현재 렌더링된 씬을 이전 씬으로 사용
      // 같은 씬을 다시 선택하는 경우: null로 설정하여 페이드 인 효과 적용
      if (lastRenderedSceneIndexRef.current !== null && lastRenderedSceneIndexRef.current !== index) {
        // 다른 씬에서 선택된 씬으로 전환
        prevIndex = lastRenderedSceneIndexRef.current
      } else if (lastRenderedSceneIndexRef.current === index) {
        // 같은 씬을 다시 선택: 페이드 인 효과 적용
        prevIndex = null
      } else {
        // 처음 선택하는 경우: index > 0이면 이전 씬으로, 아니면 null
        prevIndex = index > 0 ? index - 1 : null
      }
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:720',message:'prevIndex 계산',data:{prevIndex,lastRenderedSceneIndexRef:lastRenderedSceneIndexRef.current,index},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // 씬 선택
    isManualSceneSelectRef.current = true
    currentSceneIndexRef.current = index
    setCurrentTime(timeUntilScene)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:727',message:'플래그 설정',data:{isManualSceneSelectRef:isManualSceneSelectRef.current,isPreviewingTransition:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // 선택된 씬의 전환 효과 가져오기
    const selectedScene = timeline.scenes[index]
    const transition = selectedScene?.transition || 'fade'
    
    // 씬 리스트에서 선택할 때는 이전 씬을 보여주지 않고 검은 캔버스에서 시작
    // previousIndex를 null로 설정하여 페이드 인 효과처럼 보이게 함
    if (!skipStopPlaying) {
      prevIndex = null
    }
    
    requestAnimationFrame(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:730',message:'updateCurrentScene 호출 전',data:{index,prevIndex,transition,skipStopPlaying,isPlayingRef:isPlayingRef.current,hasOnTransitionComplete:!!onTransitionComplete},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      // 씬 리스트에서 선택할 때와 재생 중일 때 모두 전환 효과 적용
      const transitionCompleteCallback = () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:763',message:'전환 효과 완료, 씬 렌더링 완료',data:{index,isPlayingRef:isPlayingRef.current,skipStopPlaying},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        // 전환 효과 완료 후 lastRenderedSceneIndexRef 업데이트
      lastRenderedSceneIndexRef.current = index
      previousSceneIndexRef.current = index
      
        // 씬리스트에서 현재 렌더링 중인 씬을 선택 상태로 표시하기 위해 currentSceneIndex 업데이트
        // 재생 중이어도 씬리스트 표시를 위해 업데이트 (useEffect는 isPlaying 체크로 방지)
        setCurrentSceneIndex(index)
        
        // 재생 중이 아닐 때만 플래그 해제
        if (!skipStopPlaying || !isPlayingRef.current) {
        setIsPreviewingTransition(false)
        isManualSceneSelectRef.current = false
        }
        
        // 전환 효과 완료 콜백 호출 (재생 중 다음 씬으로 넘어갈 때 사용)
        if (onTransitionComplete) {
          onTransitionComplete()
        }
      }
      
      // Timeline의 onComplete 콜백을 사용하여 전환 효과 완료 시점을 정확히 감지
      // 선택된 씬의 전환 효과를 forceTransition으로 전달하여 해당 씬의 전환 효과가 표시되도록 함
      updateCurrentScene(false, prevIndex, transition, transitionCompleteCallback)
    })
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
    previousSceneIndexRef, // previousSceneIndexRef 전달
  })

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  // 재생/일시정지 (씬 선택 로직을 그대로 사용)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isPlayingRef = useRef(false)
  const currentPlayIndexRef = useRef<number>(0)
  
  // isPlaying 상태와 ref 동기화
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  
  const handlePlayPause = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:794',message:'handlePlayPause 시작',data:{isPlaying,currentSceneIndex,lastRenderedSceneIndexRef:lastRenderedSceneIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!isPlaying) {
      // 재생 시작: 현재 선택된 씬부터 마지막 씬까지 순차적으로 캔버스에 렌더링
      if (!timeline) return
      
      if (!pixiReady || spritesRef.current.size === 0) {
        setIsPlaying(true)
        return
      }
      
      // 현재 씬의 스프라이트가 로드되었는지 확인
      const currentSprite = spritesRef.current.get(currentSceneIndex)
      if (!currentSprite) {
        // 스프라이트가 없으면 로드 시도
        if (pixiReady && appRef.current && containerRef.current && timeline) {
          loadAllScenes().then(() => {
            // 로드 완료 후 재생 시작
            setTimeout(() => {
              handlePlayPause()
            }, 100)
          })
        }
        return
      }
      
      // isPlayingRef를 먼저 설정하여 handleSceneSelect에서 올바르게 인식되도록 함
      isPlayingRef.current = true
      setIsPlaying(true)
      
      // 재생 시작 시 현재 씬을 다시 선택하기 위해 lastRenderedSceneIndexRef를 현재 씬으로 설정
      // handleSceneSelect에서 재생 중이고 현재 씬을 다시 선택하는 경우를 감지하여
      // prevIndex를 이전 씬으로 계산하도록 함
      const prevLastRendered = lastRenderedSceneIndexRef.current
      lastRenderedSceneIndexRef.current = currentSceneIndex
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:847',message:'lastRenderedSceneIndexRef 설정',data:{currentSceneIndex,prevLastRendered,newLastRendered:lastRenderedSceneIndexRef.current,isPlayingRef:isPlayingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // 현재 선택된 씬부터 마지막 씬까지 순차적으로 렌더링하기 위한 인덱스
      let currentIndex = currentSceneIndex
      
      const playNextScene = () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:818',message:'playNextScene 호출',data:{isPlayingRef:isPlayingRef.current,currentIndex,isPlaying},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (!isPlayingRef.current || currentIndex >= timeline.scenes.length) {
          setIsPlaying(false)
          isPlayingRef.current = false
          return
        }
        
        const sceneIndex = currentIndex
        const scene = timeline.scenes[sceneIndex]
        const sceneDuration = scene.duration
        
        // 씬 선택 및 렌더링 (씬 클릭할 때와 똑같이 - skipStopPlaying: true로 재생 중지만 방지)
        // handleSceneSelect가 씬을 캔버스에 렌더링하고 전환 효과를 적용함
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:830',message:'handleSceneSelect 호출 전',data:{sceneIndex,isPlaying,lastRenderedSceneIndexRef:lastRenderedSceneIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        handleSceneSelect(sceneIndex, true, () => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:884',message:'전환 효과 완료 콜백 실행',data:{sceneIndex,currentIndex,isPlayingRef:isPlayingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // 전환 효과 완료 후 씬 duration만큼 대기하고 다음 씬으로 (배속 고려)
          const nextIndex = currentIndex + 1
          const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
          const waitTime = (sceneDuration * 1000) / speed // 배속이 빠를수록 대기 시간이 짧아짐
          
          if (nextIndex < timeline.scenes.length) {
            // 다음 씬이 있으면 duration 후 다음 씬으로 이동
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:888',message:'다음 씬으로 넘어가기 위해 setTimeout 설정',data:{currentIndex,nextIndex,sceneDuration,speed,waitTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
          playTimeoutRef.current = setTimeout(() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:891',message:'setTimeout 콜백 실행, playNextScene 재호출',data:{nextIndex,isPlayingRef:isPlayingRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              currentIndex = nextIndex
            if (isPlayingRef.current) {
              playNextScene()
            }
          }, waitTime)
        } else {
          // 마지막 씬이 끝나면 재생 종료
          playTimeoutRef.current = setTimeout(() => {
            setIsPlaying(false)
            isPlayingRef.current = false
          }, waitTime)
        }
        })
      }
      
      // 현재 선택된 씬부터 시작하여 마지막 씬까지 순차적으로 렌더링
      // playNextScene이 재귀적으로 호출되며 각 씬을 캔버스에 렌더링함
      playNextScene()
    } else {
      // 재생 중지
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current)
        playTimeoutRef.current = null
      }
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }
  
  // 재생 중지 시 timeout 정리
  useEffect(() => {
    if (!isPlaying && playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current)
      playTimeoutRef.current = null
    }
  }, [isPlaying])

  // 재생 중이 아닐 때 씬 변경 처리 (씬 선택 로직은 handleSceneSelect에서 처리)
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:871',message:'useEffect 씬 변경 처리 실행',data:{isPlaying,isManualSceneSelectRef:isManualSceneSelectRef.current,isPreviewingTransition,currentSceneIndex,lastRenderedSceneIndexRef:lastRenderedSceneIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!timeline || timeline.scenes.length === 0) return
    if (isPlaying) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:873',message:'useEffect: 재생 중이므로 리턴',data:{isPlaying},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return // 재생 중일 때는 handleSceneSelect가 처리하므로 여기서는 처리하지 않음
    }
    if (isManualSceneSelectRef.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:874',message:'useEffect: 수동 씬 선택 중이므로 리턴',data:{isManualSceneSelectRef:isManualSceneSelectRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return // 수동 씬 선택 중일 때는 handleSceneSelect가 처리하므로 여기서는 처리하지 않음
    }
    if (isPreviewingTransition) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:875',message:'useEffect: 전환 효과 미리보기 중이므로 리턴',data:{isPreviewingTransition},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return // 전환 효과 미리보기 중일 때는 handleSceneSelect가 처리하므로 여기서는 처리하지 않음
    }
    
    // 전환 효과가 진행 중인지 확인
    let hasActiveAnimation = false
    activeAnimationsRef.current.forEach((anim) => {
      if (anim && anim.isActive && anim.isActive()) {
        hasActiveAnimation = true
      }
    })
    if (hasActiveAnimation) {
      return
    }
    
    const lastRenderedIndex = lastRenderedSceneIndexRef.current
    if (lastRenderedIndex !== currentSceneIndex) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'step4/page.tsx:890',message:'useEffect: updateCurrentScene(true) 호출',data:{lastRenderedIndex,currentSceneIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      // 재생 중이 아닐 때는 즉시 표시
      currentSceneIndexRef.current = currentSceneIndex
      updateCurrentScene(true)
      lastRenderedSceneIndexRef.current = currentSceneIndex
      previousSceneIndexRef.current = currentSceneIndex
    }
  }, [currentSceneIndex, isPlaying, timeline, updateCurrentScene, isPreviewingTransition, activeAnimationsRef])

  // 씬 편집 핸들러들
  const {
    handleSceneScriptChange,
    handleSceneDurationChange,
    handleSceneTransitionChange: originalHandleSceneTransitionChange,
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
    isPreviewingTransition, // 전환 효과 미리보기 중인지 확인용
    isManualSceneSelectRef,
    lastRenderedSceneIndexRef, // 전환 효과 미리보기용
    pixiReady,
    appRef,
    containerRef,
    loadAllScenes,
    setPlaybackSpeed,
  })

  // 씬 분할: 같은 이미지로 유지하면서 스크립트를 문장 단위로 나누어 여러 프레임으로 분리
  const handleSceneSplit = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      const { sceneScripts: splitScripts, timelineScenes: splitTimelineScenes } =
        splitSceneBySentences({
          sceneScript: targetSceneScript,
          timelineScene: targetTimelineScene,
        })

      // 분할 불가(문장 1개 이하)이면 아무 것도 하지 않음
      if (splitScripts.length <= 1) {
        return
      }

      // scenes 배열 재구성 (기존 하나를 분할된 여러 개로 교체)
      // 분할된 씬들은 원본 sceneId를 유지하고 splitIndex를 가지므로 sceneId 재할당 불필요
      const newScenes = [
        ...scenes.slice(0, index),
        ...splitScripts,
        ...scenes.slice(index + 1),
      ]

      // timeline.scenes 배열도 동일하게 분할/재구성
      // 분할된 씬들은 원본 sceneId를 유지
      const newTimelineScenes = [
        ...timeline.scenes.slice(0, index),
        ...splitTimelineScenes,
        ...timeline.scenes.slice(index + 1),
      ]

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })
    },
    [scenes, timeline, setScenes, setTimeline]
  )

  // 씬 삭제
  const handleSceneDelete = useCallback(
    (index: number) => {
      if (!timeline || scenes.length <= 1) {
        alert('최소 1개의 씬이 필요합니다.')
        return
      }

      // scenes 배열에서 삭제
      const newScenes = scenes
        .filter((_, i) => i !== index)
        .map((scene, i) => ({
          ...scene,
          sceneId: i + 1, // sceneId 재할당
        }))

      // timeline.scenes 배열에서도 삭제
      const newTimelineScenes = timeline.scenes
        .filter((_, i) => i !== index)
        .map((scene, i) => ({
          ...scene,
          sceneId: i + 1,
        }))

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })

      // 현재 선택된 씬 인덱스 조정
      if (currentSceneIndex >= newScenes.length) {
        // 삭제된 씬이 마지막이었으면 이전 씬 선택
        setCurrentSceneIndex(Math.max(0, newScenes.length - 1))
        currentSceneIndexRef.current = Math.max(0, newScenes.length - 1)
      } else if (currentSceneIndex === index) {
        // 삭제된 씬이 현재 선택된 씬이면 다음 씬 선택 (없으면 이전 씬)
        setCurrentSceneIndex(Math.min(index, newScenes.length - 1))
        currentSceneIndexRef.current = Math.min(index, newScenes.length - 1)
      }
    },
    [scenes, timeline, currentSceneIndex, setScenes, setTimeline, setCurrentSceneIndex]
  )

  // 씬 복사
  const handleSceneDuplicate = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      // 복제된 씬 생성 (index + 1 위치에 삽입)
      const duplicatedSceneScript: SceneScript = {
        ...targetSceneScript,
        sceneId: index + 2, // 임시 ID (재할당 예정)
      }

      const duplicatedTimelineScene: TimelineScene = {
        ...targetTimelineScene,
        sceneId: index + 2, // 임시 ID (재할당 예정)
      }

      // scenes 배열에 삽입
      const newScenes = [
        ...scenes.slice(0, index + 1),
        duplicatedSceneScript,
        ...scenes.slice(index + 1),
      ].map((scene, i) => ({
        ...scene,
        sceneId: i + 1, // sceneId 재할당
      }))

      // timeline.scenes 배열에도 삽입
      const newTimelineScenes = [
        ...timeline.scenes.slice(0, index + 1),
        duplicatedTimelineScene,
        ...timeline.scenes.slice(index + 1),
      ].map((scene, i) => ({
        ...scene,
        sceneId: i + 1,
      }))

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })

      // 복제된 씬을 선택
      setCurrentSceneIndex(index + 1)
      currentSceneIndexRef.current = index + 1
    },
    [scenes, timeline, setScenes, setTimeline, setCurrentSceneIndex]
  )

  // 전환 효과 변경 핸들러 래핑: currentSceneIndexRef를 먼저 설정
  const handleSceneTransitionChange = useCallback((index: number, value: string) => {
    // currentSceneIndexRef를 먼저 설정하여 updateCurrentScene이 올바른 씬 인덱스를 사용하도록 함
    currentSceneIndexRef.current = index
    originalHandleSceneTransitionChange(index, value)
  }, [originalHandleSceneTransitionChange])

  // 씬 순서 변경 핸들러
  const handleSceneReorder = useCallback((newOrder: number[]) => {
    if (!timeline) return

    // scenes 배열 재정렬
    const reorderedScenes = newOrder.map((oldIndex) => scenes[oldIndex])
    setScenes(reorderedScenes)

    // timeline의 scenes도 재정렬
    const reorderedTimelineScenes = newOrder.map((oldIndex) => timeline.scenes[oldIndex])
    setTimeline({
      ...timeline,
      scenes: reorderedTimelineScenes,
    })

    // 현재 선택된 씬 인덱스 업데이트
    const currentOldIndex = newOrder.indexOf(currentSceneIndex)
    if (currentOldIndex !== -1) {
      setCurrentSceneIndex(currentOldIndex)
      currentSceneIndexRef.current = currentOldIndex
    }
  }, [scenes, timeline, currentSceneIndex, setScenes, setTimeline, setCurrentSceneIndex])

  // PixiJS 컨테이너에 빈 공간 클릭 감지 추가
  useEffect(() => {
    if (!containerRef.current || !appRef.current || useFabricEditing || !pixiReady) return

    const container = containerRef.current
    const app = appRef.current

    // 컨테이너에 클릭 이벤트 추가 (빈 공간 클릭 감지)
    const handleContainerClick = (e: PIXI.FederatedPointerEvent) => {
      // 클릭한 위치에서 hit test 수행
      const clickedSprite = spritesRef.current.get(currentSceneIndexRef.current)
      const clickedText = textsRef.current.get(currentSceneIndexRef.current)
      
      // 핸들 클릭인지 확인
      const clickedOnHandle = editHandlesRef.current.get(currentSceneIndexRef.current)?.children.some(handle => {
        if (handle instanceof PIXI.Graphics) {
          const handleBounds = handle.getBounds()
          return e.global.x >= handleBounds.x && e.global.x <= handleBounds.x + handleBounds.width &&
                 e.global.y >= handleBounds.y && e.global.y <= handleBounds.y + handleBounds.height
        }
        return false
      }) || textEditHandlesRef.current.get(currentSceneIndexRef.current)?.children.some(handle => {
        if (handle instanceof PIXI.Graphics) {
          const handleBounds = handle.getBounds()
          return e.global.x >= handleBounds.x && e.global.x <= handleBounds.x + handleBounds.width &&
                 e.global.y >= handleBounds.y && e.global.y <= handleBounds.y + handleBounds.height
        }
        return false
      })

      // 스프라이트나 텍스트를 클릭하지 않고, 핸들도 클릭하지 않은 경우 (빈 공간)
      const spriteBounds = clickedSprite?.getBounds()
      const clickedOnSprite = spriteBounds && 
        e.global.x >= spriteBounds.x && e.global.x <= spriteBounds.x + spriteBounds.width &&
        e.global.y >= spriteBounds.y && e.global.y <= spriteBounds.y + spriteBounds.height
      
      const textBounds = clickedText?.getBounds()
      const clickedOnText = textBounds &&
        e.global.x >= textBounds.x && e.global.x <= textBounds.x + textBounds.width &&
        e.global.y >= textBounds.y && e.global.y <= textBounds.y + textBounds.height
      
      if (!clickedOnHandle && !clickedOnSprite && !clickedOnText) {
        // 빈 공간 클릭: 선택 해제 및 편집 모드 종료
        setSelectedElementIndex(null)
        setSelectedElementType(null)
        setEditMode('none')
      }
    }

    container.interactive = true
    container.on('pointerdown', handleContainerClick)

    return () => {
      container.off('pointerdown', handleContainerClick)
    }
  }, [containerRef, appRef, useFabricEditing, pixiReady, currentSceneIndexRef, spritesRef, textsRef, editHandlesRef, textEditHandlesRef, setSelectedElementIndex, setSelectedElementType, setEditMode])

  // Pixi 캔버스 포인터 이벤트 제어 및 Fabric 편집 시 숨김
  // 재생 중 또는 전환 효과 미리보기 중일 때는 PixiJS를 보여서 전환 효과가 보이도록 함
  useEffect(() => {
    if (!pixiContainerRef.current) return
    const pixiCanvas = pixiContainerRef.current.querySelector('canvas:not([data-fabric])') as HTMLCanvasElement
    if (!pixiCanvas) return
    
    // 재생 중이거나 전환 효과 미리보기 중이면 항상 PixiJS 보이기
    // 재생 중에는 isPreviewingTransition이 false여도 PixiJS를 보여야 함
    if (isPlaying || isPreviewingTransition) {
      pixiCanvas.style.opacity = '1'
      pixiCanvas.style.pointerEvents = 'none'
      pixiCanvas.style.zIndex = '10'
    } else if (useFabricEditing && fabricReady) {
      // Fabric.js 편집 활성화 시 PixiJS 캔버스 숨김
      pixiCanvas.style.opacity = '0'
      pixiCanvas.style.pointerEvents = 'none'
      pixiCanvas.style.zIndex = '1'
    } else {
      // PixiJS 편집 모드: editMode가 'none'이 아니어도 보임 (편집 중에도 보여야 함)
      pixiCanvas.style.opacity = '1'
      pixiCanvas.style.pointerEvents = 'auto'
      pixiCanvas.style.zIndex = '10'
    }
  }, [useFabricEditing, fabricReady, pixiReady, isPlaying, isPreviewingTransition, editMode])

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



  // 선택된 요소에 따라 편집 모드 자동 설정
  useEffect(() => {
    // 선택이 해제되면 편집 모드도 해제
    if (selectedElementIndex === null && selectedElementType === null) {
      if (editMode !== 'none') {
        setEditMode('none')
      }
      return
    }
    
    // 선택된 요소 타입에 따라 편집 모드 설정
    if (selectedElementType === 'image' && editMode !== 'image') {
      setEditMode('image')
    } else if (selectedElementType === 'text' && editMode !== 'text') {
      setEditMode('text')
    }
  }, [selectedElementIndex, selectedElementType, editMode])

  // 현재 씬 변경 시 드래그 설정 재적용
  useEffect(() => {
    if (!containerRef.current || !timeline) {
      return
    }

    // 재생 중일 때는 드래그 설정을 하지 않음 (전환 효과가 보이도록)
    if (isPlaying) {
      return
    }

    // 재생 중이 아닐 때만 드래그 설정
    const setupDrag = () => {
      const currentSprite = spritesRef.current.get(currentSceneIndexRef.current)
      const currentText = textsRef.current.get(currentSceneIndexRef.current)
      
      if (currentSprite) {
        setupSpriteDrag(currentSprite, currentSceneIndexRef.current)
      }
      
      if (currentText) {
        setupTextDrag(currentText, currentSceneIndexRef.current)
      }

      if (appRef.current) {
        appRef.current.render()
      }
    }

    // 전환 효과 미리보기 중일 때는 약간의 지연
    if (isPreviewingTransition) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setupDrag()
        })
      })
    } else {
      // 일반적인 경우 즉시 실행
      setupDrag()
    }
  }, [currentSceneIndex, timeline, setupSpriteDrag, setupTextDrag, isPlaying, isPreviewingTransition])

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
      // 편집 모드가 none이면 선택도 해제 (단, 이미 null이 아닐 때만 - 무한 루프 방지)
      if (selectedElementIndex !== null || selectedElementType !== null) {
        setSelectedElementIndex(null)
        setSelectedElementType(null)
      }
    } else if (editMode === 'image' && selectedElementIndex !== null && selectedElementType === 'image') {
      // 선택된 이미지 요소가 있으면 핸들 표시 (이미 핸들이 있으면 다시 그리지 않음)
      const sprite = spritesRef.current.get(selectedElementIndex)
      if (sprite && sprite.visible) {
        const existingHandles = editHandlesRef.current.get(selectedElementIndex)
        if (!existingHandles || !existingHandles.parent) {
          drawEditHandles(sprite, selectedElementIndex, handleResize, saveImageTransform)
        }
        setupSpriteDrag(sprite, selectedElementIndex)
      }
    } else if (editMode === 'text' && selectedElementIndex !== null && selectedElementType === 'text') {
      // 선택된 텍스트 요소가 있으면 핸들 표시 (이미 핸들이 있으면 다시 그리지 않음)
      const text = textsRef.current.get(selectedElementIndex)
      if (text && text.visible) {
        const existingHandles = textEditHandlesRef.current.get(selectedElementIndex)
        if (!existingHandles || !existingHandles.parent) {
          drawTextEditHandles(text, selectedElementIndex, handleTextResize, saveTextTransform)
        }
        setupTextDrag(text, selectedElementIndex)
      }
    }

    if (appRef.current) {
      appRef.current.render()
    }
  }, [editMode, selectedElementIndex, selectedElementType, timeline, drawEditHandles, setupSpriteDrag, handleResize, saveImageTransform, drawTextEditHandles, setupTextDrag, handleTextResize, saveTextTransform, editHandlesRef, textEditHandlesRef])

  // 격자 그리기 함수 (이미지/자막 배치 가이드)
  const drawGrid = useCallback(() => {
    if (!appRef.current) {
      return
    }

    // 기존 격자 제거
    if (gridGraphicsRef.current && gridGraphicsRef.current.parent) {
      gridGraphicsRef.current.parent.removeChild(gridGraphicsRef.current)
      gridGraphicsRef.current.destroy()
      gridGraphicsRef.current = null
    }

    if (!showGrid) {
      return
    }

    const { width, height } = stageDimensions
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

    if (appRef.current) {
      appRef.current.render()
    }
  }, [showGrid, stageDimensions])

  // 격자 표시/숨김
  useEffect(() => {
    if (!pixiReady || !appRef.current) return
    drawGrid()
    // 격자 표시 시 canvas 크기에 맞춰 오버레이도 업데이트되도록 강제 리렌더링
    if (showGrid) {
      requestAnimationFrame(() => {
        if (appRef.current) {
          appRef.current.render()
        }
      })
    }
  }, [showGrid, pixiReady, drawGrid])

  // Canvas 실제 크기 계산 (container div와 동기화용)
  const canvasDisplaySize = useMemo(() => {
    if (!appRef.current || !pixiContainerRef.current) return null
    const canvas = appRef.current.canvas
    const canvasRect = canvas.getBoundingClientRect()
    const actualWidth = canvasRect.width > 0 ? canvasRect.width : (parseFloat(canvas.style.width) || parseFloat(canvasSize.width.replace('px', '')) || 0)
    const actualHeight = canvasRect.height > 0 ? canvasRect.height : (parseFloat(canvas.style.height) || parseFloat(canvasSize.height.replace('px', '')) || 0)
    
    if (actualWidth <= 0 || actualHeight <= 0) return null
    
    return { width: actualWidth, height: actualHeight }
  }, [canvasSize, pixiReady])

  // 격자 오버레이 크기 계산 (canvas 실제 크기 사용)
  const gridOverlaySize = useMemo(() => {
    if (!showGrid || !canvasDisplaySize) return null
    return canvasDisplaySize
  }, [showGrid, canvasDisplaySize])

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
      // 고급 효과 변경 시 즉시 표시 (전환 효과 없이)
      updateCurrentScene(true)
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
    // 타임라인 클릭 시 즉시 표시 (전환 효과 없이)
    updateCurrentScene(true)
    lastRenderedSceneIndexRef.current = sceneIndex
    previousSceneIndexRef.current = sceneIndex
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
      // 타임라인 드래그 시 즉시 표시 (전환 효과 없이)
      updateCurrentScene(true)
      lastRenderedSceneIndexRef.current = sceneIndex
      previousSceneIndexRef.current = sceneIndex
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
    'none': '없음',
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
    { value: 'none', label: '없음' },
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

      // JSON 바디 확인용 로그
      console.log('=== 인코딩 요청 JSON 바디 ===')
      console.log(JSON.stringify(exportData, null, 2))
      console.log('===========================')

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
      alert(`영상 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const sceneThumbnails = useMemo(
    () => scenes.map((scene, index) => {
      const url = scene.imageUrl || selectedImages[index] || ''
      if (!url) return ''
      
      // URL 검증 및 수정
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }
      if (url.startsWith('//')) {
        return `https:${url}`
      }
      if (url.startsWith('/')) {
        return url // 상대 경로는 그대로 사용
      }
      // 잘못된 URL인 경우 기본 placeholder 반환
      return `https://via.placeholder.com/200x200/a78bfa/ffffff?text=Scene${index + 1}`
    }),
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
            >
              <div
                ref={pixiContainerRef}
                className="relative bg-black"
                style={{ 
                  width: canvasDisplaySize ? `${canvasDisplaySize.width}px` : '100%',
                  height: canvasDisplaySize ? `${canvasDisplaySize.height}px` : '100%',
                  aspectRatio: canvasDisplaySize ? undefined : '9 / 16',
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                {/* 격자 오버레이 (크기 조정하기 템플릿 가이드) */}
                {gridOverlaySize && (
                  <div 
                    className="absolute pointer-events-none z-50"
                    style={{ 
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: `${gridOverlaySize.width}px`,
                      height: `${gridOverlaySize.height}px`,
                    }}
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
                  className="h-full rounded-full"
                  style={{
                    width: `${progressRatio * 100}%`,
                    backgroundColor: '#8b5cf6',
                    transition: isPlaying ? 'none' : 'width 0.1s ease-out'
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
                      // Canvas 크기 재계산
                      if (pixiContainerRef.current && appRef.current) {
                        const container = pixiContainerRef.current
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
                          
                          const canvas = appRef.current.canvas
                          canvas.style.width = `${displayWidth}px`
                          canvas.style.height = `${displayHeight}px`
                          setCanvasSize({ width: `${displayWidth}px`, height: `${displayHeight}px` })
                          appRef.current.render()
                        }
                      }
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
              onReorder={handleSceneReorder}
              onSplitScene={handleSceneSplit}
              onDeleteScene={handleSceneDelete}
              onDuplicateScene={handleSceneDuplicate}
            />
          </div>
        </div>

        {/* 오른쪽 패널: 효과 설정 */}
        <div className="w-[30%] flex flex-col h-full overflow-hidden" style={{
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          backgroundColor: theme === 'dark' ? '#111827' : '#ffffff'
        }}>
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
