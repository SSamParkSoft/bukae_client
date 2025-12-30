'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Pause, Clock, Edit2, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, Grid3x3, Loader2 } from 'lucide-react'
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
import { splitSceneBySentences, insertSceneDelimiters } from '@/lib/utils/scene-splitter'
import { makeMarkupFromPlainText } from '@/lib/tts/auto-pause'
import { resolveSubtitleFontFamily, SUBTITLE_DEFAULT_FONT_ID, loadSubtitleFont, isSubtitleFontId, getFontFileName } from '@/lib/subtitle-fonts'
import { authStorage } from '@/lib/api/auth-storage'
import { authApi } from '@/lib/api/auth'
import { useUserStore } from '@/store/useUserStore'
import { ApiError } from '@/lib/api/client'
import { bgmTemplates, getBgmTemplateUrlSync, type BgmTemplate } from '@/lib/data/templates'
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
    setSelectedImages,
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
    selectedProducts,
    videoTitle,
    videoDescription,
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
  const [isTtsBootstrapping, setIsTtsBootstrapping] = useState(false) // 첫 씬 TTS 로딩 상태
  const isTtsBootstrappingRef = useRef(false) // 클로저에서 최신 값 참조용
  const [confirmedBgmTemplate, setConfirmedBgmTemplate] = useState<string | null>(bgmTemplate) // 확정된 BGM
  const [isBgmBootstrapping, setIsBgmBootstrapping] = useState(false) // BGM 로딩 상태
  const isBgmBootstrappingRef = useRef(false) // 클로저에서 최신 값 참조용
  const [showReadyMessage, setShowReadyMessage] = useState(false) // "재생이 가능해요!" 메시지 표시 여부
  const [isPreparing, setIsPreparing] = useState(false) // 모든 TTS 합성 준비 중인지 여부
  const [isExporting, setIsExporting] = useState(false) // 내보내기 진행 중 여부
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  // 스크립트가 변경된 씬 추적 (재생 시 강제 재생성)
  const changedScenesRef = useRef<Set<number>>(new Set())

  // 토큰 검증
  useEffect(() => {
    const validateToken = async () => {
      try {
        const token = authStorage.getAccessToken()
        if (!token) {
          router.replace('/login')
          return
        }

        // 토큰 유효성 검증
        await authApi.getCurrentUser()
        setIsValidatingToken(false)
      } catch (error) {
        // ApiError인 경우에만 상태 코드 확인
        if (error instanceof ApiError && error.status === 401) {
          // 401 에러인 경우: apiRequest에서 이미 auth:expired 이벤트를 발생시켰으므로
          // AuthSync가 자동으로 처리함 (토큰 정리 + 로그인 페이지 리다이렉트)
          // 여기서는 조용히 처리하고 검증 상태는 유지 (AuthSync가 리다이렉트할 것임)
          // 하지만 리다이렉트가 즉시 일어나지 않을 수 있으므로 짧은 딜레이 후에도 리다이렉트되지 않으면 검증 상태 해제
          setTimeout(() => {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              setIsValidatingToken(false)
            }
          }, 1000)
          return
        }
        
        // 401이 아닌 에러 (네트워크 에러, 타임아웃 등)는 검증 상태만 해제
        // 사용자가 계속 시도할 수 있도록 페이지는 표시
        console.error('[Step4] 토큰 검증 실패 (401 아님):', error)
        setIsValidatingToken(false)
      }
    }

    validateToken()
  }, [router])

  // 클라이언트에서만 렌더링 (SSR/Hydration mismatch 방지)
  useEffect(() => {
    setMounted(true)
  }, [])

  // bgmTemplate이 변경되면 confirmedBgmTemplate도 초기화
  useEffect(() => {
    if (bgmTemplate !== confirmedBgmTemplate) {
      // bgmTemplate이 변경되었지만 아직 확정되지 않은 경우에만 초기화하지 않음
      // 사용자가 직접 확정한 경우는 유지
    }
  }, [bgmTemplate])

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
          imageFit: existingScene?.imageFit || 'contain', // 기본값을 contain으로 변경하여 이미지 비율을 유지하면서 영역에 맞춤
          text: {
            content: scene.script,
            font: existingScene?.text?.font ?? subtitleFont ?? SUBTITLE_DEFAULT_FONT_ID,
            fontWeight: existingScene?.text?.fontWeight ?? 700,
            color: subtitleColor || '#ffffff',
            position: subtitlePosition || 'center',
            fontSize: existingScene?.text?.fontSize || 80,
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

  // 재생 상태 ref (usePixiEffects에서 사용하기 위해 먼저 선언)
  const isPlayingRef = useRef(false)

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
    isPlayingRef, // 재생 중인지 확인용
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
        const baseFontSize = textbox.fontSize ?? 48
        const textScaleY = textbox.scaleY ?? 1
        // 실제 표시되는 폰트 크기 계산 후 좌표계 역변환
        const actualFontSize = baseFontSize * textScaleY * invScale
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
      const scaledFontSize = target.fontSize ?? 48
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
      const baseFontSize = target.fontSize ?? 48
      const textScaleY = target.scaleY ?? 1
      const actualFontSize = baseFontSize * textScaleY * invScale
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
               prevScene.text?.position !== scene.text?.position ||
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
      text: scene.text ? { content: scene.text.content, position: scene.text.position } : null,
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
      const currentScene = timeline.scenes[i]
      const nextScene = timeline.scenes[i + 1]
      // 같은 sceneId를 가진 씬들 사이에서는 transitionDuration을 0으로 계산
      const isSameSceneId = nextScene && currentScene.sceneId === nextScene.sceneId
      const transitionDuration = isSameSceneId ? 0 : (currentScene.transitionDuration || 0.5)
      time += currentScene.duration + transitionDuration
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
    if (!timeline) return
    
    // 재생 중이 아니거나 skipStopPlaying이 false일 때만 재생 중지
    if (isPlaying && !skipStopPlaying) {
      setIsPlaying(false)
      resetTtsSession()
    }
    
    // 씬 클릭 시 즉시 수동 선택 플래그 설정하여 우선순위 확보
    isManualSceneSelectRef.current = true
    currentSceneIndexRef.current = index
    // currentSceneIndex 상태도 즉시 업데이트하여 재생 버튼이 올바른 씬부터 시작하도록 함
    setCurrentSceneIndex(index)
    
    // 진행 중인 애니메이션 중지
    activeAnimationsRef.current.forEach((tl) => {
      if (tl && tl.isActive()) {
        tl.kill()
      }
    })
    activeAnimationsRef.current.clear()
    
    let timeUntilScene = 0
    for (let i = 0; i < index; i++) {
      const scene = timeline.scenes[i]
      const isLastScene = i === timeline.scenes.length - 1
      const nextScene = !isLastScene ? timeline.scenes[i + 1] : null
      const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
      // 같은 그룹 내 씬들 사이에서는 transitionDuration을 0으로 계산
      const transitionDuration = isLastScene ? 0 : (isSameSceneId ? 0 : (scene.transitionDuration || 0.5))
      timeUntilScene += scene.duration + transitionDuration
    }
    
    // 전환 효과 미리보기 활성화
    setIsPreviewingTransition(true)
    
    // 이전 씬 인덱스 계산
    // 씬 리스트에서 선택할 때: 현재 렌더링된 씬을 이전 씬으로 사용
    // 같은 씬을 다시 선택하는 경우: null로 설정하여 페이드 인 효과 적용
    let prevIndex: number | null = null
    if (skipStopPlaying) {
      // 재생 중일 때: 이전 씬 인덱스를 올바르게 설정
      if (lastRenderedSceneIndexRef.current !== null && lastRenderedSceneIndexRef.current !== index) {
        // 다른 씬에서 선택된 씬으로 전환
        prevIndex = lastRenderedSceneIndexRef.current
      } else if (index > 0) {
        // 첫 씬이 아니면 이전 씬으로 설정
        prevIndex = index - 1
      } else {
        // 첫 씬일 때는 null로 설정하여 페이드 인 효과 적용
        prevIndex = null
      }
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
    
    setCurrentTime(timeUntilScene)
    // 선택된 씬의 전환 효과 가져오기
    const selectedScene = timeline.scenes[index]
    const previousScene = prevIndex !== null ? timeline.scenes[prevIndex] : null
    // 같은 sceneId를 가진 씬들 사이에서는 transition 무시
    const isSameSceneId = previousScene && previousScene.sceneId === selectedScene?.sceneId
    const transition = isSameSceneId ? 'none' : (selectedScene?.transition || 'fade')
    
    // 씬 리스트에서 선택할 때는 이전 씬을 보여주지 않고 검은 캔버스에서 시작
    // 단, 이전 씬이 같은 그룹 내 씬이고 현재 씬도 같은 그룹의 첫 번째 씬이 아닌 경우에만 prevIndex 유지
    if (!skipStopPlaying) {
      const isFirstInGroup = index === timeline.scenes.findIndex((s) => s.sceneId === selectedScene?.sceneId)
      
      // 이전 씬이 같은 그룹이고, 현재 씬이 같은 그룹의 첫 번째 씬이 아닌 경우에만 prevIndex 유지
      // 그 외의 경우는 prevIndex를 null로 설정하여 전환 효과 적용
      const isPrevInSameGroup = previousScene && selectedScene && previousScene.sceneId === selectedScene.sceneId
      if (!isPrevInSameGroup || isFirstInGroup || !selectedScene?.sceneId) {
        prevIndex = null
      }
    }
    
    // 클릭한 씬의 렌더링을 즉시 시작하도록 우선순위 확보
    lastRenderedSceneIndexRef.current = index
    
    // 같은 그룹 내 다음 씬으로 자동 전환하는 함수
    const autoAdvanceToNextInGroup = (currentIdx: number) => {
      console.log(`[handleSceneSelect] autoAdvanceToNextInGroup 호출: currentIdx=${currentIdx}, voiceTemplate=${!!voiceTemplate}, isPlaying=${isPlayingRef.current}`)
      
      if (isPlayingRef.current) {
        console.log(`[handleSceneSelect] 재생 중이므로 자동 전환 중지`)
        return
      }
      
      const currentScene = timeline.scenes[currentIdx]
      if (!currentScene) {
        console.log(`[handleSceneSelect] currentScene이 null입니다`)
        return
      }
      
      const nextScene = currentIdx + 1 < timeline.scenes.length ? timeline.scenes[currentIdx + 1] : null
      const isNextInSameGroup = nextScene && nextScene.sceneId === currentScene.sceneId
      
      console.log(`[handleSceneSelect] 다음 씬 확인: nextScene=${!!nextScene}, isNextInSameGroup=${isNextInSameGroup}, currentSceneId=${currentScene.sceneId}, nextSceneId=${nextScene?.sceneId}`)
      
      if (!isNextInSameGroup) {
        console.log(`[handleSceneSelect] 같은 그룹 내 다음 씬이 없으므로 종료`)
        return
      }
      
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      let waitTime = 0
      
      // TTS 재생 및 duration 후 자동 전환
      if (voiceTemplate) {
        const markups = buildSceneMarkup(currentIdx)
        // TODO: 각 구간별로 순차 재생하도록 수정 필요
        const markup = markups.length > 0 ? markups[0] : null
        const key = markup ? makeTtsKey(voiceTemplate, markup) : null
        const cached = key ? ttsCacheRef.current.get(key) : null
        
        if (cached) {
          const { blob, durationSec } = cached
          stopTtsAudio()
          const url = URL.createObjectURL(blob)
          ttsAudioUrlRef.current = url
          const audio = new Audio(url)
          audio.playbackRate = speed
          ttsAudioRef.current = audio
          audio.onended = () => stopTtsAudio()
          audio.play().catch(() => {})
          
          const sceneDuration = durationSec > 0 ? durationSec : currentScene.duration
          waitTime = (sceneDuration * 1000) / speed
          console.log(`[handleSceneSelect] TTS 캐시 사용: duration=${durationSec}, waitTime=${waitTime}`)
        } else {
          // 캐시에 없으면 fallback duration 사용
          const fallbackDuration = currentScene.duration
          waitTime = (fallbackDuration * 1000) / speed
          console.log(`[handleSceneSelect] TTS 캐시 없음, fallback duration 사용: waitTime=${waitTime}`)
        }
      } else {
        // voiceTemplate이 없으면 fallback duration 사용
        const fallbackDuration = currentScene.duration
        waitTime = (fallbackDuration * 1000) / speed
        console.log(`[handleSceneSelect] voiceTemplate 없음, fallback duration 사용: waitTime=${waitTime}`)
      }
      
      if (waitTime <= 0) {
        console.log(`[handleSceneSelect] waitTime이 0 이하이므로 즉시 전환`)
        waitTime = 1000 // 최소 1초 대기
      }
      
      playTimeoutRef.current = setTimeout(() => {
        console.log(`[handleSceneSelect] setTimeout 실행: currentIdx=${currentIdx} -> nextIndex=${currentIdx + 1}`)
        // 같은 그룹 내의 다음 씬으로 넘어갈 때는 자막만 변경
        const nextIndex = currentIdx + 1
        setCurrentSceneIndex(nextIndex)
        currentSceneIndexRef.current = nextIndex
        lastRenderedSceneIndexRef.current = nextIndex
        
        // updateCurrentScene을 직접 호출하여 자막만 변경
        // previousIndex는 currentIdx (현재 씬이 이전 씬이 됨)로 전달하여 같은 그룹으로 인식되도록 함
        updateCurrentScene(false, currentIdx, undefined, () => {
          console.log(`[handleSceneSelect] updateCurrentScene 완료, 다음 씬으로 재귀 호출`)
          // 자막 변경 완료 후 재귀적으로 다음 씬 처리
          autoAdvanceToNextInGroup(nextIndex)
        })
      }, waitTime)
    }
    
    requestAnimationFrame(() => {
      // 씬 리스트에서 선택할 때와 재생 중일 때 모두 전환 효과 적용
      const transitionCompleteCallback = () => {
        
        // 전환 효과 완료 후 lastRenderedSceneIndexRef 업데이트
        lastRenderedSceneIndexRef.current = index
        previousSceneIndexRef.current = index
      
        // currentSceneIndex는 이미 handleSceneSelect 시작 부분에서 업데이트되었으므로
        // 여기서는 중복 업데이트하지 않음 (상태 업데이트는 이미 완료됨)
        
        // 재생 중이 아닐 때만 플래그 해제
        if (!skipStopPlaying || !isPlayingRef.current) {
          setIsPreviewingTransition(false)
          isManualSceneSelectRef.current = false
        }
        
        // 전환 효과 완료 콜백 호출 (재생 중 다음 씬으로 넘어갈 때 사용)
        if (onTransitionComplete) {
          onTransitionComplete()
        }
        
        // 수동으로 씬을 클릭한 경우(!skipStopPlaying)에는 자동 전환하지 않음
        // 재생 중일 때만 자동 전환 (skipStopPlaying이 true일 때)
        if (skipStopPlaying && !isPlayingRef.current) {
          console.log(`[handleSceneSelect] transitionCompleteCallback에서 autoAdvanceToNextInGroup 호출: index=${index}`)
          // 약간의 지연을 두고 호출하여 전환 효과가 완전히 완료된 후 자동 전환 시작
          setTimeout(() => {
            autoAdvanceToNextInGroup(index)
          }, 100)
        } 
      }
      
      // Timeline의 onComplete 콜백을 사용하여 전환 효과 완료 시점을 정확히 감지
      // 선택된 씬의 전환 효과를 forceTransition으로 전달하여 해당 씬의 전환 효과가 표시되도록 함
      updateCurrentScene(false, prevIndex, transition, transitionCompleteCallback)
      
      // 수동으로 씬을 클릭한 경우(!skipStopPlaying)에는 자동 전환하지 않음
      // 재생 중일 때만 자동 전환 (skipStopPlaying이 true일 때)
      if (skipStopPlaying && !isPlayingRef.current) {
        const selectedScene = timeline.scenes[index]
        const nextScene = index + 1 < timeline.scenes.length ? timeline.scenes[index + 1] : null
        const isNextInSameGroup = nextScene && nextScene.sceneId === selectedScene?.sceneId
        const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']
        const isMovementEffect = MOVEMENT_EFFECTS.includes(selectedScene?.transition || '')
        
        if (isMovementEffect && isNextInSameGroup) {
          // 움직임 효과이고 같은 그룹 내 다음 씬이 있으면, 전환 효과 시작 후 자동 전환 시도
          // onComplete가 호출되지 않을 수 있으므로 약간의 지연 후 직접 호출
          setTimeout(() => {
            console.log(`[handleSceneSelect] 움직임 효과 자동 전환 시도 (fallback): index=${index}`)
            // transitionCompleteCallback이 이미 호출되었는지 확인하고, 호출되지 않았으면 직접 호출
            if (lastRenderedSceneIndexRef.current === index) {
              autoAdvanceToNextInGroup(index)
            }
          }, 500) // 전환 효과가 시작된 후 500ms 후에 자동 전환 시도
        }
      }
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
    onSceneChange: handleSceneSelect, // 재생 중 씬 변경 시 handleSceneSelect 호출
  })

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  // 선택한 폰트가 Pixi(Canvas)에서 fallback으로 고정되지 않도록 선로딩 후 강제 리로드
  const lastSubtitleFontKeyRef = useRef<string>('')
  useEffect(() => {
    if (!pixiReady || !timeline) return
    if (isSavingTransformRef.current) return
    const scene = timeline.scenes[currentSceneIndex]
    if (!scene?.text) return

    const fontFamily = resolveSubtitleFontFamily(scene.text.font)
    const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
    const key = `${fontFamily}:${fontWeight}`
    if (lastSubtitleFontKeyRef.current === key) return
    lastSubtitleFontKeyRef.current = key

    let cancelled = false
    ;(async () => {
      try {
        // Supabase Storage에서 폰트 로드
        const fontId = scene.text.font?.trim()
        if (fontId && isSubtitleFontId(fontId)) {
          await loadSubtitleFont(fontId)
        }

        // document.fonts가 없는 환경에서는 스킵
        if (typeof document === 'undefined' || !(document as any).fonts?.load) return
        await (document as any).fonts.load(`${fontWeight} 16px ${fontFamily}`)
        if (cancelled) return
        await loadAllScenes()
      } catch {
        // ignore (fallback font로라도 렌더)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pixiReady, timeline, currentSceneIndex, loadAllScenes])

  // 재생/일시정지 (씬 선택 로직을 그대로 사용)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bgmStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bgmStartTimeRef = useRef<number | null>(null)
  // isPlayingRef는 위에서 이미 선언됨
  const currentPlayIndexRef = useRef<number>(0)

  // -----------------------------
  // TTS 재생/프리페치/캐시 (Chirp3 HD: speakingRate + markup pause 지원)
  // -----------------------------
  const ttsCacheRef = useRef(
    new Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>()
  )
  const ttsInFlightRef = useRef(
    new Map<string, Promise<{ blob: Blob; durationSec: number; markup: string; url?: string | null }>>()
  )
  const ttsAbortRef = useRef<AbortController | null>(null)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null)
  const ttsAudioUrlRef = useRef<string | null>(null)
  const scenePreviewAudioRef = useRef<HTMLAudioElement | null>(null)
  const scenePreviewAudioUrlRef = useRef<string | null>(null)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
  const bgmAudioUrlRef = useRef<string | null>(null)

  const stopTtsAudio = useCallback(() => {
    const a = ttsAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    ttsAudioRef.current = null
    if (ttsAudioUrlRef.current) {
      URL.revokeObjectURL(ttsAudioUrlRef.current)
      ttsAudioUrlRef.current = null
    }
  }, [])

  const stopScenePreviewAudio = useCallback(() => {
    const a = scenePreviewAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    scenePreviewAudioRef.current = null
    if (scenePreviewAudioUrlRef.current) {
      URL.revokeObjectURL(scenePreviewAudioUrlRef.current)
      scenePreviewAudioUrlRef.current = null
    }
  }, [])

  const resetTtsSession = useCallback(() => {
    stopTtsAudio()
    stopScenePreviewAudio()
    ttsAbortRef.current?.abort()
    ttsAbortRef.current = null
    ttsInFlightRef.current.clear()
    ttsCacheRef.current.clear()
  }, [stopTtsAudio, stopScenePreviewAudio])

  const stopBgmAudio = useCallback(() => {
    const a = bgmAudioRef.current
    if (a) {
      try {
        a.pause()
        a.currentTime = 0
      } catch {
        // ignore
      }
    }
    bgmAudioRef.current = null
    if (bgmAudioUrlRef.current) {
      URL.revokeObjectURL(bgmAudioUrlRef.current)
      bgmAudioUrlRef.current = null
    }
  }, [])

  const startBgmAudio = useCallback(async (templateId: string | null, playbackSpeed: number, shouldPlay: boolean = false): Promise<void> => {
    if (!templateId) {
      stopBgmAudio()
      return
    }

    const template = bgmTemplates.find(t => t.id === templateId)
    if (!template) {
      stopBgmAudio()
      return
    }

    try {
      const url = getBgmTemplateUrlSync(template)
      if (!url) {
        stopBgmAudio()
        return
      }

      // URL이 유효한지 확인
      if (!url.startsWith('http') && !url.startsWith('/')) {
        stopBgmAudio()
        return
      }

      // URL이 실제로 접근 가능한지 확인
      try {
        const response = await fetch(url, { method: 'HEAD' })
        if (!response.ok) {
          stopBgmAudio()
          return
        }
      } catch (fetchError) {
        stopBgmAudio()
        return
      }

      stopBgmAudio()
      const audio = new Audio(url)
      audio.loop = true
      audio.playbackRate = playbackSpeed
      bgmAudioRef.current = audio
      
      // 재생해야 하는 경우에만 재생
      if (shouldPlay) {
        // BGM이 실제로 재생될 때까지 기다리는 Promise
        const playingPromise = new Promise<void>((resolve, reject) => {
          let resolved = false
          
          const handlePlaying = () => {
            if (!resolved) {
              resolved = true
              // BGM 재생 시작 시점 기록
              bgmStartTimeRef.current = Date.now()
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              resolve()
            }
          }
          
          const handleError = () => {
            if (!resolved) {
              resolved = true
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              stopBgmAudio()
              reject(new Error('BGM 재생 실패'))
            }
          }
          
          audio.addEventListener('playing', handlePlaying)
          audio.addEventListener('error', handleError)
          
          // play() 호출
          audio.play().catch((err) => {
            if (!resolved) {
              resolved = true
              audio.removeEventListener('playing', handlePlaying)
              audio.removeEventListener('error', handleError)
              reject(err)
            }
          })
        })
        
        // 실제 재생이 시작될 때까지 기다림
        await playingPromise
      } else {
        // 로드만 하고 재생은 하지 않음
        // audio.load()를 호출하여 메타데이터 로드
        audio.load()
      }
    } catch (error) {
      stopBgmAudio()
    }
  }, [stopBgmAudio])

  const handleBgmConfirm = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplate(templateId)
  }, [])

  // voice/speakingRate/pausePreset이 바뀌면 합성 결과가 바뀌므로 캐시를 초기화
  // 목소리 변경 시 모든 캐시와 저장소 URL이 무효화되어 재업로드됨
  useEffect(() => {
    if (voiceTemplate) {
      console.log('[목소리 변경] 모든 TTS 캐시 무효화 및 재업로드 필요')
      resetTtsSession()
    }
  }, [voiceTemplate, resetTtsSession])

  const buildSceneMarkup = useCallback(
    (sceneIndex: number): string[] => {
      if (!timeline) return []
      const base = (timeline.scenes[sceneIndex]?.text?.content ?? '').trim()
      if (!base) return []
      
      // ||| 구분자로 분할 (공백 유무와 관계없이 분할)
      const parts = base.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
      
      // 디버깅: Scene 1의 경우 로그 출력
      if (sceneIndex === 0 && parts.length > 1) {
        console.log(`[DEBUG] Scene ${sceneIndex} 구분자 발견: ${parts.length}개 구간`, base.substring(0, 100))
      } else if (sceneIndex === 0) {
        console.log(`[DEBUG] Scene ${sceneIndex} 구분자 없음: 1개 구간`, base.substring(0, 100))
      }
      
      // 각 구간별로 마크업 생성
      const isLast = sceneIndex >= timeline.scenes.length - 1
      // pause 기능은 현재 비활성화되어 있으나, 로직은 유지됨
      // pause를 다시 사용하려면 enablePause: true로 변경
      return parts.map((part, partIndex) => {
        // 마지막 씬의 마지막 구간이 아니면 transition pause 추가
        const isLastPart = isLast && partIndex === parts.length - 1
        return makeMarkupFromPlainText(part, { 
          addSceneTransitionPause: !isLastPart,
          enablePause: false // pause 비활성화 (로직은 유지)
        })
      })
    },
    [timeline]
  )

  const makeTtsKey = useCallback(
    (voiceName: string, markup: string) =>
      `${voiceName}::${markup}`,
    []
  )

  const getMp3DurationSec = useCallback(async (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    try {
      const audio = document.createElement('audio')
      audio.src = url
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve()
        audio.onerror = () => reject(new Error('오디오 메타데이터 로드 실패'))
      })
      const d = Number.isFinite(audio.duration) ? audio.duration : 0
      return d > 0 ? d : 0
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [])

  const setSceneDurationFromAudio = useCallback(
    (sceneIndex: number, durationSec: number) => {
      if (!timeline) return
      if (!Number.isFinite(durationSec) || durationSec <= 0) return
      const prev = timeline.scenes[sceneIndex]?.duration ?? 0
      if (Math.abs(prev - durationSec) <= 0.05) return

      const clamped = Math.max(0.5, Math.min(120, durationSec))
      
      // 이전 totalDuration 계산 (마지막 씬의 transition 제외)
      const prevTotalDuration = timeline.scenes.reduce((sum, scene, index) => {
        const isLastScene = index === timeline.scenes.length - 1
        const transitionDuration = isLastScene ? 0 : (scene.transitionDuration || 0.5)
        return sum + scene.duration + transitionDuration
      }, 0)
      
      // 새로운 timeline 생성
      const newTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((s, i) => (i === sceneIndex ? { ...s, duration: clamped } : s)),
      }
      
      // 새로운 totalDuration 계산 (마지막 씬의 transition 제외)
      const newTotalDuration = newTimeline.scenes.reduce((sum, scene, index) => {
        const isLastScene = index === newTimeline.scenes.length - 1
        const transitionDuration = isLastScene ? 0 : (scene.transitionDuration || 0.5)
        return sum + scene.duration + transitionDuration
      }, 0)
      
      // 재생 중일 때 currentTime을 비례적으로 조정하여 재생바 튕김 방지
      if (isPlaying && prevTotalDuration > 0 && newTotalDuration > 0) {
        const ratio = newTotalDuration / prevTotalDuration
        setCurrentTime((prevTime) => {
          const adjustedTime = prevTime * ratio
          // 조정된 시간이 새로운 totalDuration을 넘지 않도록
          return Math.min(adjustedTime, newTotalDuration)
        })
      }
      
      setTimeline(newTimeline)
    },
    [setTimeline, timeline, isPlaying, setCurrentTime]
  )

  const ensureSceneTts = useCallback(
    async (sceneIndex: number, signal?: AbortSignal, forceRegenerate: boolean = false): Promise<{
      sceneIndex: number
      parts: Array<{
        blob: Blob
        durationSec: number
        url: string | null
        partIndex: number
        markup: string
      }>
    }> => {
      if (!timeline) throw new Error('timeline이 없습니다.')
      if (!voiceTemplate) throw new Error('목소리를 먼저 선택해주세요.')

      const scene = timeline.scenes[sceneIndex]
      if (!scene) throw new Error(`씬 ${sceneIndex}을 찾을 수 없습니다.`)

      const markups = buildSceneMarkup(sceneIndex)
      if (markups.length === 0) throw new Error('씬 대본이 비어있습니다.')

      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      // 변경된 씬이면 강제 재생성
      const isChanged = forceRegenerate || changedScenesRef.current.has(sceneIndex)
      if (isChanged) {
        console.log(`[TTS] 씬 ${sceneIndex} 변경 감지됨 - 강제 재생성 (forceRegenerate=${forceRegenerate}, has=${changedScenesRef.current.has(sceneIndex)})`)
        // 변경된 씬의 모든 캐시 무효화
        markups.forEach((markup) => {
          const key = makeTtsKey(voiceTemplate, markup)
          ttsCacheRef.current.delete(key)
        })
        // 변경 상태는 모든 구간 처리 완료 후 제거 (아래에서 처리)
      }

      // 각 구간별로 TTS 생성 및 업로드
      console.log(`[TTS] 씬 ${sceneIndex} TTS 생성 시작: ${markups.length}개 구간${isChanged ? ' (강제 재생성)' : ''}`)
      const parts = await Promise.all(
        markups.map(async (markup, partIndex) => {
          console.log(`[TTS] 씬 ${sceneIndex} 구간 ${partIndex + 1}/${markups.length} 처리 중... (isChanged=${isChanged})`)
          const key = makeTtsKey(voiceTemplate, markup)

          // 강제 재생성이면 캐시와 저장소 다운로드 모두 스킵하고 바로 TTS 생성
          if (isChanged) {
            console.log(`[TTS] 구간 ${partIndex + 1} 강제 재생성 모드 - 캐시/저장소 스킵, TTS API 호출`)
            // 바로 TTS 생성으로 진행 (아래로 계속)
          } else {
          // 강제 재생성이 아니면 캐시 확인
          const cached = ttsCacheRef.current.get(key)
          if (cached) {
            console.log(`[TTS] 구간 ${partIndex + 1} 캐시 확인: blob=${!!cached.blob}, url=${!!cached.url}`)
            // 캐시된 경우에도 URL이 있는지 확인하고 없으면 업로드
            let url = cached.url || null
            let blob = cached.blob || null
            
            if (!url && blob) {
                // blob은 있지만 URL이 없으면 업로드
                const formData = new FormData()
                formData.append('file', blob, `scene_${sceneIndex}_part${partIndex + 1}.mp3`)
                formData.append('sceneIndex', String(sceneIndex))
                formData.append('partIndex', String(partIndex))
                formData.append('sceneId', String(scene.sceneId))

                try {
                  const uploadRes = await fetch('/api/media/upload', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}` },
                    body: formData,
                  })

                  if (uploadRes.ok) {
                    const uploadData = await uploadRes.json()
                    url = uploadData.url || null
                    // 캐시 업데이트
                    ttsCacheRef.current.set(key, { ...cached, url })
                    console.log(`[TTS] 구간 ${partIndex + 1} 업로드 완료: ${url}`)
                  } else {
                    const errorData = await uploadRes.json().catch(() => ({}))
                    console.error(`[TTS] 구간 ${partIndex + 1} 업로드 실패:`, errorData)
                  }
                } catch (error) {
                  console.error(`[TTS] 구간 ${partIndex + 1} 업로드 실패:`, error)
                }
              } else if (url && !blob) {
                // URL은 있지만 blob이 없으면 저장소에서 다운로드
                console.log(`[TTS] 구간 ${partIndex + 1} 저장소에서 다운로드: ${url}`)
                try {
                  const downloadRes = await fetch(url)
                  if (downloadRes.ok) {
                    blob = await downloadRes.blob()
                    const durationSec = await getMp3DurationSec(blob)
                    // 캐시 업데이트 (blob 추가)
                    ttsCacheRef.current.set(key, { ...cached, blob, durationSec, url })
                    console.log(`[TTS] 구간 ${partIndex + 1} 다운로드 완료: duration=${durationSec}초`)
                  } else {
                    console.error(`[TTS] 구간 ${partIndex + 1} 다운로드 실패: ${downloadRes.status}`)
                  }
                } catch (error) {
                  console.error(`[TTS] 구간 ${partIndex + 1} 다운로드 실패:`, error)
                }
              } else if (url && blob) {
                console.log(`[TTS] 구간 ${partIndex + 1} ✅ 캐시에서 사용 (blob + URL): ${url.substring(0, 50)}...`)
              }

              // blob이 없으면 null 반환하여 재생성 유도
              if (!blob) {
                console.log(`[TTS] 구간 ${partIndex + 1} blob이 없어 재생성 필요`)
                // 캐시에서 삭제하여 재생성 유도
                ttsCacheRef.current.delete(key)
              } else {
                console.log(`[TTS] 구간 ${partIndex + 1} ✅ 캐시 사용 - TTS API 호출 스킵`)
                return {
                  blob,
                  durationSec: cached.durationSec || 0,
                  url,
                  partIndex,
                  markup,
                }
              }
            }

            // 진행 중인 요청 확인
            const inflight = ttsInFlightRef.current.get(key)
            if (inflight) {
              console.log(`[TTS] 구간 ${partIndex + 1} 진행 중인 요청 대기...`)
              const result = await inflight
              return {
                blob: result.blob,
                durationSec: result.durationSec,
                url: result.url || null,
                partIndex,
                markup,
              }
            }

            // 저장소에서 파일 경로를 추측해서 다운로드하는 로직 제거
            // 이제는 업로드 후 반환되는 URL만 사용 (랜덤 파일 이름 사용)
            console.log(`[TTS] 구간 ${partIndex + 1} 캐시 없음 - TTS API 호출 필요`)
          }

          // 진행 중인 요청 확인
          const inflight = ttsInFlightRef.current.get(key)
          if (inflight) {
            const result = await inflight
            return {
              blob: result.blob,
              durationSec: result.durationSec,
              url: result.url || null,
              partIndex,
              markup,
            }
          }

          // 저장소에서 파일 경로를 추측해서 다운로드하는 로직 제거
          // 이제는 업로드 후 반환되는 URL만 사용 (랜덤 파일 이름 사용)

          // 강제 재생성이거나 저장소에 파일이 없으면 TTS 생성
          const p = (async () => {
            const res = await fetch('/api/tts/synthesize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              signal,
              body: JSON.stringify({
                voiceName: voiceTemplate,
                mode: 'markup',
                markup,
              }),
            })

            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
              const errorMessage = data?.error || data?.message || 'TTS 합성 실패'
              const error = new Error(errorMessage)
              if (res.status === 429) {
                (error as any).isRateLimit = true
              }
              throw error
            }

            const blob = await res.blob()
            const durationSec = await getMp3DurationSec(blob)

            // Supabase 업로드
            let url: string | null = null
            try {
              const formData = new FormData()
              // 파일 이름은 업로드 API에서 TTS 형식으로 생성 (타임스탬프_scene_{sceneId}_scene_{sceneId}_voice.mp3)
              formData.append('file', blob)
              formData.append('sceneId', String(scene.sceneId))

              const uploadRes = await fetch('/api/media/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
              })

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json()
                url = uploadData.url || null
                console.log(`[TTS] 구간 ${partIndex + 1} 생성 및 업로드 완료: ${url}`)
                
                // 업로드 후 저장소에서 다운로드해서 캐시에 저장 (최신 파일 보장)
                if (url) {
                  try {
                    const downloadRes = await fetch(url)
                    if (downloadRes.ok) {
                      const downloadedBlob = await downloadRes.blob()
                      const downloadedDurationSec = await getMp3DurationSec(downloadedBlob)
                      
                      // 캐시에 저장 (다운로드한 파일 사용)
                      const entry = { 
                        blob: downloadedBlob, 
                        durationSec: downloadedDurationSec, 
                        markup, 
                        url, 
                        sceneId: scene.sceneId, 
                        sceneIndex 
                      }
                      ttsCacheRef.current.set(key, entry)
                      console.log(`[TTS] 구간 ${partIndex + 1} 저장소에서 다운로드하여 캐시 저장 완료: duration=${downloadedDurationSec}초`)
                      return entry
                    }
                  } catch (downloadError) {
                    console.error(`[TTS] 구간 ${partIndex + 1} 저장소 다운로드 실패 (생성한 blob 사용):`, downloadError)
                  }
                }
              } else {
                const errorData = await uploadRes.json().catch(() => ({}))
                console.error(`[TTS] 구간 ${partIndex + 1} 업로드 실패:`, errorData)
              }
            } catch (error) {
              console.error(`[TTS] 구간 ${partIndex + 1} 업로드 실패:`, error)
            }

            // 업로드 실패하거나 다운로드 실패한 경우 생성한 blob 사용
            const entry = { blob, durationSec, markup, url, sceneId: scene.sceneId, sceneIndex }
            ttsCacheRef.current.set(key, entry)
            return entry
          })().finally(() => {
            ttsInFlightRef.current.delete(key)
          })

          ttsInFlightRef.current.set(key, p)
          const result = await p

          return {
            blob: result.blob,
            durationSec: result.durationSec,
            url: result.url || null,
            partIndex,
            markup,
          }
        })
      )

      // 전체 씬 duration 업데이트 (모든 구간의 duration 합)
      const totalDuration = parts.reduce((sum, part) => sum + part.durationSec, 0)
      if (totalDuration > 0) {
        setSceneDurationFromAudio(sceneIndex, totalDuration)
      }

      // 변경 상태 제거 (모든 구간 처리 완료 후)
      if (isChanged) {
        changedScenesRef.current.delete(sceneIndex)
        console.log(`[TTS] 씬 ${sceneIndex} 변경 상태 제거 (재생성 완료)`)
      }

      console.log(`[TTS] 씬 ${sceneIndex} TTS 생성 완료: ${parts.length}개 구간, 총 duration: ${totalDuration.toFixed(2)}초`)
      return {
        sceneIndex,
        parts,
      }
    },
    [
      timeline,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
      getMp3DurationSec,
      setSceneDurationFromAudio,
      changedScenesRef,
    ]
  )

  const prefetchWindow = useCallback(
    (baseIndex: number) => {
      if (!timeline) return
      if (!voiceTemplate) return

      ttsAbortRef.current?.abort()
      const controller = new AbortController()
      ttsAbortRef.current = controller

      const candidates = [baseIndex + 1, baseIndex + 2].filter(
        (i) => i >= 0 && i < timeline.scenes.length
      )

      // 간단 동시성 제한: 2개까지만 (현재 창 +2)
      candidates.forEach((i) => {
        ensureSceneTts(i, controller.signal).catch(() => {})
      })
    },
    [timeline, voiceTemplate, ensureSceneTts]
  )

  const handleSceneTtsPreview = useCallback(
    async (sceneIndex: number) => {
      if (!timeline) return
      if (!voiceTemplate) {
        alert('목소리를 선택해주세요.')
        return
      }

      try {
        // 기존 미리듣기 오디오 정지
        stopScenePreviewAudio()

        // TTS 합성 (변경된 씬이면 강제 재생성)
        const result = await ensureSceneTts(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex))
        if (result.parts.length === 0) {
          throw new Error('TTS 구간이 없습니다.')
        }

        // 모든 구간을 순차적으로 재생
        const playPart = async (partIndex: number): Promise<void> => {
          if (partIndex >= result.parts.length) {
            // 모든 구간 재생 완료
            stopScenePreviewAudio()
            return
          }

          const part = result.parts[partIndex]
          
          // 저장소 URL 우선 사용, 없으면 blob에서 URL 생성
          let audioUrl: string
          if (part.url) {
            audioUrl = part.url
            console.log(`[씬 미리보기] 씬 ${sceneIndex} 구간 ${partIndex + 1} 저장소 URL 사용: ${part.url.substring(0, 50)}...`)
          } else if (part.blob) {
            audioUrl = URL.createObjectURL(part.blob)
            console.log(`[씬 미리보기] 씬 ${sceneIndex} 구간 ${partIndex + 1} blob URL 생성`)
          } else {
            console.error(`[씬 미리보기] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생할 오디오 없음`)
            stopScenePreviewAudio()
            return
          }

          scenePreviewAudioUrlRef.current = audioUrl
          const audio = new Audio(audioUrl)
          scenePreviewAudioRef.current = audio

          await new Promise<void>((resolve) => {
            audio.onended = () => {
              // 현재 구간 재생 완료, 다음 구간 재생
              resolve()
            }

            audio.onerror = () => {
              console.error(`[씬 미리보기] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생 실패`)
              stopScenePreviewAudio()
              resolve()
            }

            audio.play().catch((error) => {
              console.error(`[씬 미리보기] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생 시작 실패:`, error)
              stopScenePreviewAudio()
              resolve()
            })
          })

          // 다음 구간 재생
          if (scenePreviewAudioRef.current) {
            await playPart(partIndex + 1)
          }
        }

        // 첫 번째 구간부터 재생 시작
        await playPart(0)
      } catch (error) {
        stopScenePreviewAudio()
        alert(error instanceof Error ? error.message : 'TTS 미리듣기 실패')
      }
    },
    [timeline, voiceTemplate, ensureSceneTts, stopScenePreviewAudio]
  )
  
  // isPlaying 상태와 ref 동기화
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  
  // 재생 시작 로직을 별도 함수로 분리
  const startPlayback = useCallback(() => {
    if (!timeline) return
    
    setShowReadyMessage(false)
    setIsPlaying(true)
    isPlayingRef.current = true
    
    // TTS 전체 길이 계산 및 BGM 페이드 아웃 설정
    const calculateTotalTtsDuration = (): number => {
      let totalDuration = 0
      for (let i = currentSceneIndex; i < timeline.scenes.length; i++) {
        const markups = buildSceneMarkup(i)
        // 각 구간의 duration 합산
        let sceneDuration = 0
        for (const markup of markups) {
          const key = makeTtsKey(voiceTemplate!, markup)
          const cached = ttsCacheRef.current.get(key)
          if (cached) {
            sceneDuration += cached.durationSec
          }
        }
        if (sceneDuration > 0) {
          totalDuration += sceneDuration
        } else {
          totalDuration += timeline.scenes[i]?.duration || 3
        }
      }
      return totalDuration
    }
    
    // BGM 페이드 아웃 설정
    const setupBgmFadeOut = () => {
      if (!confirmedBgmTemplate || !bgmAudioRef.current) return
      
      const totalTtsDuration = calculateTotalTtsDuration()
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      const totalTimeMs = (totalTtsDuration * 1000) / speed
      const fadeDuration = 1000 // 1초 페이드
      const fadeStartTime = Math.max(0, totalTimeMs - fadeDuration)
      
      if (fadeStartTime > 0) {
        setTimeout(() => {
          if (!bgmAudioRef.current) return
          
          const audio = bgmAudioRef.current
          const startVolume = audio.volume
          const fadeInterval = 50 // 50ms마다 volume 조절
          const volumeStep = startVolume / (fadeDuration / fadeInterval)
          
          const fadeTimer = setInterval(() => {
            if (!bgmAudioRef.current) {
              clearInterval(fadeTimer)
              return
            }
            
            bgmAudioRef.current.volume = Math.max(0, bgmAudioRef.current.volume - volumeStep)
            
            if (bgmAudioRef.current.volume <= 0) {
              clearInterval(fadeTimer)
              stopBgmAudio()
            }
          }, fadeInterval)
        }, fadeStartTime)
      } else {
        // 페이드 시간이 없으면 즉시 정지
        setTimeout(() => {
          stopBgmAudio()
        }, totalTimeMs)
      }
    }
    
    // BGM 재생 시작 (이미 로드되어 있음)
    if (confirmedBgmTemplate && bgmAudioRef.current) {
      const audio = bgmAudioRef.current
      bgmStartTimeRef.current = Date.now()
      audio.play().catch(() => {})
    }
    
    // BGM 페이드 아웃 시작
    setupBgmFadeOut()
    
    // 실제 재생 시작 로직은 playNextScene에서 처리
    const playNextScene = (currentIndex: number) => {
      if (currentIndex >= timeline.scenes.length) {
        setIsPlaying(false)
        isPlayingRef.current = false
        stopBgmAudio()
        return
      }
      
      const sceneIndex = currentIndex
      const scene = timeline.scenes[sceneIndex]
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      
      // 같은 그룹 내 씬인지 확인 (움직임 효과가 적용된 분할된 씬들)
      const previousSceneIndex = currentIndex > 0 ? currentIndex - 1 : null
      const previousScene = previousSceneIndex !== null ? timeline.scenes[previousSceneIndex] : null
      const isSameGroup = previousScene && previousScene.sceneId === scene.sceneId
      const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']
      const isMovementEffect = isSameGroup && previousScene && MOVEMENT_EFFECTS.includes(previousScene.transition || '')
      
      // TTS 재생 함수 - 각 ||| 구간별로 순차 재생
      const playTts = async () => {
        try {
          // 모든 구간의 TTS 가져오기 (캐시 확인 포함)
          console.log(`[재생] 씬 ${sceneIndex} TTS 확인 시작 (캐시 사용 여부 확인)`)
          const ttsResult = await ensureSceneTts(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex))
          const parts = ttsResult.parts
          console.log(`[재생] 씬 ${sceneIndex} TTS 확인 완료: ${parts.length}개 구간 (캐시에서 가져왔는지 확인)`)
          
          if (parts.length === 0) {
            // TTS가 없으면 fallback duration 사용
            const fallbackDuration = scene.duration
            const waitTime = (fallbackDuration * 1000) / speed
            playTimeoutRef.current = setTimeout(() => {
              if (isPlayingRef.current) {
                playNextScene(currentIndex + 1)
              }
            }, waitTime)
            return
          }

          // 각 구간을 순차적으로 재생
          const playPart = async (partIndex: number): Promise<void> => {
            if (!isPlayingRef.current || partIndex >= parts.length) {
              // 재생 중지되었거나 모든 구간 재생 완료
              return
            }

            const part = parts[partIndex]
            const scriptParts = scene.text?.content?.split(/\s*\|\|\|\s*/) || []
            const currentPartText = scriptParts[partIndex]?.trim() || ''

            // 자막 업데이트: 직접 텍스트 객체를 업데이트하여 즉시 반영
            if (currentPartText) {
              const currentText = textsRef.current.get(sceneIndex)
              if (currentText) {
                // 텍스트 내용 업데이트
                currentText.text = currentPartText
                currentText.visible = true
                currentText.alpha = 1
                
                // 즉시 렌더링하여 자막이 바로 보이도록 함
                if (appRef.current) {
                  appRef.current.render()
                }
                
                console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1}/${parts.length} 자막 표시: "${currentPartText.substring(0, 30)}..."`)
              }
            }

            // TTS 재생: 저장소 URL이 있으면 우선 사용, 없으면 blob에서 URL 생성
            stopTtsAudio()
            let audioUrl: string
            if (part.url) {
              // 저장소에 업로드된 파일 사용
              audioUrl = part.url
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 저장소 URL 사용: ${part.url.substring(0, 50)}...`)
            } else if (part.blob) {
              // blob이 있으면 blob URL 생성
              audioUrl = URL.createObjectURL(part.blob)
              console.log(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} blob URL 생성`)
            } else {
              console.error(`[재생] 씬 ${sceneIndex} 구간 ${partIndex + 1} 재생할 오디오 없음`)
              return
            }
            ttsAudioUrlRef.current = audioUrl
            const audio = new Audio(audioUrl)
            audio.playbackRate = speed
            ttsAudioRef.current = audio

            await new Promise<void>((resolve) => {
              audio.onended = () => {
                stopTtsAudio()
                resolve()
              }
              audio.onerror = () => {
                stopTtsAudio()
                resolve()
              }
              audio.play().catch(() => {
                stopTtsAudio()
                resolve()
              })
            })

            // 다음 구간 재생 또는 다음 씬으로 이동
            if (!isPlayingRef.current) {
              return
            }

            if (partIndex < parts.length - 1) {
              // 같은 씬의 다음 구간 재생
              await playPart(partIndex + 1)
            } else {
              // 모든 구간 재생 완료, 다음 씬으로 이동
              const nextScene = currentIndex + 1 < timeline.scenes.length ? timeline.scenes[currentIndex + 1] : null
              const isNextInSameGroup = nextScene && nextScene.sceneId === scene.sceneId

              if (isNextInSameGroup) {
                // 같은 그룹 내의 다음 씬으로 넘어갈 때는 자막만 변경
                const nextIndex = currentIndex + 1
                setCurrentSceneIndex(nextIndex)
                currentSceneIndexRef.current = nextIndex
                lastRenderedSceneIndexRef.current = nextIndex

                updateCurrentScene(false, currentIndex, undefined, () => {
                  playNextScene(nextIndex)
                })
              } else {
                // 다른 그룹으로 넘어갈 때는 일반 재생
                playNextScene(currentIndex + 1)
              }
            }
          }

          // 첫 번째 구간의 자막을 먼저 표시
          if (parts.length > 0) {
            const firstPart = parts[0]
            const scriptParts = scene.text?.content?.split(/\s*\|\|\|\s*/) || []
            const firstPartText = scriptParts[0]?.trim() || ''
            
            if (firstPartText) {
              const currentText = textsRef.current.get(sceneIndex)
              if (currentText) {
                currentText.text = firstPartText
                currentText.visible = true
                currentText.alpha = 1
                if (appRef.current) {
                  appRef.current.render()
                }
                console.log(`[재생] 씬 ${sceneIndex} 첫 번째 구간 자막 표시: "${firstPartText.substring(0, 30)}..."`)
              }
            }
          }
          
          // 첫 번째 구간부터 재생 시작
          await playPart(0)
        } catch (error) {
          console.error('TTS 재생 실패:', error)
          // 에러 발생 시 fallback duration 사용
          const fallbackDuration = scene.duration
          const waitTime = (fallbackDuration * 1000) / speed
          playTimeoutRef.current = setTimeout(() => {
            if (isPlayingRef.current) {
              playNextScene(currentIndex + 1)
            }
          }, waitTime)
        }
      }
      
      // TTS를 씬 시작 시점에 즉시 재생
      playTts()
      
      // 씬 선택 (자막 변경)
      handleSceneSelect(sceneIndex, true, () => {
        // 전환 효과 완료 콜백 (TTS는 이미 재생 중)
      })
    }
    
    playNextScene(currentSceneIndex)
  }, [timeline, currentSceneIndex, voiceTemplate, confirmedBgmTemplate, playbackSpeed, buildSceneMarkup, makeTtsKey, handleSceneSelect, stopBgmAudio, stopTtsAudio])

  const handlePlayPause = async () => {
    if (!isPlaying) {
      // "재생이 가능해요!" 메시지가 표시되어 있으면 실제 재생 시작
      if (showReadyMessage) {
        startPlayback()
        return
      }
      
      // 준비 중이면 아무것도 하지 않음
      if (isPreparing) {
        return
      }
      
      // 재생 시작: 모든 씬의 TTS 합성 및 BGM 로드
      if (!timeline) return
      
      // voiceTemplate 미선택 가드
      if (!voiceTemplate) {
        alert('목소리를 선택해주세요.')
        return
      }
      
      if (!pixiReady || spritesRef.current.size === 0) {
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
      
      // 모든 씬의 TTS 합성 시작
      setIsPreparing(true)
      setIsTtsBootstrapping(true)
      isTtsBootstrappingRef.current = true
      
      if (confirmedBgmTemplate) {
        setIsBgmBootstrapping(true)
        isBgmBootstrappingRef.current = true
      }
      
      // 현재 씬부터 마지막 씬까지 모든 TTS 배치 합성 (동시성 제한 + 딜레이)
      // 이미 캐시된 씬은 스킵하여 rate limit 절약
      const batchSize = 3 // 3개씩 처리
      const batchDelay = 1000 // 1초 딜레이
      const ttsPromises = []

      // 먼저 캐시 확인하여 이미 합성된 씬은 스킵
      // 단, 캐시에 blob이나 URL이 있어야 유효한 캐시로 간주
      const scenesToSynthesize = []
      for (let i = currentSceneIndex; i < timeline.scenes.length; i++) {
        const markups = buildSceneMarkup(i)
        // 모든 구간이 유효한 캐시(blob 또는 URL)를 가지고 있는지 확인
        const cachedCount = markups.filter(markup => {
          const key = makeTtsKey(voiceTemplate!, markup)
          const cached = ttsCacheRef.current.get(key)
          // blob이나 URL이 있어야 유효한 캐시로 간주
          return cached && (cached.blob || cached.url)
        }).length
        
        if (cachedCount < markups.length) {
          console.log(`[TTS] 씬 ${i} 합성 필요: ${cachedCount}/${markups.length}개 구간 캐시됨`)
          scenesToSynthesize.push(i)
        } else {
          console.log(`[TTS] 씬 ${i} 이미 캐시됨 (${markups.length}개 구간 모두) - 스킵`)
        }
      }

      // console.log(`[TTS] 합성 필요: ${scenesToSynthesize.length}개 씬 (${scenesToSynthesize.join(', ')})`)

      // 캐시되지 않은 씬만 배치 처리
      for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
        const batch = []
        for (let j = 0; j < batchSize && i + j < scenesToSynthesize.length; j++) {
          const sceneIndex = scenesToSynthesize[i + j]
          batch.push(
            ensureSceneTts(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex))
              .then((result) => {
                // if (!result) {
                //   console.warn(`[TTS] 씬 ${sceneIndex} 합성 결과가 null입니다.`)
                // } else {
                //   console.log(`[TTS] 씬 ${sceneIndex} 합성 완료 및 캐시 저장 (${i + j + 1}/${scenesToSynthesize.length})`)
                // }
                return result
              })
              .catch(() => {
                return null
              })
          )
        }
        // 각 배치를 순차적으로 처리
        const batchResult = await Promise.allSettled(batch)
        ttsPromises.push(...batchResult.map(r => r.status === 'fulfilled' ? r.value : null))
        
        // 마지막 배치가 아니면 딜레이 추가
        if (i + batchSize < scenesToSynthesize.length) {
          // console.log(`[TTS] 배치 완료, ${batchDelay}ms 대기 후 다음 배치 시작...`)
          await new Promise(resolve => setTimeout(resolve, batchDelay))
        }
      }
      
      // BGM 로드 (재생은 하지 않음)
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      const bgmPromise = confirmedBgmTemplate
        ? startBgmAudio(confirmedBgmTemplate, speed, false).catch(() => {
            isBgmBootstrappingRef.current = false
            setIsBgmBootstrapping(false)
            return null
          })
        : Promise.resolve(null)
      
      // 모든 준비 완료 대기
      Promise.all([...ttsPromises, bgmPromise])
        .then(() => {
          setIsPreparing(false)
          setIsTtsBootstrapping(false)
          isTtsBootstrappingRef.current = false
          setIsBgmBootstrapping(false)
          isBgmBootstrappingRef.current = false
          
          // 로딩 완료 후 바로 재생 시작
          startPlayback()
        })
        .catch(() => {
          setIsPreparing(false)
          setIsTtsBootstrapping(false)
          isTtsBootstrappingRef.current = false
          setIsBgmBootstrapping(false)
          isBgmBootstrappingRef.current = false
          alert('재생 준비 중 오류가 발생했어요.')
        })
    } else {
      // 재생 중지
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current)
        playTimeoutRef.current = null
      }
      if (bgmStopTimeoutRef.current) {
        clearTimeout(bgmStopTimeoutRef.current)
        bgmStopTimeoutRef.current = null
      }
      bgmStartTimeRef.current = null
      setIsPlaying(false)
      isPlayingRef.current = false
      isTtsBootstrappingRef.current = false
      setIsTtsBootstrapping(false) // 재생 중지 시 로딩 상태도 해제
      isBgmBootstrappingRef.current = false
      setIsBgmBootstrapping(false)
      resetTtsSession()
      stopBgmAudio()
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
    if (!timeline || timeline.scenes.length === 0) return
    if (isPlaying) {
      return // 재생 중일 때는 handleSceneSelect가 처리하므로 여기서는 처리하지 않음
    }
    if (isManualSceneSelectRef.current) {
      return // 수동 씬 선택 중일 때는 handleSceneSelect가 처리하므로 여기서는 처리하지 않음
    }
    if (isPreviewingTransition) {
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
      // 재생 중이 아닐 때는 즉시 표시
      currentSceneIndexRef.current = currentSceneIndex
      updateCurrentScene(true)
      lastRenderedSceneIndexRef.current = currentSceneIndex
      previousSceneIndexRef.current = currentSceneIndex
    }
  }, [currentSceneIndex, isPlaying, timeline, updateCurrentScene, isPreviewingTransition, activeAnimationsRef])

  // 특정 씬의 TTS 캐시 무효화 (저장소 URL도 제거하여 재업로드 유도)
  const invalidateSceneTtsCache = useCallback((sceneIndex: number) => {
    if (!timeline) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return

    const keysToInvalidate: string[] = []
    
    // 현재 캐시의 모든 키를 순회하면서 해당 씬(sceneId 또는 sceneIndex)의 캐시 찾기
    ttsCacheRef.current.forEach((value, key) => {
      // 캐시 값이 객체인지 확인
      if (value && typeof value === 'object') {
        const cached = value as any
        // sceneId가 일치하거나 sceneIndex가 일치하면 무효화
        // 기존 캐시에는 sceneId/sceneIndex가 없을 수 있으므로, 
        // 해당 씬의 현재 스크립트로 생성된 키인지도 확인
        const shouldInvalidate = 
          cached.sceneId === scene.sceneId || 
          cached.sceneIndex === sceneIndex
        
        if (shouldInvalidate) {
          keysToInvalidate.push(key)
          console.log(`[캐시 무효화] 씬 ${sceneIndex} (sceneId: ${scene.sceneId}) 캐시 발견: ${key.substring(0, 50)}...`)
        }
      }
    })
    
    // sceneId나 sceneIndex로 찾지 못한 경우, 
    // 해당 씬의 현재 스크립트로 생성된 모든 키를 찾아서 무효화
    // (스크립트가 변경되었을 때 이전 캐시를 찾기 위함)
    if (keysToInvalidate.length === 0) {
      const markups = buildSceneMarkup(sceneIndex)
      markups.forEach((markup) => {
        const key = makeTtsKey(voiceTemplate || '', markup)
        if (ttsCacheRef.current.has(key)) {
          keysToInvalidate.push(key)
          console.log(`[캐시 무효화] 씬 ${sceneIndex} (sceneId: ${scene.sceneId}) 스크립트 기반 캐시 발견: ${key.substring(0, 50)}...`)
        }
      })
    }
    
    // 찾은 키들의 캐시 삭제 (URL 포함하여 완전히 무효화)
    keysToInvalidate.forEach(key => {
      const cached = ttsCacheRef.current.get(key)
      if (cached) {
        console.log(`[캐시 무효화] 씬 ${sceneIndex} (sceneId: ${scene.sceneId}) 캐시 키 삭제: ${key.substring(0, 50)}...`)
        ttsCacheRef.current.delete(key)
      }
    })
    
    if (keysToInvalidate.length > 0) {
      console.log(`[캐시 무효화] 씬 ${sceneIndex} (sceneId: ${scene.sceneId}) 총 ${keysToInvalidate.length}개 캐시 무효화됨 (재업로드 필요)`)
    } else {
      console.log(`[캐시 무효화] 씬 ${sceneIndex} (sceneId: ${scene.sceneId}) 무효화할 캐시 없음`)
    }
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey])

  // 씬 편집 핸들러들
  const {
    handleSceneScriptChange: originalHandleSceneScriptChange,
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

  // 스크립트 변경 시 캐시 무효화를 포함한 래퍼
  const handleSceneScriptChange = useCallback(
    (index: number, value: string) => {
      // 기존 스크립트와 비교하여 변경되었는지 확인
      const currentScript = scenes[index]?.script || ''
      if (currentScript !== value) {
        console.log(`[스크립트 변경 감지] 씬 ${index}: "${currentScript.substring(0, 30)}..." → "${value.substring(0, 30)}..."`)
        
        // 변경된 씬으로 표시 (재생 시 강제 재생성)
        changedScenesRef.current.add(index)
        console.log(`[스크립트 변경] 씬 ${index} 변경 상태로 표시 (재생 시 강제 재생성)`)
        
        // 변경 전 스크립트로 생성된 캐시 키 찾기
        if (currentScript && voiceTemplate && timeline) {
          const oldScene = timeline.scenes[index]
          if (oldScene) {
            // 변경 전 스크립트로 markup 생성
            const oldScriptParts = currentScript.split(/\s*\|\|\|\s*/).map(p => p.trim()).filter(p => p.length > 0)
            const oldMarkups = oldScriptParts.map((part, partIndex) => {
              const isLast = index >= timeline.scenes.length - 1
              const isLastPart = isLast && partIndex === oldScriptParts.length - 1
              return makeMarkupFromPlainText(part, {
                addSceneTransitionPause: !isLastPart,
                enablePause: false
              })
            })
            
            // 변경 전 스크립트로 생성된 모든 캐시 키 무효화
            oldMarkups.forEach((markup) => {
              const key = makeTtsKey(voiceTemplate, markup)
              if (ttsCacheRef.current.has(key)) {
                console.log(`[캐시 무효화] 씬 ${index} 변경 전 스크립트 캐시 삭제: ${key.substring(0, 50)}...`)
                ttsCacheRef.current.delete(key)
              }
            })
          }
        }
        
        // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
        invalidateSceneTtsCache(index)
      }
      // 원본 핸들러 호출
      originalHandleSceneScriptChange(index, value)
    },
    [scenes, timeline, voiceTemplate, originalHandleSceneScriptChange, invalidateSceneTtsCache, makeTtsKey]
  )

  // 씬 분할: 같은 이미지로 유지하면서 스크립트에 ||| 구분자 삽입 (객체 분할 없이)
  const handleSceneSplit = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      const { sceneScript: updatedSceneScript, timelineScene: updatedTimelineScene } =
        insertSceneDelimiters({
          sceneScript: targetSceneScript,
          timelineScene: targetTimelineScene,
        })

      // 분할 불가(문장 1개 이하)이면 아무 것도 하지 않음
      // insertSceneDelimiters는 원본을 그대로 반환하므로 script가 변경되지 않았는지 확인
      if (updatedSceneScript.script === targetSceneScript.script) {
        console.log(`[SceneSplit] 씬 ${index} 분할 불가: 문장 1개 이하`)
        return
      }

      console.log(`[SceneSplit] 씬 ${index} 구분자 삽입 완료:`, {
        원본: targetSceneScript.script.substring(0, 50),
        변경: updatedSceneScript.script.substring(0, 100),
        구간수: updatedSceneScript.script.split(' ||| ').length
      })

      // 변경된 씬으로 표시 (재생 시 강제 재생성)
      changedScenesRef.current.add(index)
      console.log(`[SceneSplit] 씬 ${index} 변경 상태로 표시 (재생 시 강제 재생성)`)

      // 스크립트가 변경되었으므로 해당 씬의 TTS 캐시 무효화
      invalidateSceneTtsCache(index)

      // scenes 배열 업데이트 (하나의 씬만 업데이트)
      const newScenes = scenes.map((scene, i) =>
        i === index ? updatedSceneScript : scene
      )

      // timeline.scenes 배열도 업데이트
      const newTimelineScenes = timeline.scenes.map((scene, i) =>
        i === index && updatedTimelineScene ? updatedTimelineScene : scene
      )

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })
    },
    [scenes, timeline, setScenes, setTimeline, invalidateSceneTtsCache]
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

  // 씬 복사 - 같은 그룹 내에서만 가능
  const handleSceneDuplicate = useCallback(
    (index: number) => {
      if (!timeline || scenes.length === 0) return

      const targetSceneScript = scenes[index]
      const targetTimelineScene = timeline.scenes[index]

      // 같은 sceneId를 가진 씬들 찾기 (같은 그룹)
      const sameGroupScenes = scenes.filter(s => s.sceneId === targetSceneScript.sceneId)
      
      // 그룹화되지 않은 씬은 복사 불가
      if (sameGroupScenes.length <= 1) {
        return
      }

      // 같은 그룹 내에서 최대 splitIndex 찾기
      const maxSplitIndex = sameGroupScenes.reduce((max, s) => {
        return Math.max(max, s.splitIndex || 0)
      }, 0)

      // 복제된 씬 생성 (같은 sceneId 유지, splitIndex 증가)
      const duplicatedSceneScript: SceneScript = {
        ...targetSceneScript,
        sceneId: targetSceneScript.sceneId, // 같은 sceneId 유지
        splitIndex: maxSplitIndex + 1, // 새로운 splitIndex 할당
      }

      const duplicatedTimelineScene: TimelineScene = {
        ...targetTimelineScene,
        sceneId: targetSceneScript.sceneId, // 같은 sceneId 유지
      }

      // 같은 그룹의 마지막 씬 다음에 삽입
      // 같은 sceneId를 가진 마지막 씬의 인덱스 찾기
      let insertIndex = index
      for (let i = index + 1; i < scenes.length; i++) {
        if (scenes[i].sceneId === targetSceneScript.sceneId) {
          insertIndex = i
        } else {
          break
        }
      }
      insertIndex += 1

      // scenes 배열에 삽입
      const newScenes = [
        ...scenes.slice(0, insertIndex),
        duplicatedSceneScript,
        ...scenes.slice(insertIndex),
      ]

      // timeline.scenes 배열에도 삽입
      const newTimelineScenes = [
        ...timeline.scenes.slice(0, insertIndex),
        duplicatedTimelineScene,
        ...timeline.scenes.slice(insertIndex),
      ]

      setScenes(newScenes)
      setTimeline({
        ...timeline,
        scenes: newTimelineScenes,
      })

      // 복제된 씬을 선택
      setCurrentSceneIndex(insertIndex)
      currentSceneIndexRef.current = insertIndex
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

    // 재정렬된 씬들
    const reorderedScenes = newOrder.map((oldIndex) => scenes[oldIndex])
    const reorderedTimelineScenes = newOrder.map((oldIndex) => timeline.scenes[oldIndex])

    // 같은 sceneId를 가진 씬들을 그룹별로 처리하여 splitIndex 업데이트
    const updatedScenes = reorderedScenes.map((scene, index) => {
      // 원본 씬인지 확인 (원래 splitIndex가 없었던 씬)
      const originalScene = scenes[newOrder[index]]
      const isOriginalScene = !originalScene.splitIndex

      // 원본 씬은 항상 splitIndex 없음 유지
      if (isOriginalScene) {
        return {
          ...scene,
          splitIndex: undefined,
        }
      }

      // 분할된 씬들: 같은 그룹 내에서 원본 씬을 제외한 순서로 splitIndex 할당
      const sameGroupScenes = reorderedScenes.filter((s, i) => {
        const origScene = scenes[newOrder[i]]
        return s.sceneId === scene.sceneId && origScene.splitIndex // 분할된 씬들만
      })

      // 현재 씬이 분할된 씬들 중 몇 번째인지 계산
      let splitPosition = 0
      for (let i = 0; i < index; i++) {
        const prevOrigScene = scenes[newOrder[i]]
        if (reorderedScenes[i].sceneId === scene.sceneId && prevOrigScene.splitIndex) {
          splitPosition++
        }
      }

      return {
        ...scene,
        splitIndex: splitPosition + 1, // 분할된 씬들은 1부터 시작
      }
    })

    // timeline의 scenes도 동일하게 업데이트 (sceneId는 유지)
    const updatedTimelineScenes = reorderedTimelineScenes.map((timelineScene, index) => {
      const scene = updatedScenes[index]
      return {
        ...timelineScene,
        sceneId: scene.sceneId, // sceneId 유지
      }
    })

    setScenes(updatedScenes)

    // selectedImages도 같은 순서로 재정렬
    const reorderedImages = newOrder.map((oldIndex) => selectedImages[oldIndex]).filter(Boolean)
    if (reorderedImages.length > 0) {
      setSelectedImages(reorderedImages)
    }

    setTimeline({
      ...timeline,
      scenes: updatedTimelineScenes,
    })

    // 현재 선택된 씬 인덱스 업데이트
    const currentOldIndex = newOrder.indexOf(currentSceneIndex)
    if (currentOldIndex !== -1) {
      setCurrentSceneIndex(currentOldIndex)
      currentSceneIndexRef.current = currentOldIndex
    }
  }, [scenes, selectedImages, timeline, currentSceneIndex, setScenes, setSelectedImages, setTimeline, setCurrentSceneIndex])

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
      (acc, scene, index) => {
        const isLastScene = index === timeline.scenes.length - 1
        const transitionDuration = isLastScene ? 0 : (scene.transitionDuration || 0.5)
        return acc + scene.duration + transitionDuration
      },
      0
    )
    const targetTime = ratio * totalDuration
    setCurrentTime(targetTime)
    
    let accumulated = 0
    let sceneIndex = 0
    for (let i = 0; i < timeline.scenes.length; i++) {
      const isLastScene = i === timeline.scenes.length - 1
      const transitionDuration = isLastScene ? 0 : (timeline.scenes[i].transitionDuration || 0.5)
      const sceneDuration = timeline.scenes[i].duration + transitionDuration
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
        (acc, scene, index) => {
          const isLastScene = index === timeline.scenes.length - 1
          const transitionDuration = isLastScene ? 0 : (scene.transitionDuration || 0.5)
          return acc + scene.duration + transitionDuration
        },
        0
      )
      const targetTime = ratio * totalDuration
      setCurrentTime(targetTime)
      
      let accumulated = 0
      let sceneIndex = 0
      for (let i = 0; i < timeline.scenes.length; i++) {
        const isLastScene = i === timeline.scenes.length - 1
        const transitionDuration = isLastScene ? 0 : (timeline.scenes[i].transitionDuration || 0.5)
        const sceneDuration = timeline.scenes[i].duration + transitionDuration
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

  // "움직임" 효과 목록 (그룹 내 전환 효과 지속 대상)
  const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']

  // 전환 효과 옵션 (fade, none 등)
  const transitions = [
    { value: 'none', label: '없음' },
    { value: 'fade', label: '페이드' },
    { value: 'rotate', label: '회전' },
    { value: 'blur', label: '블러' },
    { value: 'glitch', label: '글리치' },
    { value: 'ripple', label: '물결' },
    { value: 'circle', label: '원형' },
  ]

  // "움직임" 효과 옵션
  const movements = [
    { value: 'slide-left', label: '슬라이드 좌' },
    { value: 'slide-right', label: '슬라이드 우' },
    { value: 'slide-up', label: '슬라이드 상' },
    { value: 'slide-down', label: '슬라이드 하' },
    { value: 'zoom-in', label: '확대' },
    { value: 'zoom-out', label: '축소' },
  ]

  // 모든 전환 효과 옵션 (하위 호환성을 위해 유지)
  const allTransitions = [...transitions, ...movements]

  // 서버 전송
  const handleExport = async () => {
    // 이미 진행 중이면 중복 실행 방지
    if (isExporting) {
      return
    }

    if (!timeline) {
      alert('타임라인 데이터가 없어요.')
      return
    }

    if (!voiceTemplate) {
      alert('목소리를 먼저 선택해주세요.')
      return
    }

    // 내보내기 시작
    setIsExporting(true)

    try {
      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        throw new Error('로그인이 필요합니다.')
      }

      // 1. 모든 씬의 TTS Blob을 가져와서 서버에 업로드
      // 캐시된 것과 합성이 필요한 것을 분리하여 레이트 리밋 방지
      const ttsResults: Array<{ sceneIndex: number; blob: Blob; durationSec: number } | null> = []

      // 먼저 캐시된 것만 수집
      for (let index = 0; index < timeline.scenes.length; index++) {
        const markups = buildSceneMarkup(index)
        if (markups.length === 0) {
          ttsResults.push(null)
          continue
        }

        // 모든 구간이 캐시되어 있는지 확인
        const allCached = markups.every(markup => {
          const key = makeTtsKey(voiceTemplate, markup)
          return ttsCacheRef.current.has(key)
        })

        if (allCached) {
          // 모든 구간의 duration 합산
          const totalDuration = markups.reduce((sum, markup) => {
            const key = makeTtsKey(voiceTemplate, markup)
            const cached = ttsCacheRef.current.get(key)
            return sum + (cached?.durationSec || 0)
          }, 0)
          
          // 첫 번째 구간의 blob 사용 (임시, 나중에 수정 필요)
          const firstKey = makeTtsKey(voiceTemplate, markups[0])
          const firstCached = ttsCacheRef.current.get(firstKey)
          
          if (firstCached && firstCached.blob) {
            ttsResults.push({ 
              sceneIndex: index, 
              blob: firstCached.blob,
              durationSec: totalDuration || timeline.scenes[index]?.duration || 2.5
            })
          } else {
            ttsResults.push(null)
          }
        } else {
          // 합성이 필요한 것들은 나중에 순차 처리
          ttsResults.push(null)
        }
      }

      // 합성이 필요한 씬들만 순차적으로 처리 (레이트 리밋 방지)
      const scenesToSynthesize: number[] = []
      for (let index = 0; index < timeline.scenes.length; index++) {
        if (ttsResults[index] === null) {
          scenesToSynthesize.push(index)
        }
      }

      // 순차적으로 합성 (배치 처리 + 딜레이)
      const batchSize = 2 // 한 번에 2개씩
      const batchDelay = 1000 // 배치 간 1초 딜레이

      for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
        const batch = scenesToSynthesize.slice(i, i + batchSize)
        
        // 배치 내에서는 병렬 처리
        const batchPromises = batch.map(async (sceneIndex) => {
          try {
            const result = await ensureSceneTts(sceneIndex)
            // TODO: 각 구간별로 처리하도록 수정 필요
            const firstPart = result.parts[0]
            if (firstPart) {
              ttsResults[sceneIndex] = { 
                sceneIndex, 
                blob: firstPart.blob,
                durationSec: result.parts.reduce((sum, part) => sum + part.durationSec, 0) || timeline.scenes[sceneIndex]?.duration || 2.5
              }
            }
          } catch (error) {
            // 레이트 리밋 에러인 경우 재시도
            const isRateLimit = (error instanceof Error && (
              error.message.includes('요청이 너무 많습니다') ||
              error.message.includes('Too many requests') ||
              (error as any).isRateLimit
            ))
            
            if (isRateLimit) {
              // 1초 후 재시도
              await new Promise(resolve => setTimeout(resolve, 1000))
              try {
                const result = await ensureSceneTts(sceneIndex)
                // TODO: 각 구간별로 처리하도록 수정 필요
                const firstPart = result.parts[0]
                if (firstPart) {
                  ttsResults[sceneIndex] = { 
                    sceneIndex, 
                    blob: firstPart.blob,
                    durationSec: result.parts.reduce((sum, part) => sum + part.durationSec, 0) || timeline.scenes[sceneIndex]?.duration || 2.5
                  }
                }
              } catch (retryError) {
                // 재시도 실패 시 무시
              }
            }
          }
        })
        
        await Promise.allSettled(batchPromises)
        
        // 마지막 배치가 아니면 딜레이
        if (i + batchSize < scenesToSynthesize.length) {
          await new Promise(resolve => setTimeout(resolve, batchDelay))
        }
      }
      
      // 2. 각 TTS Blob을 서버에 업로드하고 URL 받기
      const ttsUrlPromises = ttsResults.map(async (result, index) => {
        if (!result || !result.blob) return null

        const formData = new FormData()
        formData.append('file', result.blob, `scene_${index}_voice.mp3`)
        formData.append('sceneIndex', String(index))

        // TTS 파일 업로드 API 호출
        const uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        })

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}))
          throw new Error(`씬 ${index + 1}의 음성 파일 업로드 실패: ${errorData.error || '알 수 없는 오류'}`)
        }

        const uploadData = await uploadRes.json()
        return uploadData.url // 서버에서 반환하는 URL
      })

      const ttsUrls = await Promise.all(ttsUrlPromises)

      // 3. resolution 파싱 (예: "1080x1920" -> {width: 1080, height: 1920})
      const [width, height] = timeline.resolution.split('x').map(Number)
      
      // 4. 첫 번째 상품 정보 가져오기 (metadata용)
      const firstProduct = selectedProducts[0]
      
      // 5. BGM 템플릿 URL 가져오기
      const bgmTemplateObj = bgmTemplate ? bgmTemplates.find(t => t.id === bgmTemplate) : null
      const bgmUrl = bgmTemplateObj ? getBgmTemplateUrlSync(bgmTemplateObj) : null
      
      // 6. API 문서 형태로 변환
      const encodingRequest = {
        videoId: crypto.randomUUID(),
        videoTitle: videoTitle || '제목 없음',
        description: videoDescription || '',
        sequence: 1,
        renderSettings: {
          resolution: {
            width,
            height,
          },
          fps: timeline.fps,
          playbackSpeed: timeline.playbackSpeed || 1,
          outputFormat: 'mp4',
          codec: 'libx264',
          bitrate: '8M',
          backgroundColor: '#000000',
        },
        audio: {
          bgm: {
            enabled: !!bgmTemplate,
            templateId: bgmTemplate || null,
            url: bgmUrl || null,
            volume: 0.5,
            fadeIn: 2,
            fadeOut: 2,
          },
          voice: {
            enabled: !!voiceTemplate,
            templateId: voiceTemplate || null,
            volume: 1,
          },
        },
        scenes: (() => {
          // 같은 sceneId를 가진 씬들을 그룹화
          // sceneId가 없는 씬들은 각각 개별 씬으로 처리하기 위해 임시 고유 ID 할당
          const sceneGroups = new Map<number | string, Array<{ scene: TimelineScene; index: number; ttsResult?: any; ttsUrl?: string | null }>>()
          let tempIdCounter = -1
          
          timeline.scenes.forEach((scene, index) => {
            // sceneId가 있으면 사용, 없으면 임시 고유 ID 할당
            const sceneId = scene.sceneId !== undefined ? scene.sceneId : `temp_${tempIdCounter--}`
            
            if (!sceneGroups.has(sceneId)) {
              sceneGroups.set(sceneId, [])
            }
            sceneGroups.get(sceneId)!.push({
              scene,
              index,
              ttsResult: ttsResults[index],
              ttsUrl: ttsUrls[index],
            })
          })

          // 각 그룹 내에서 splitIndex 순서로 정렬
          // splitIndex가 없으면 원본 배열 순서(index)로 정렬
          sceneGroups.forEach(group => {
            group.sort((a, b) => {
              const aSplitIndex = scenes[a.index]?.splitIndex
              const bSplitIndex = scenes[b.index]?.splitIndex
              
              // splitIndex가 둘 다 있으면 splitIndex로 정렬
              if (aSplitIndex !== undefined && bSplitIndex !== undefined) {
                return aSplitIndex - bSplitIndex
              }
              // splitIndex가 하나만 있으면 있는 것이 앞으로
              if (aSplitIndex !== undefined) return -1
              if (bSplitIndex !== undefined) return 1
              // 둘 다 없으면 원본 순서 유지
              return a.index - b.index
            })
          })

          // 그룹화된 씬들을 하나의 씬으로 변환
          const SUBTITLE_SEPARATOR = '|||'
          return Array.from(sceneGroups.entries()).map(([sceneId, group], groupIndex) => {
            // 임시 ID인 경우 개별 씬으로 처리 (그룹이 1개인 경우)
            const isTempId = typeof sceneId === 'string' && sceneId.startsWith('temp_')
            const actualSceneId = isTempId ? groupIndex + 1 : (sceneId as number) + 1
            
            // 같은 그룹 내에서는 첫 번째 씬의 이미지 사용
            const firstScene = group[0].scene
            // 마지막 씬의 정보 사용 (transition 등)
            const lastScene = group[group.length - 1].scene
            
            // 자막을 특수기호로 연결 (씬마다 자막을 |||로 구분)
            const mergedText = group
              .map(item => item.scene.text.content.trim())
              .filter(text => text.length > 0) // 빈 자막 제거
              .join(SUBTITLE_SEPARATOR)

            // duration 합산
            const totalDuration = group.reduce((sum, item) => {
              const ttsDuration = item.ttsResult?.durationSec || item.scene.duration || 2.5
              return sum + ttsDuration
            }, 0)

            // TTS 처리: 첫 번째 TTS URL 사용 (또는 서버에서 합쳐진 텍스트로 새로 생성)
            const mergedTtsUrl = group[0].ttsUrl || null
            const mergedVoiceText = mergedText

            // transition 파싱 (마지막 씬의 transition 사용)
            const transitionType = lastScene.transition || 'none'
            const transitionMap: Record<string, any> = {
              fade: { type: 'fade', duration: lastScene.transitionDuration || 0.5, direction: 'left', easing: 'easeInOut' },
              slide: { type: 'slide', duration: lastScene.transitionDuration || 0.5, direction: 'left', easing: 'easeInOut' },
              zoom: { type: 'zoom', duration: lastScene.transitionDuration || 0.5, scale: 1.2, easing: 'easeInOut' },
              none: { type: 'none', duration: 0 },
            }

            // 폰트 정보 (마지막 씬의 폰트 사용)
            const sceneFontId = lastScene.text.font || subtitleFont || SUBTITLE_DEFAULT_FONT_ID
            const sceneFontWeight = lastScene.text.fontWeight || 700
            const fontSize = lastScene.text.fontSize || 48
            const fontFileName = getFontFileName(sceneFontId, sceneFontWeight) || 'NanumGothic-Regular'

            return {
              sceneId: actualSceneId, // API는 1부터 시작
              order: groupIndex,
              duration: totalDuration,
              transition: transitionMap[transitionType] || transitionMap.none,
              image: {
                url: firstScene.image, // 같은 그룹 내에서는 첫 번째 씬의 이미지 사용
                fit: firstScene.imageFit || 'contain',
                transform: firstScene.imageTransform ? {
                  ...firstScene.imageTransform,
                  anchor: {
                    x: 0.5,
                    y: 0.5,
                  },
                } : {
                  x: width / 2,
                  y: height / 2,
                  width: width,
                  height: height,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  anchor: { x: 0.5, y: 0.5 },
                },
              },
              text: {
                content: mergedText, // 특수기호로 연결된 자막
                visible: true,
                font: {
                  family: fontFileName,
                  size: fontSize,
                  weight: String(sceneFontWeight),
                  style: lastScene.text.style?.italic ? 'italic' : 'normal',
                },
                color: lastScene.text.color || '#FFFFFF',
                stroke: {
                  enabled: true,
                  color: '#000000',
                  width: 10,
                },
                shadow: {
                  enabled: false,
                  color: '#000000',
                  blur: 0,
                  offsetX: 0,
                  offsetY: 0,
                },
                decoration: {
                  underline: lastScene.text.style?.underline || false,
                  italic: lastScene.text.style?.italic || false,
                },
                alignment: lastScene.text.position || 'center',
                transform: lastScene.text.transform ? {
                  ...lastScene.text.transform,
                  anchor: {
                    x: 0.5,
                    y: 0.5,
                  },
                } : {
                  x: width / 2,
                  y: height / 2,
                  width: width * 0.9,
                  height: 100,
                  scaleX: 1,
                  scaleY: 1,
                  rotation: 0,
                  anchor: { x: 0.5, y: 0.5 },
                },
              },
              voice: {
                enabled: !!mergedTtsUrl,
                text: mergedVoiceText, // 합쳐진 텍스트
                startTime: 0.5,
                url: mergedTtsUrl,
              },
              effects: {
                glow: {
                  enabled: lastScene.advancedEffects?.glow?.enabled || false,
                  color: lastScene.advancedEffects?.glow?.color 
                    ? `#${lastScene.advancedEffects.glow.color.toString(16).padStart(6, '0')}` 
                    : '#FFFF00',
                  strength: lastScene.advancedEffects?.glow?.outerStrength || 10,
                  distance: lastScene.advancedEffects?.glow?.distance || 20,
                },
                particles: {
                  enabled: lastScene.advancedEffects?.particles?.enabled || false,
                  type: lastScene.advancedEffects?.particles?.type || 'sparkle',
                  count: lastScene.advancedEffects?.particles?.count || 50,
                },
              },
            }
          })
        })(),
        metadata: firstProduct ? {
          originalUrl: firstProduct.url,
          partnersLink: firstProduct.url, // 쿠팡 파트너스 링크로 변환 필요할 수도 있음
          mallType: firstProduct.platform.toUpperCase() as 'COUPANG' | 'NAVER' | 'ALIEXPRESS' | 'AMAZON',
        } : {
          // 상품이 없을 때 기본값 (백엔드 유효성 검사를 통과하기 위한 필수 값)
          originalUrl: 'https://www.coupang.com',
          partnersLink: 'https://www.coupang.com',
          mallType: 'COUPANG',
        },
      }

      const exportData = {
        jobType: 'AUTO_CREATE_VIDEO_FROM_DATA',
        encodingRequest,
      }

      // 서버로 전송하는 JSON 바디 로그 출력
      console.log('=== 인코딩 요청 JSON 바디 ===')
      console.log(JSON.stringify(exportData, null, 2))
      console.log('===========================')

      // 7. 최종 인코딩 요청 전송
      const response = await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(exportData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || '영상 생성 실패')
      }

      const result = await response.json()
      
      // jobId를 받아서 step5로 이동
      if (result.jobId) {
        setIsExporting(false)
        router.push(`/video/create/step5?jobId=${result.jobId}`)
      } else {
        setIsExporting(false)
        alert('영상 생성이 시작되었어요. 완료되면 알림을 받으실 수 있어요.')
      }
    } catch (error) {
      alert(`영상 생성 중 오류가 발생했어요: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
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
      style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}
    >
      <StepIndicator />
      <div className="flex-1 flex overflow-hidden h-full" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
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
              style={{}}
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
              <div 
                className="flex items-center justify-between text-xs" 
              style={{
                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                }}
              >
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

              <div 
                className="flex items-center gap-2 relative"
              >
                        {showReadyMessage && (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 animate-bounce">
                            재생이 가능해요!
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-600"></div>
                          </div>
                        )}
                        <Button
                          onClick={handlePlayPause}
                          variant="outline"
                          size="sm"
                  className="flex-1"
                          disabled={isTtsBootstrapping || isBgmBootstrapping || isPreparing}
                        >
                          {isTtsBootstrapping || isBgmBootstrapping || isPreparing ? (
                            <>
                      <Clock className="w-4 h-4 mr-2" />
                              로딩중…
                            </>
                          ) : isPlaying ? (
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
                          disabled={isExporting}
                          size="sm"
                          className="flex-1"
                        >
                          {isExporting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              제작 시작 중...
                            </>
                          ) : (
                            '내보내기'
                          )}
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
                      const textY = height * 0.90 // 하단에서 12% 위 (88% 위치)
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
                          fontSize: 80,
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
              onTtsPreview={handleSceneTtsPreview}
            />
          </div>
        </div>

        {/* 오른쪽 패널: 효과 설정 */}
        <div className="w-[30%] flex flex-col h-full overflow-hidden" style={{
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
          maxWidth: '30%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}>
          <EffectsPanel
            theme={theme}
            rightPanelTab={rightPanelTab}
            setRightPanelTab={setRightPanelTab}
            timeline={timeline}
            currentSceneIndex={currentSceneIndex}
            allTransitions={allTransitions}
            transitions={transitions}
            movements={movements}
            onTransitionChange={handleSceneTransitionChange}
            onAdvancedEffectChange={handleAdvancedEffectChange}
            bgmTemplate={bgmTemplate}
            setBgmTemplate={setBgmTemplate}
            confirmedBgmTemplate={confirmedBgmTemplate}
            onBgmConfirm={handleBgmConfirm}
            setTimeline={setTimeline}
          />
        </div>
      </div>
    </motion.div>
  )
}

