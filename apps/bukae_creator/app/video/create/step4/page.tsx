'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Pause, Clock, Edit2, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Sparkles, Grid3x3, Loader2, CheckCircle2, XCircle } from 'lucide-react'
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
import { makeMarkupFromPlainText } from '@/lib/tts/auto-pause'
import { resolveSubtitleFontFamily, SUBTITLE_DEFAULT_FONT_ID, loadSubtitleFont, isSubtitleFontId } from '@/lib/subtitle-fonts'
import { authStorage } from '@/lib/api/auth-storage'
import { bgmTemplates, getBgmTemplateUrlSync, type BgmTemplate } from '@/lib/data/templates'
import { StudioJobWebSocket, type StudioJobUpdate } from '@/lib/api/websocket'
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
  const [currentJobId, setCurrentJobId] = useState<string | null>(null) // 현재 진행 중인 작업 ID
  const [jobStatus, setJobStatus] = useState<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null>(null) // 작업 상태
  const [jobProgress, setJobProgress] = useState<string>('') // 작업 진행 상황
  const [jobProgressPercent, setJobProgressPercent] = useState<number>(0) // 작업 진행률 (0-100)
  const [jobStartTime, setJobStartTime] = useState<number | null>(null) // 작업 시작 시간
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null) // 완료된 영상 URL
  const [isExporting, setIsExporting] = useState(false) // 내보내기 진행 중 여부
  const jobStatusCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null) // 상태 확인 timeout ID
  const websocketRef = useRef<StudioJobWebSocket | null>(null) // WebSocket 연결 ref

  // 작업 상태 확인 취소 함수
  const cancelJobStatusCheck = useCallback(() => {
    if (jobStatusCheckTimeoutRef.current) {
      clearTimeout(jobStatusCheckTimeoutRef.current)
      jobStatusCheckTimeoutRef.current = null
      console.log('작업 상태 확인이 취소되었습니다.')
    }
    if (websocketRef.current) {
      websocketRef.current.disconnect()
      websocketRef.current = null
      console.log('WebSocket 연결이 해제되었습니다.')
    }
    setCurrentJobId(null)
    setJobStatus(null)
    setJobProgress('')
    setJobProgressPercent(0)
  }, [])

  // 컴포넌트 언마운트 시 상태 확인 중단
  useEffect(() => {
    return () => {
      if (jobStatusCheckTimeoutRef.current) {
        clearTimeout(jobStatusCheckTimeoutRef.current)
      }
      if (websocketRef.current) {
        websocketRef.current.disconnect()
        websocketRef.current = null
      }
    }
  }, [])

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
          imageFit: existingScene?.imageFit || 'fill', // 기본값을 fill로 변경하여 9:16 캔버스를 항상 채움
          text: {
            content: scene.script,
            font: existingScene?.text?.font ?? subtitleFont ?? SUBTITLE_DEFAULT_FONT_ID,
            fontWeight: existingScene?.text?.fontWeight ?? 700,
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
    if (!timeline) return
    
    // 재생 중이 아니거나 skipStopPlaying이 false일 때만 재생 중지
    if (isPlaying && !skipStopPlaying) {
      setIsPlaying(false)
      resetTtsSession()
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
    if (skipStopPlaying && lastRenderedSceneIndexRef.current === index && index === currentSceneIndex) {
      // 재생 시작 시 현재 씬을 다시 선택: 이전 씬으로 설정
      // 첫 씬일 때는 null로 설정하여 페이드 인 효과가 나타나도록 함
      if (index > 0) {
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
    // 씬 선택
    isManualSceneSelectRef.current = true
    currentSceneIndexRef.current = index
    setCurrentTime(timeUntilScene)
    // 선택된 씬의 전환 효과 가져오기
    const selectedScene = timeline.scenes[index]
    const transition = selectedScene?.transition || 'fade'
    
    // 씬 리스트에서 선택할 때는 이전 씬을 보여주지 않고 검은 캔버스에서 시작
    // previousIndex를 null로 설정하여 페이드 인 효과처럼 보이게 함
    if (!skipStopPlaying) {
      prevIndex = null
    }
    
    requestAnimationFrame(() => {
      // 씬 리스트에서 선택할 때와 재생 중일 때 모두 전환 효과 적용
      const transitionCompleteCallback = () => {
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
  const isPlayingRef = useRef(false)
  const currentPlayIndexRef = useRef<number>(0)

  // -----------------------------
  // TTS 재생/프리페치/캐시 (Chirp3 HD: speakingRate + markup pause 지원)
  // -----------------------------
  const ttsCacheRef = useRef(
    new Map<string, { blob: Blob; durationSec: number; markup: string }>()
  )
  const ttsInFlightRef = useRef(
    new Map<string, Promise<{ blob: Blob; durationSec: number; markup: string }>>()
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
          console.error('BGM 파일을 불러올 수 없습니다:', response.status)
          stopBgmAudio()
          return
        }
      } catch (fetchError) {
        console.error('BGM 파일에 접근할 수 없습니다:', fetchError)
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
      console.error('BGM 로드 실패:', error)
      stopBgmAudio()
    }
  }, [stopBgmAudio])

  const handleBgmConfirm = useCallback((templateId: string | null) => {
    setConfirmedBgmTemplate(templateId)
  }, [])

  // voice/speakingRate/pausePreset이 바뀌면 합성 결과가 바뀌므로 캐시를 초기화
  useEffect(() => {
    resetTtsSession()
  }, [voiceTemplate, resetTtsSession])

  const buildSceneMarkup = useCallback(
    (sceneIndex: number) => {
      if (!timeline) return ''
      const base = (timeline.scenes[sceneIndex]?.text?.content ?? '').trim()
      if (!base) return ''
      const isLast = sceneIndex >= timeline.scenes.length - 1
      // 사용자에게는 보이지 않게, 합성 요청 직전에만 자동 숨을 markup에 삽입
      return makeMarkupFromPlainText(base, { 
        addSceneTransitionPause: !isLast
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
      setTimeline({
        ...timeline,
        scenes: timeline.scenes.map((s, i) => (i === sceneIndex ? { ...s, duration: clamped } : s)),
      })
    },
    [setTimeline, timeline]
  )

  const ensureSceneTts = useCallback(
    async (sceneIndex: number, signal?: AbortSignal) => {
      if (!timeline) throw new Error('timeline이 없습니다.')
      if (!voiceTemplate) throw new Error('목소리를 먼저 선택해주세요.')

      const markup = buildSceneMarkup(sceneIndex)
      if (!markup) throw new Error('씬 대본이 비어있습니다.')

      const key = makeTtsKey(voiceTemplate, markup)

      const cached = ttsCacheRef.current.get(key)
      if (cached) return cached

      const inflight = ttsInFlightRef.current.get(key)
      if (inflight) return await inflight

      const p = (async () => {
        const accessToken = authStorage.getAccessToken()
        if (!accessToken) {
          throw new Error('로그인이 필요합니다.')
        }

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
          // 레이트 리밋 에러인지 확인하기 위해 원본 응답 상태 저장
          if (res.status === 429) {
            (error as any).isRateLimit = true
          }
          throw error
        }

        const blob = await res.blob()
        const durationSec = await getMp3DurationSec(blob)

        setSceneDurationFromAudio(sceneIndex, durationSec)

        const entry = { blob, durationSec, markup }
        ttsCacheRef.current.set(key, entry)
        return entry
      })().finally(() => {
        ttsInFlightRef.current.delete(key)
      })

      ttsInFlightRef.current.set(key, p)
      return await p
    },
    [
      timeline,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
      getMp3DurationSec,
      setSceneDurationFromAudio,
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

        // TTS 합성 (캐시되어 있으면 즉시 반환)
        const { blob } = await ensureSceneTts(sceneIndex)

        // 오디오 재생
        const url = URL.createObjectURL(blob)
        scenePreviewAudioUrlRef.current = url
        const audio = new Audio(url)
        scenePreviewAudioRef.current = audio

        audio.onended = () => {
          stopScenePreviewAudio()
        }

        audio.onerror = () => {
          stopScenePreviewAudio()
        }

        await audio.play()
      } catch (error) {
        console.error('[TTS 미리듣기] 실패:', error)
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
  
  const handlePlayPause = async () => {
    if (!isPlaying) {
      // "재생이 가능해요!" 메시지가 표시되어 있으면 실제 재생 시작
      if (showReadyMessage) {
        setShowReadyMessage(false)
        setIsPlaying(true)
        isPlayingRef.current = true
        
        // TTS 전체 길이 계산 및 BGM 페이드 아웃 설정
        const calculateTotalTtsDuration = (): number => {
          let totalDuration = 0
          for (let i = currentSceneIndex; i < timeline!.scenes.length; i++) {
            const markup = buildSceneMarkup(i)
            const key = markup ? makeTtsKey(voiceTemplate!, markup) : null
            const cached = key ? ttsCacheRef.current.get(key) : null
            if (cached) {
              totalDuration += cached.durationSec
            } else {
              totalDuration += timeline!.scenes[i]?.duration || 3
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
          audio.play().catch((err) => {
            console.error('[BGM] 재생 실패:', err)
          })
        }
        
        // BGM 페이드 아웃 시작
        setupBgmFadeOut()
        
        // 실제 재생 시작 로직은 playNextScene에서 처리
        const playNextScene = (currentIndex: number) => {
          if (currentIndex >= timeline!.scenes.length) {
            setIsPlaying(false)
            isPlayingRef.current = false
            stopBgmAudio()
            return
          }
          
          const sceneIndex = currentIndex
          const scene = timeline!.scenes[sceneIndex]
          const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
          
          handleSceneSelect(sceneIndex, true, () => {
            // 캐시된 TTS 사용
            const markup = buildSceneMarkup(sceneIndex)
            const key = markup ? makeTtsKey(voiceTemplate!, markup) : null
            const cached = key ? ttsCacheRef.current.get(key) : null
            
            // if (!cached) {
            //   console.warn(`[TTS] 씬 ${sceneIndex} 캐시 미스 - 키: ${key}`)
            //   console.log('[TTS] 현재 캐시 키 목록:', Array.from(ttsCacheRef.current.keys()))
            // } else {
            //   console.log(`[TTS] 씬 ${sceneIndex} 캐시 히트 - 재생 시작`)
            // }
            
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
              
              const sceneDuration = durationSec > 0 ? durationSec : scene.duration
              const waitTime = (sceneDuration * 1000) / speed
              
              playTimeoutRef.current = setTimeout(() => {
                if (isPlayingRef.current) {
                  playNextScene(currentIndex + 1)
                }
              }, waitTime)
            } else {
              // 캐시에 없으면 fallback duration 사용
              const fallbackDuration = scene.duration
              const waitTime = (fallbackDuration * 1000) / speed
              
              playTimeoutRef.current = setTimeout(() => {
                if (isPlayingRef.current) {
                  playNextScene(currentIndex + 1)
                }
              }, waitTime)
            }
          })
        }
        
        playNextScene(currentSceneIndex)
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
      const batchDelay = 3000 // 3초 딜레이
      const ttsPromises = []

      // 먼저 캐시 확인하여 이미 합성된 씬은 스킵
      const scenesToSynthesize = []
      for (let i = currentSceneIndex; i < timeline.scenes.length; i++) {
        const markup = buildSceneMarkup(i)
        const key = markup ? makeTtsKey(voiceTemplate!, markup) : null
        const cached = key ? ttsCacheRef.current.get(key) : null
        
        if (!cached) {
          scenesToSynthesize.push(i)
        } else {
          // console.log(`[TTS] 씬 ${i} 이미 캐시됨 - 스킵`)
        }
      }

      // console.log(`[TTS] 합성 필요: ${scenesToSynthesize.length}개 씬 (${scenesToSynthesize.join(', ')})`)

      // 캐시되지 않은 씬만 배치 처리
      for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
        const batch = []
        for (let j = 0; j < batchSize && i + j < scenesToSynthesize.length; j++) {
          const sceneIndex = scenesToSynthesize[i + j]
          batch.push(
            ensureSceneTts(sceneIndex)
              .then((result) => {
                // if (!result) {
                //   console.warn(`[TTS] 씬 ${sceneIndex} 합성 결과가 null입니다.`)
                // } else {
                //   console.log(`[TTS] 씬 ${sceneIndex} 합성 완료 및 캐시 저장 (${i + j + 1}/${scenesToSynthesize.length})`)
                // }
                return result
              })
              .catch((err) => {
                console.error(`[TTS] 씬 ${sceneIndex} 합성 실패:`, err)
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
        ? startBgmAudio(confirmedBgmTemplate, speed, false).catch((err) => {
            console.error('[BGM] 로드 실패:', err)
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
          
          // "재생이 가능해요!" 메시지 표시
          setShowReadyMessage(true)
        })
        .catch((error) => {
          console.error('[재생 준비] 실패:', error)
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
    // 이미 진행 중이면 중복 실행 방지
    if (isExporting || currentJobId) {
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

    // 내보내기 시작 - UI 즉시 변경
    setIsExporting(true)
    setJobStatus('PENDING')
    setJobProgress('영상 제작을 시작합니다...')
    setJobProgressPercent(0)
    setResultVideoUrl(null)

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
        const markup = buildSceneMarkup(index)
        if (!markup) {
          ttsResults.push(null)
          continue
        }

        const key = makeTtsKey(voiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        
        if (cached && cached.blob) {
          // 캐시된 것 사용 (durationSec 포함)
          ttsResults.push({ 
            sceneIndex: index, 
            blob: cached.blob,
            durationSec: cached.durationSec || timeline.scenes[index]?.duration || 2.5
          })
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
      const batchDelay = 2000 // 배치 간 2초 딜레이

      for (let i = 0; i < scenesToSynthesize.length; i += batchSize) {
        const batch = scenesToSynthesize.slice(i, i + batchSize)
        
        // 배치 내에서는 병렬 처리
        const batchPromises = batch.map(async (sceneIndex) => {
          try {
            await ensureSceneTts(sceneIndex)
            const markup = buildSceneMarkup(sceneIndex)
            if (!markup) return
            
            const key = makeTtsKey(voiceTemplate, markup)
            const cached = ttsCacheRef.current.get(key)
            
            if (cached && cached.blob) {
              ttsResults[sceneIndex] = { 
                sceneIndex, 
                blob: cached.blob,
                durationSec: cached.durationSec || timeline.scenes[sceneIndex]?.duration || 2.5
              }
            }
          } catch (error) {
            console.error(`씬 ${sceneIndex + 1} TTS 합성 실패:`, error)
            // 레이트 리밋 에러인 경우 재시도
            const isRateLimit = (error instanceof Error && (
              error.message.includes('요청이 너무 많습니다') ||
              error.message.includes('Too many requests') ||
              (error as any).isRateLimit
            ))
            
            if (isRateLimit) {
              // 5초 후 재시도
              console.log(`씬 ${sceneIndex + 1} 레이트 리밋 에러, 5초 후 재시도...`)
              await new Promise(resolve => setTimeout(resolve, 5000))
              try {
                await ensureSceneTts(sceneIndex)
                const markup = buildSceneMarkup(sceneIndex)
                if (!markup) return
                
                const key = makeTtsKey(voiceTemplate, markup)
                const cached = ttsCacheRef.current.get(key)
                if (cached && cached.blob) {
                  ttsResults[sceneIndex] = { 
                    sceneIndex, 
                    blob: cached.blob,
                    durationSec: cached.durationSec || timeline.scenes[sceneIndex]?.duration || 2.5
                  }
                  console.log(`씬 ${sceneIndex + 1} TTS 재시도 성공`)
                }
              } catch (retryError) {
                console.error(`씬 ${sceneIndex + 1} TTS 재시도 실패:`, retryError)
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

      // 디버깅: TTS URL 확인 및 검증
      console.log('=== TTS 업로드 결과 ===')
      console.log('ttsResults:', ttsResults.map((r, i) => ({ 
        index: i, 
        hasBlob: !!r?.blob, 
        durationSec: r?.durationSec 
      })))
      console.log('ttsUrls:', ttsUrls.map((url, i) => ({ index: i, url })))
      
      // TTS URL이 없는 씬 확인
      const missingTts = ttsUrls.map((url, index) => ({ index, url, hasTts: !!url }))
        .filter(item => !item.hasTts)
      if (missingTts.length > 0) {
        console.warn('⚠️ TTS URL이 없는 씬:', missingTts)
      }
      console.log('==================')

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
        scenes: timeline.scenes.map((scene, index) => {
          // transition 파싱
          const transitionType = scene.transition || 'none'
          const transitionMap: Record<string, any> = {
            fade: { type: 'fade', duration: scene.transitionDuration || 0.5, direction: 'left', easing: 'easeInOut' },
            slide: { type: 'slide', duration: scene.transitionDuration || 0.5, direction: 'left', easing: 'easeInOut' },
            zoom: { type: 'zoom', duration: scene.transitionDuration || 0.5, scale: 1.2, easing: 'easeInOut' },
            none: { type: 'none', duration: 0 },
          }
          
          // 폰트 정보 파싱
          const fontFamily = subtitleFont || 'Pretendard'
          const fontSize = scene.text.fontSize || 32
          
          // TTS URL 가져오기
          const voiceUrl = ttsUrls[index] || null
          const voiceText = scene.text.content
          
          // TTS 오디오 길이를 우선 사용 (실제 오디오 길이가 더 정확함)
          const ttsResult = ttsResults[index]
          const sceneDuration = ttsResult?.durationSec || scene.duration || 2.5

          // 디버깅: 각 씬의 정보 확인 (처음 5개 씬만 로그)
          if (index < 5) {
            console.log(`씬 ${index + 1}:`, {
              voiceUrl: voiceUrl || '없음',
              duration: sceneDuration,
              ttsResult: ttsResult ? { hasBlob: true, durationSec: ttsResult.durationSec } : null,
              sceneDuration: scene.duration,
              voiceEnabled: !!voiceUrl
            })
          }

          return {
            sceneId: scene.sceneId + 1, // API는 1부터 시작
            order: index,
            duration: sceneDuration,
            transition: transitionMap[transitionType] || transitionMap.none,
            image: {
              url: scene.image,
              fit: scene.imageFit || 'fill',
              transform: scene.imageTransform ? {
                ...scene.imageTransform,
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
              content: scene.text.content,
              visible: true,
              font: {
                family: fontFamily,
                size: fontSize,
                weight: String(scene.text.fontWeight || 700),
                style: scene.text.style?.italic ? 'italic' : 'normal',
              },
              color: scene.text.color || '#FFFFFF',
              stroke: {
                enabled: true,
                color: scene.text.color || '#FFFFFF',
                width: 3,
              },
              shadow: {
                enabled: true,
                color: '#000000',
                blur: 10,
                offsetX: 5,
                offsetY: 5,
              },
              decoration: {
                underline: scene.text.style?.underline || false,
                italic: scene.text.style?.italic || false,
              },
              alignment: scene.text.position || 'center',
              transform: scene.text.transform ? {
                ...scene.text.transform,
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
              enabled: !!voiceUrl,
              text: voiceText,
              startTime: 0.5,
              url: voiceUrl, // 업로드된 TTS MP3 파일 URL
            },
            effects: {
              glow: {
                enabled: scene.advancedEffects?.glow?.enabled || false,
                color: scene.advancedEffects?.glow?.color 
                  ? `#${scene.advancedEffects.glow.color.toString(16).padStart(6, '0')}` 
                  : '#FFFF00',
                strength: scene.advancedEffects?.glow?.outerStrength || 10,
                distance: scene.advancedEffects?.glow?.distance || 20,
              },
              particles: {
                enabled: scene.advancedEffects?.particles?.enabled || false,
                type: scene.advancedEffects?.particles?.type || 'sparkle',
                count: scene.advancedEffects?.particles?.count || 50,
              },
            },
          }
        }),
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

      // JSON 바디 확인용 로그
      console.log('=== 인코딩 요청 JSON 바디 ===')
      console.log(JSON.stringify(exportData, null, 2))
      console.log('===========================')
      
      // 각 씬의 TTS URL 및 Duration 확인
      console.log('=== 씬별 상세 정보 확인 ===')
      let totalDuration = 0
      encodingRequest.scenes.forEach((scene: any, index: number) => {
        totalDuration += scene.duration
        console.log(`씬 ${index + 1}:`, {
          sceneId: scene.sceneId,
          duration: scene.duration,
          voiceUrl: scene.voice?.url || '없음',
          voiceEnabled: scene.voice?.enabled,
          voiceText: scene.voice?.text || '없음',
          imageUrl: scene.image?.url || '없음',
        })
      })
      console.log(`총 예상 길이: ${totalDuration.toFixed(2)}초`)
      console.log('========================')
      
      // Duration과 TTS URL 검증
      const missingTtsScenes = encodingRequest.scenes
        .map((scene: any, index: number) => ({ index: index + 1, scene, hasTts: !!scene.voice?.url }))
        .filter(item => !item.hasTts)
      
      if (missingTtsScenes.length > 0) {
        console.error('❌ TTS URL이 없는 씬:', missingTtsScenes)
      } else {
        console.log('✅ 모든 씬에 TTS URL이 있습니다.')
      }
      
      const shortDurationScenes = encodingRequest.scenes
        .map((scene: any, index: number) => ({ index: index + 1, duration: scene.duration }))
        .filter(item => item.duration < 1.5)
      
      if (shortDurationScenes.length > 0) {
        console.warn('⚠️ Duration이 1.5초 미만인 씬:', shortDurationScenes)
      }

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
      
      // jobId 저장 및 상태 확인 시작
      if (result.jobId) {
        setCurrentJobId(result.jobId)
        setJobStatus(result.status || 'PENDING')
        setJobProgress(result.message || '영상 생성이 시작되었어요.')
        setJobProgressPercent(0)
        const startTime = Date.now() // 작업 시작 시간 기록
        setJobStartTime(startTime)
        
        // 상태 업데이트 처리 함수 (공통 로직)
        const handleStatusUpdate = (statusData: any) => {
          setJobStatus(statusData.status)
          
          // progressDetail이 객체인 경우 처리
          let progressText = ''
          let progressPercent = 0
          
          if (statusData.progressDetail) {
            if (typeof statusData.progressDetail === 'string') {
              progressText = statusData.progressDetail
            } else if (typeof statusData.progressDetail === 'object') {
              // 객체인 경우 msg나 message 필드 추출
              progressText = statusData.progressDetail.msg || 
                            statusData.progressDetail.message || 
                            statusData.progressDetail.step ||
                            statusData.progressDetail.progress ||
                            JSON.stringify(statusData.progressDetail)
              // progress 필드가 숫자면 진행률로 사용
              if (typeof statusData.progressDetail.progress === 'number') {
                progressPercent = statusData.progressDetail.progress
              } else if (typeof statusData.progressDetail.percent === 'number') {
                progressPercent = statusData.progressDetail.percent
              }
            }
          } else if (statusData.message) {
            progressText = typeof statusData.message === 'string' 
              ? statusData.message 
              : JSON.stringify(statusData.message)
          }
          
          // 경과 시간 계산 및 표시
          const elapsed = Math.floor((Date.now() - startTime) / 1000) // 초 단위
          const minutes = Math.floor(elapsed / 60)
          const seconds = elapsed % 60
          const timeText = `${minutes}분 ${seconds}초 경과`
          
          if (progressPercent > 0) {
            progressText = `${progressText} (${progressPercent}% - ${timeText})`
          } else {
            progressText = `${progressText} (${timeText})`
          }
          
          setJobProgress(progressText)
          setJobProgressPercent(progressPercent)
          
          if (statusData.status === 'COMPLETED') {
            console.log('[영상 제작] 완료 상태 수신:', statusData)
            const videoUrl = statusData.resultVideoUrl || null
            setResultVideoUrl(videoUrl)
            setJobProgress('영상 생성이 완료되었어요!')
            setJobProgressPercent(100)
            setIsExporting(false) // 내보내기 완료
            
            // 상태 확인 중단
            if (jobStatusCheckTimeoutRef.current) {
              clearTimeout(jobStatusCheckTimeoutRef.current)
              jobStatusCheckTimeoutRef.current = null
            }
            if (websocketRef.current) {
              websocketRef.current.disconnect()
              websocketRef.current = null
            }
            setCurrentJobId(null)
            console.log('[영상 제작] 상태 초기화 완료 - isExporting: false, currentJobId: null')
          } else if (statusData.status === 'FAILED') {
            // 에러 메시지 수집
            let errorMessages = [
              statusData.errorMessage,
              statusData.error?.message,
              statusData.error,
            ].filter(Boolean)
            
            // progressDetail에서 에러 메시지 추출
            if (statusData.progressDetail) {
              if (typeof statusData.progressDetail === 'string') {
                errorMessages.push(statusData.progressDetail)
              } else if (typeof statusData.progressDetail === 'object') {
                const detailMsg = statusData.progressDetail.msg || 
                                statusData.progressDetail.message ||
                                statusData.progressDetail.error
                if (detailMsg) errorMessages.push(detailMsg)
              }
            }
            
            const errorText = errorMessages.length > 0 
              ? errorMessages.join('\n\n') 
              : '알 수 없는 오류'
            
            // ffmpeg 관련 에러인지 확인
            const isFfmpegError = errorText.includes('ffmpeg') || 
                                 errorText.includes('Composition Failed') ||
                                 errorText.includes('frame=')
            
            console.error('=== 영상 생성 실패 상세 ===')
            console.error('Error Message:', statusData.errorMessage)
            console.error('Error Object:', statusData.error)
            console.error('Progress Detail:', statusData.progressDetail)
            console.error('Full Status Data:', JSON.stringify(statusData, null, 2))
            console.error('========================')
            
            // 사용자 친화적인 에러 메시지
            let userMessage = '영상 생성이 실패했어요.\n\n'
            if (isFfmpegError) {
              userMessage += '비디오 인코딩 과정에서 오류가 발생했어요.\n'
              userMessage += '백엔드 서버의 ffmpeg 처리 중 문제가 발생한 것으로 보입니다.\n\n'
              userMessage += '가능한 원인:\n'
              userMessage += '- 서버 리소스 부족\n'
              userMessage += '- 비디오 파일 형식 문제\n'
              userMessage += '- ffmpeg 설정 오류\n\n'
              userMessage += '잠시 후 다시 시도해주시거나, 백엔드 관리자에게 문의해주세요.\n\n'
            }
            userMessage += `에러 상세:\n${errorText.substring(0, 500)}${errorText.length > 500 ? '...' : ''}\n\n`
            userMessage += '자세한 내용은 브라우저 콘솔(F12)을 확인해주세요.'
            
            alert(userMessage)
            if (websocketRef.current) {
              websocketRef.current.disconnect()
              websocketRef.current = null
            }
            setCurrentJobId(null)
            setJobStatus(null)
            setJobProgress('')
            setJobProgressPercent(0)
          }
        }
        
        // HTTP 폴링 함수 (WebSocket 폴백용)
        const startHttpPolling = (jobId: string, startTime: number) => {
          // 이미 HTTP 폴링이 실행 중이면 중복 시작 방지
          if (jobStatusCheckTimeoutRef.current) {
            console.log('[HTTP 폴링] 이미 실행 중입니다.')
            return
          }
          
          console.log('[HTTP 폴링] 시작 - WebSocket 대신 HTTP 폴링으로 상태 확인')
          const MAX_WAIT_TIME = 30 * 60 * 1000 // 30분
          let checkCount = 0
          
          const checkJobStatus = async () => {
            // WebSocket이 다시 연결되었으면 HTTP 폴링 중단
            if (websocketRef.current?.isConnected()) {
              console.log('[HTTP 폴링] WebSocket이 재연결되어 HTTP 폴링을 중단합니다.')
              if (jobStatusCheckTimeoutRef.current) {
                clearTimeout(jobStatusCheckTimeoutRef.current)
                jobStatusCheckTimeoutRef.current = null
              }
              return
            }
            
            checkCount++
            
            // 경과 시간 확인
            const elapsed = Date.now() - startTime
            if (elapsed > MAX_WAIT_TIME) {
              alert(`영상 생성이 30분을 초과했습니다. 백엔드 서버에 문제가 있을 수 있습니다.\n\n작업 ID: ${jobId}\n\n나중에 다시 확인해주세요.`)
              setCurrentJobId(null)
              setJobStatus(null)
              if (jobStatusCheckTimeoutRef.current) {
                clearTimeout(jobStatusCheckTimeoutRef.current)
                jobStatusCheckTimeoutRef.current = null
              }
              return
            }
            
            try {
              // 백엔드 API URL 직접 사용
              const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080'
              const statusResponse = await fetch(`${API_BASE_URL}/api/v1/studio/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              })
              
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                
                // 디버깅: 전체 응답 데이터 로그
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[HTTP 폴링] #${checkCount} - 작업 상태 응답:`)
                  console.log('Status:', statusData.status)
                  console.log('Full Response:', JSON.stringify(statusData, null, 2))
                }
                
                handleStatusUpdate(statusData)
                
                // 완료/실패가 아니면 계속 폴링
                if (statusData.status !== 'COMPLETED' && statusData.status !== 'FAILED') {
                  jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, 5000)
                } else {
                  // 완료/실패 시 폴링 중단
                  console.log(`[HTTP 폴링] 작업 완료 (${statusData.status}), 폴링 중단`)
                  jobStatusCheckTimeoutRef.current = null
                }
              } else {
                // HTTP 에러 응답 처리
                const errorText = await statusResponse.text().catch(() => '')
                console.error(`[HTTP 폴링] #${checkCount} - HTTP 에러:`, statusResponse.status, errorText)
                setJobProgress(`상태 확인 실패 (${statusResponse.status})`)
                // 에러가 나도 계속 확인 시도 (사용자가 취소하기 전까지)
                jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, 5000)
              }
            } catch (error) {
              console.error(`[HTTP 폴링] #${checkCount} - 작업 상태 확인 실패:`, error)
              // 에러가 나도 계속 확인 시도 (사용자가 취소하기 전까지)
              jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, 5000)
            }
          }
          
          // 첫 확인은 5초 후
          jobStatusCheckTimeoutRef.current = setTimeout(checkJobStatus, 5000)
        }
        
        // HTTP 폴링을 먼저 시작 (WebSocket 연결 실패 시에도 상태 확인 가능)
        startHttpPolling(result.jobId, startTime)
        
        // WebSocket 연결 시도 (실시간 UI 업데이트용) - 비동기로 처리
        // 연결이 완료되면 HTTP 폴링이 자동으로 중단됨
        const connectWebSocket = async () => {
          try {
            const ws = new StudioJobWebSocket(
              result.jobId,
              (update: StudioJobUpdate) => {
                // WebSocket에서 받은 실시간 업데이트 처리
                console.log('[WebSocket] ✅ 실시간 업데이트 수신:', {
                  status: update.status,
                  progressDetail: update.progressDetail,
                  resultVideoUrl: update.resultVideoUrl
                })
                handleStatusUpdate(update)
              },
              (error) => {
                // WebSocket 연결 에러 시 HTTP 폴링 계속 사용
                console.warn('[WebSocket] ⚠️ 연결 에러:', error.message)
                console.log('[WebSocket] HTTP 폴링을 계속 사용합니다.')
                // HTTP 폴링은 이미 시작되어 있으므로 추가 작업 불필요
              },
              () => {
                // WebSocket 연결이 끊어졌을 때 HTTP 폴링으로 폴백
                console.log('[WebSocket] 연결이 끊어졌습니다. HTTP 폴링을 계속 사용합니다.')
                // 완료/실패 상태가 아니면 HTTP 폴링 시작 (이미 시작되어 있을 수 있음)
                if (jobStatus !== 'COMPLETED' && jobStatus !== 'FAILED') {
                  startHttpPolling(result.jobId, startTime)
                }
              }
            )
            
            websocketRef.current = ws
            await ws.connect()
            console.log('[WebSocket] ✅ 연결 성공 및 구독 완료 - 실시간 업데이트 활성화')
            // HTTP 폴링은 WebSocket이 연결되면 자동으로 중단됨 (startHttpPolling 내부 로직)
          } catch (error) {
            // WebSocket 연결 실패 시 HTTP 폴링 계속 사용
            console.warn('[WebSocket] ⚠️ 연결 실패:', error instanceof Error ? error.message : '알 수 없는 오류')
            console.log('[WebSocket] HTTP 폴링을 계속 사용합니다.')
            // HTTP 폴링은 이미 시작되어 있으므로 추가 작업 불필요
          }
        }
        
        // WebSocket 연결을 비동기로 시도 (블로킹하지 않음)
        connectWebSocket()
        
        alert('영상 생성이 시작되었어요. 진행 상황을 확인하고 있어요...')
      } else {
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
              style={{
                filter: jobStatus === 'COMPLETED' ? 'blur(4px)' : 'none',
                pointerEvents: jobStatus === 'COMPLETED' ? 'none' : 'auto',
                transition: 'filter 0.3s ease'
              }}
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
                  color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                  filter: jobStatus === 'COMPLETED' ? 'blur(4px)' : 'none',
                  pointerEvents: jobStatus === 'COMPLETED' ? 'none' : 'auto',
                  transition: 'filter 0.3s ease'
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
                  backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                  filter: jobStatus === 'COMPLETED' ? 'blur(4px)' : 'none',
                  pointerEvents: jobStatus === 'COMPLETED' ? 'none' : 'auto',
                  transition: 'filter 0.3s ease'
                }}
                          onMouseDown={jobStatus === 'COMPLETED' ? undefined : handleTimelineMouseDown}
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
                style={{
                  filter: jobStatus === 'COMPLETED' ? 'blur(4px)' : 'none',
                  pointerEvents: jobStatus === 'COMPLETED' ? 'none' : 'auto',
                  transition: 'filter 0.3s ease'
                }}
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
                          disabled={isTtsBootstrapping || isBgmBootstrapping || isPreparing || jobStatus === 'COMPLETED'}
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
                          disabled={isExporting || !!currentJobId || jobStatus === 'COMPLETED'}
                          size="sm"
                          className="flex-1"
                        >
                          {jobStatus === 'COMPLETED' ? (
                            '내보내기'
                          ) : isExporting || currentJobId ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {isExporting ? '제작 시작 중...' : '생성 중...'}
                            </>
                          ) : (
                            '내보내기'
                          )}
                        </Button>
                      </div>
                      
                      {/* 작업 상태 표시 */}
                      {(isExporting || currentJobId || jobStatus) && (
                        <div className="mt-2 p-3 rounded-lg border" style={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
                          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        }}>
                          <div className="flex items-center gap-2 mb-2">
                            {(!jobStatus || jobStatus === 'PENDING') && isExporting && (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" style={{
                                  color: theme === 'dark' ? '#60a5fa' : '#2563eb'
                                }} />
                                <span className="text-sm font-medium" style={{
                                  color: theme === 'dark' ? '#ffffff' : '#111827'
                                }}>
                                  영상 제작을 시작합니다...
                                </span>
                              </>
                            )}
                            {jobStatus === 'PENDING' && !isExporting && (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" style={{
                                  color: theme === 'dark' ? '#a78bfa' : '#9333ea'
                                }} />
                                <span className="text-sm font-medium" style={{
                                  color: theme === 'dark' ? '#ffffff' : '#111827'
                                }}>
                                  작업 대기 중...
                                </span>
                              </>
                            )}
                            {jobStatus === 'PROCESSING' && (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" style={{
                                  color: theme === 'dark' ? '#60a5fa' : '#2563eb'
                                }} />
                                <span className="text-sm font-medium" style={{
                                  color: theme === 'dark' ? '#ffffff' : '#111827'
                                }}>
                                  영상 생성 중...
                                </span>
                              </>
                            )}
                            {jobStatus === 'COMPLETED' && (
                              <>
                                <CheckCircle2 className="w-4 h-4" style={{
                                  color: theme === 'dark' ? '#34d399' : '#10b981'
                                }} />
                                <span className="text-sm font-medium" style={{
                                  color: theme === 'dark' ? '#34d399' : '#10b981'
                                }}>
                                  생성 완료!
                                </span>
                              </>
                            )}
                            {jobStatus === 'FAILED' && (
                              <>
                                <XCircle className="w-4 h-4" style={{
                                  color: theme === 'dark' ? '#f87171' : '#ef4444'
                                }} />
                                <span className="text-sm font-medium" style={{
                                  color: theme === 'dark' ? '#f87171' : '#ef4444'
                                }}>
                                  생성 실패
                                </span>
                              </>
                            )}
                          </div>
                          {jobProgress && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs" style={{
                                color: theme === 'dark' ? '#9ca3af' : '#6b7280'
                              }}>
                                {typeof jobProgress === 'string' ? jobProgress : JSON.stringify(jobProgress)}
                              </p>
                              {jobProgressPercent > 0 && (
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{
                                  backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                                }}>
                                  <div 
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                      width: `${jobProgressPercent}%`,
                                      backgroundColor: theme === 'dark' ? '#a855f7' : '#9333ea'
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
                          {jobStatus === 'COMPLETED' && resultVideoUrl && (
                            <div className="mt-4 p-4 rounded-lg border-2" style={{
                              backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
                              borderColor: theme === 'dark' ? '#10b981' : '#10b981',
                              borderWidth: '2px'
                            }}>
                              <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 className="w-5 h-5" style={{
                                  color: theme === 'dark' ? '#34d399' : '#10b981'
                                }} />
                                <div className="text-sm font-bold" style={{
                                  color: theme === 'dark' ? '#34d399' : '#10b981'
                                }}>
                                  영상 생성 완료!
                                </div>
                              </div>
                              
                              {/* URL 입력 및 버튼 */}
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs font-semibold mb-2" style={{
                                    color: theme === 'dark' ? '#d1d5db' : '#374151'
                                  }}>
                                    영상 URL
                                  </div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={resultVideoUrl}
                                    className="w-full px-3 py-2 text-sm rounded border"
                                    style={{
                                      backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                                      borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                                      color: theme === 'dark' ? '#d1d5db' : '#111827'
                                    }}
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                  />
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(resultVideoUrl)
                                      alert('URL이 클립보드에 복사되었어요!')
                                    }}
                                    className="flex-1 px-4 py-2 text-sm rounded border transition-colors font-medium"
                                    style={{
                                      backgroundColor: theme === 'dark' ? '#374151' : '#f3f4f6',
                                      borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
                                      color: theme === 'dark' ? '#d1d5db' : '#374151'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = theme === 'dark' ? '#4b5563' : '#e5e7eb'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = theme === 'dark' ? '#374151' : '#f3f4f6'
                                    }}
                                  >
                                    복사
                                  </button>
                                  <a
                                    href={resultVideoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className="flex-1 px-4 py-2 text-sm rounded border transition-colors font-medium text-center"
                                    style={{
                                      backgroundColor: 'hsl(var(--primary))',
                                      borderColor: 'hsl(var(--primary))',
                                      color: 'hsl(var(--primary-foreground))',
                                      textDecoration: 'none',
                                      display: 'inline-block'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.opacity = '0.9'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.opacity = '1'
                                    }}
                                  >
                                    다운로드
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}
                          {(jobStatus === 'PENDING' || jobStatus === 'PROCESSING') && jobProgressPercent === 0 && (
                            <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{
                              backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                            }}>
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: jobStatus === 'PENDING' ? '30%' : '70%',
                                  backgroundColor: theme === 'dark' ? '#a78bfa' : '#9333ea',
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
              
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
              onTtsPreview={handleSceneTtsPreview}
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
            confirmedBgmTemplate={confirmedBgmTemplate}
            onBgmConfirm={handleBgmConfirm}
            setTimeline={setTimeline}
          />
        </div>
      </div>
    </motion.div>
  )
}

