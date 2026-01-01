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
import { useVideoPlayback } from '@/hooks/video/useVideoPlayback'
import { useSceneNavigation } from '@/hooks/video/useSceneNavigation'
import { playSceneLogic } from '@/hooks/video/useScenePlayback'
import { useTimelineInitializer } from '@/hooks/video/useTimelineInitializer'
import { useGridManager } from '@/hooks/video/useGridManager'
import { useCanvasSize } from '@/hooks/video/useCanvasSize'
import { useFontLoader } from '@/hooks/video/useFontLoader'
import { useBgmManager } from '@/hooks/video/useBgmManager'
import { useTimelineInteraction } from '@/hooks/video/useTimelineInteraction'
import { usePlaybackStateSync } from '@/hooks/video/usePlaybackStateSync'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getMp3DurationSec } from '@/lib/utils/audio'
import { useSceneEditHandlers } from '@/hooks/video/useSceneEditHandlers'
import { useVideoExport } from '@/hooks/video/useVideoExport'
import { ensureSceneTts as ensureSceneTtsUtil } from '@/lib/utils/tts-synthesis'
import { SceneList } from '@/components/video-editor/SceneList'
import { EffectsPanel } from '@/components/video-editor/EffectsPanel'
import { loadPixiTexture, calculateSpriteParams } from '@/utils/pixi'
import { formatTime, getSceneDuration } from '@/utils/timeline'
import { splitSceneBySentences, insertSceneDelimiters } from '@/lib/utils/scene-splitter'
import { makeMarkupFromPlainText } from '@/lib/tts/auto-pause'
import { resolveSubtitleFontFamily, SUBTITLE_DEFAULT_FONT_ID, loadSubtitleFont, isSubtitleFontId, getFontFileName } from '@/lib/subtitle-fonts'
import { transitionLabels, transitions, movements, allTransitions, MOVEMENT_EFFECTS } from '@/lib/data/transitions'
import { useUserStore } from '@/store/useUserStore'
import { useVideoCreateAuth } from '@/hooks/useVideoCreateAuth'
import { authStorage } from '@/lib/api/auth-storage'
import { bgmTemplates, getBgmTemplateUrlSync, type BgmTemplate } from '@/lib/data/templates'
import { useTtsPreview } from '@/hooks/video/useTtsPreview'
import { useFabricHandlers } from '@/hooks/video/useFabricHandlers'
import { applyShortsTemplateToScenes } from '@/lib/utils/scene-template'
import { createPlayButtonHandler } from '@/lib/utils/playback-controls'
import { showScene as showSceneUtil } from '@/lib/utils/scene-renderer'
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
  const currentSceneIndexRef = useRef(0)
  const previousSceneIndexRef = useRef<number | null>(null) // useTimelinePlayer와 공유
  const disableAutoTimeUpdateRef = useRef<boolean>(false) // 비디오 재생 중일 때 자동 시간 업데이트 비활성화
  const lastRenderedSceneIndexRef = useRef<number | null>(null) // 전환 효과 추적용 (로컬)
  const updateCurrentSceneRef = useRef<(skipAnimation?: boolean, explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, skipImage?: boolean, partIndex?: number | null, sceneIndex?: number) => void>(() => {})
  // Fabric.js refs
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElementRef = useRef<HTMLCanvasElement | null>(null)
  
  // State
  const [rightPanelTab, setRightPanelTab] = useState('animation')
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
  const [isTtsBootstrapping, setIsTtsBootstrapping] = useState(false) // 첫 씬 TTS 로딩 상태
  const isTtsBootstrappingRef = useRef(false) // 클로저에서 최신 값 참조용
  const [showReadyMessage, setShowReadyMessage] = useState(false) // "재생이 가능해요!" 메시지 표시 여부
  const [isPreparing, setIsPreparing] = useState(false) // 모든 TTS 합성 준비 중인지 여부
  // 스크립트가 변경된 씬 추적 (재생 시 강제 재생성)
  const changedScenesRef = useRef<Set<number>>(new Set())
  // 선택된 구간 추적 (씬 인덱스, 구간 인덱스)
  const [selectedPart, setSelectedPartState] = useState<{ sceneIndex: number; partIndex: number } | null>(null)
  const selectedPartRef = useRef<{ sceneIndex: number; partIndex: number } | null>(null)
  
  // setSelectedPart를 래핑하여 selectedPartRef도 함께 업데이트
  const setSelectedPart = useCallback((part: { sceneIndex: number; partIndex: number } | null) => {
    selectedPartRef.current = part
    console.log(`[setSelectedPart] selectedPartRef 업데이트 | sceneIndex: ${part?.sceneIndex}, partIndex: ${part?.partIndex}`)
    setSelectedPartState(part)
  }, [])

  // 토큰 검증
  const { isValidatingToken } = useVideoCreateAuth()

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
  useTimelineInitializer({
    scenes,
    selectedImages,
    subtitleFont,
    subtitleColor,
    subtitlePosition,
    timeline,
    setTimeline,
  })

  // Canvas 크기 관리
  const { canvasSize, setCanvasSize, recalculateCanvasSize } = useCanvasSize({
    appRef,
    pixiContainerRef,
    stageDimensions,
  })

  // 격자 관리
  const { gridOverlaySize, canvasDisplaySize } = useGridManager({
    showGrid,
    pixiReady,
    appRef,
    stageDimensions,
    canvasSize,
    pixiContainerRef,
    timelineScenesLength: timeline?.scenes.length,
  })

  // 진행 중인 애니메이션 추적 (usePixiFabric보다 먼저 선언)
  const activeAnimationsRef = useRef<Map<number, gsap.core.Timeline>>(new Map())
  // 수동 씬 선택 중 플래그 (handleScenePartSelect에서 사용)
  const isManualSceneSelectRef = useRef(false)

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
  const { applyEnterEffect } = usePixiEffects({
    appRef,
    containerRef,
    activeAnimationsRef,
    stageDimensions,
    timeline,
    playbackSpeed: timeline?.playbackSpeed ?? 1.0,
    onAnimationComplete: handleAnimationComplete,
    isPlayingRef, // 재생 중인지 확인용
  })

  // 씬 관리 hook (setCurrentSceneIndex는 useTimelinePlayer 이후에 설정됨)
  // 임시로 undefined로 설정하고, 나중에 업데이트
  const sceneManagerResult1 = useSceneManager({
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
    isManualSceneSelectRef,
    timeline,
    stageDimensions,
    useFabricEditing,
    loadPixiTextureWithCache,
    applyEnterEffect,
    onLoadComplete: handleLoadComplete,
    setTimeline,
    setCurrentSceneIndex: undefined as any, // 나중에 설정됨
  })
  
  let { updateCurrentScene, syncFabricWithScene, loadAllScenes } = sceneManagerResult1
  
  // updateCurrentScene을 ref로 감싸서 안정적인 참조 유지
  updateCurrentSceneRef.current = updateCurrentScene

  // selectScene 함수를 나중에 연결하기 위한 ref
  const selectSceneRef = useRef<((index: number, skipStopPlaying?: boolean, onTransitionComplete?: () => void) => void) | null>(null)

  // Fabric 변경사항을 타임라인에 반영 (hook 사용)
  useFabricHandlers({
    fabricReady,
    fabricCanvasRef,
    timeline,
    setTimeline,
    currentSceneIndexRef,
    fabricScaleRatioRef,
    isSavingTransformRef,
    savedSceneIndexRef,
    isManualSceneSelectRef,
  })


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
    
    // 수동 씬 선택 중일 때는 loadAllScenes를 호출하지 않음 (handleScenePartSelect가 처리 중)
    if (isManualSceneSelectRef.current) {
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
          // 렌더링은 PixiJS ticker가 처리
          
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
    if (!timeline) {
      return 0
    }
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
    showSceneUtil(index, appRef, containerRef, spritesRef, textsRef)
  }, [appRef, containerRef, spritesRef, textsRef])


  // useTimelinePlayer (재생 루프 관리) - 먼저 선언하여 currentSceneIndex 등을 얻음
  const {
    isPlaying: timelineIsPlaying,
    setIsPlaying: setTimelineIsPlaying,
    isPreviewingTransition: timelineIsPreviewingTransition,
    setIsPreviewingTransition: setTimelineIsPreviewingTransition,
    currentSceneIndex: timelineCurrentSceneIndex,
    setCurrentSceneIndex: setTimelineCurrentSceneIndex,
    currentTime,
    setCurrentTime,
    progressRatio,
    playbackSpeed,
    setPlaybackSpeed,
    totalDuration,
    selectScene: timelineSelectScene,
    togglePlay,
    getStageDimensions,
  } = useTimelinePlayer({
    timeline,
    updateCurrentScene,
    loadAllScenes,
    appRef,
    containerRef,
    pixiReady,
    previousSceneIndexRef,
    onSceneChange: (index: number) => {
      // 임시로 빈 함수, 나중에 sceneNavigation.selectScene으로 업데이트
      if (selectSceneRef.current) {
        selectSceneRef.current(index, true)
      }
    },
    disableAutoTimeUpdateRef,
  })

  // 통합된 상태 사용
  const isPlaying = timelineIsPlaying
  const setIsPlaying = setTimelineIsPlaying
  const currentSceneIndex = timelineCurrentSceneIndex
  const setCurrentSceneIndex = setTimelineCurrentSceneIndex

  // BGM 관리
  const {
    confirmedBgmTemplate,
    setConfirmedBgmTemplate,
    isBgmBootstrapping,
    setIsBgmBootstrapping,
    isBgmBootstrappingRef,
    bgmAudioRef,
    bgmStartTimeRef,
    stopBgmAudio,
    startBgmAudio,
    handleBgmConfirm,
  } = useBgmManager({
    bgmTemplate,
    playbackSpeed,
    isPlaying,
  })

  // 타임라인 인터랙션
  const { isDraggingTimeline, handleTimelineClick, handleTimelineMouseDown } = useTimelineInteraction({
    timeline,
    timelineBarRef,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setCurrentSceneIndex,
    updateCurrentScene,
    lastRenderedSceneIndexRef,
    previousSceneIndexRef,
  })
  
  // useSceneManager를 setCurrentSceneIndex와 함께 다시 생성
  const sceneManagerResult2 = useSceneManager({
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
    isManualSceneSelectRef,
    timeline,
    stageDimensions,
    useFabricEditing,
    loadPixiTextureWithCache,
    applyEnterEffect,
    onLoadComplete: handleLoadComplete,
    setTimeline,
    setCurrentSceneIndex,
  })
  
  const { 
    updateCurrentScene: updateCurrentScene2,
    renderSceneContent: renderSceneContentFromManager,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
  } = sceneManagerResult2
  
  // updateCurrentScene2를 ref로 감싸서 안정적인 참조 유지
  updateCurrentSceneRef.current = updateCurrentScene2
  
  // renderSceneContent를 setCurrentSceneIndex와 함께 래핑
  const renderSceneContent = useCallback((
    sceneIndex: number,
    partIndex?: number | null,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      updateTimeline?: boolean
    }
  ) => {
    if (renderSceneContentFromManager) {
      // renderSceneContent를 직접 사용
      renderSceneContentFromManager(sceneIndex, partIndex, options)
      return
    }
    
    // fallback: renderSceneContent가 없는 경우 직접 구현
    {
      
      // 같은 씬 내 구간 전환인지 확인
      const isSameSceneTransition = currentSceneIndexRef.current === sceneIndex
      
      // timeline 업데이트 (필요한 경우)
      if (options?.updateTimeline && partIndex !== undefined && partIndex !== null && timeline) {
        const scene = timeline.scenes[sceneIndex]
        if (scene) {
          const originalText = scene.text?.content || ''
          const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
          const partText = scriptParts[partIndex]?.trim()
          
          if (partText && setTimeline) {
            const updatedTimeline = {
              ...timeline,
              scenes: timeline.scenes.map((s, i) =>
                i === sceneIndex
                  ? {
                      ...s,
                      text: {
                        ...s.text,
                        content: partText,
                      },
                    }
                  : s
              ),
            }
            setTimeline(updatedTimeline)
          }
        }
      }
      
      // 텍스트 객체 업데이트
      if (partIndex !== undefined && partIndex !== null) {
        const scene = timeline?.scenes[sceneIndex]
        if (scene) {
          const originalText = scene.text?.content || ''
          const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
          const partText = scriptParts[partIndex]?.trim()
          
          if (partText) {
            let targetTextObj: PIXI.Text | null = textsRef.current.get(sceneIndex) || null
            
            // 같은 그룹 내 첫 번째 씬의 텍스트 사용 (필요한 경우)
            if (!targetTextObj || (!targetTextObj.visible && targetTextObj.alpha === 0)) {
              const sceneId = scene.sceneId
              if (sceneId !== undefined && timeline) {
                const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
                if (firstSceneIndexInGroup >= 0) {
                  targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
                }
              }
            }
            
            if (targetTextObj) {
              targetTextObj.text = partText
              targetTextObj.visible = true
              targetTextObj.alpha = 1
            }
            
            // 스프라이트 표시
            const currentSprite = spritesRef.current.get(sceneIndex)
            if (currentSprite) {
              currentSprite.visible = true
              currentSprite.alpha = 1
            }
            
            // 같은 씬 내 구간 전환인 경우: 자막만 업데이트 (전환 효과 없음)
            if (isSameSceneTransition) {
              // 렌더링은 PixiJS ticker가 처리
              if (options?.onComplete) {
                options.onComplete()
              }
              return
            }
          }
        }
      }
      
      // 다른 씬으로 이동하는 경우: 씬 전환
      if (!isSameSceneTransition && setCurrentSceneIndex) {
        currentSceneIndexRef.current = sceneIndex
        setCurrentSceneIndex(sceneIndex)
      }
      
      // updateCurrentScene 호출하여 씬 전환
      updateCurrentScene(
        options?.skipAnimation ?? false,
        options?.previousIndex !== undefined ? options.previousIndex : currentSceneIndexRef.current,
        options?.forceTransition,
        () => {
          // 전환 완료 후 구간 텍스트가 올바르게 표시되었는지 확인
          if (partIndex !== undefined && partIndex !== null && timeline) {
            const scene = timeline.scenes[sceneIndex]
            if (scene) {
              const originalText = scene.text?.content || ''
              const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
              const partText = scriptParts[partIndex]?.trim()
              
              if (partText) {
                const finalText = textsRef.current.get(sceneIndex)
                if (finalText && finalText.text !== partText) {
                  finalText.text = partText
                  // 렌더링은 PixiJS ticker가 처리
                }
              }
            }
          }
          if (options?.onComplete) {
            options.onComplete()
          }
        },
        false, // isPlaying
        undefined, // skipImage
        partIndex, // partIndex 전달
        sceneIndex // sceneIndex 전달
      )
    }
  }, [timeline, setTimeline, setCurrentSceneIndex, textsRef, spritesRef, currentSceneIndexRef, updateCurrentScene, renderSceneContentFromManager])
  const isPreviewingTransition = timelineIsPreviewingTransition
  const setIsPreviewingTransition = setTimelineIsPreviewingTransition




  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])


  // 선택한 폰트가 Pixi(Canvas)에서 fallback으로 고정되지 않도록 선로딩 후 강제 리로드
  useFontLoader({
    pixiReady,
    timeline,
    currentSceneIndex,
    onFontLoaded: async () => {
      if (!isSavingTransformRef.current) {
        await loadAllScenes()
      }
    },
  })

  // 재생/일시정지 (씬 선택 로직을 그대로 사용)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const bgmStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
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
  const bgmAudioUrlRef = useRef<string | null>(null)
  const previewingSceneIndexRef = useRef<number | null>(null)
  const previewingPartIndexRef = useRef<number | null>(null)
  const isPreviewingRef = useRef<boolean>(false)

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
    previewingSceneIndexRef.current = null
    previewingPartIndexRef.current = null
    isPreviewingRef.current = false
  }, [])

  const resetTtsSession = useCallback(() => {
    stopTtsAudio()
    stopScenePreviewAudio()
    ttsAbortRef.current?.abort()
    ttsAbortRef.current = null
    ttsInFlightRef.current.clear()
    ttsCacheRef.current.clear()
  }, [stopTtsAudio, stopScenePreviewAudio])


  // voice/speakingRate/pausePreset이 바뀌면 합성 결과가 바뀌므로 캐시를 초기화
  // 목소리 변경 시 모든 캐시와 저장소 URL이 무효화되어 재업로드됨
  useEffect(() => {
    if (voiceTemplate) {
      resetTtsSession()
    }
  }, [voiceTemplate, resetTtsSession])

  // TTS 유틸리티 함수들 (lib/utils/tts.ts에서 import)
  // buildSceneMarkup과 makeTtsKey는 유틸리티 함수로 직접 사용
  // 다른 hook에 전달하기 위한 래퍼 함수
  const buildSceneMarkupWrapper = useCallback(
    (sceneIndex: number) => buildSceneMarkup(timeline, sceneIndex),
    [timeline]
  )

  // Timeline의 duration을 TTS 캐시의 실제 duration으로 업데이트 (제한 없이 실제 길이 사용)
  useEffect(() => {
    if (!timeline || !voiceTemplate) return
    
    const updatedScenes = timeline.scenes.map((scene, index) => {
      const markups = buildSceneMarkup(timeline, index)
      let ttsDuration = 0
      let hasCachedTts = false
      
      for (let partIndex = 0; partIndex < markups.length; partIndex++) {
        const markup = markups[partIndex]
        const key = makeTtsKey(voiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached && cached.durationSec > 0) {
          ttsDuration += cached.durationSec
          hasCachedTts = true
        }
      }
      
      // TTS 캐시에 실제 duration이 있으면 사용 (제한 없이)
      if (hasCachedTts && ttsDuration > 0 && Math.abs(ttsDuration - scene.duration) > 0.05) {
        return { ...scene, duration: ttsDuration }
      }
      return scene
    })
    
    const hasDurationUpdate = updatedScenes.some((scene, index) => 
      scene.duration !== timeline.scenes[index]?.duration
    )
    
    if (hasDurationUpdate) {
      setTimeline({
        ...timeline,
        scenes: updatedScenes,
      })
    }
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, setTimeline, ttsCacheRef])

  // getMp3DurationSec는 lib/utils/audio.ts에서 import하여 사용

  const setSceneDurationFromAudio = useCallback(
    (sceneIndex: number, durationSec: number) => {
      if (!timeline) {
        return
      }
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return
      }
      const prev = timeline.scenes[sceneIndex]?.duration ?? 0
      if (Math.abs(prev - durationSec) <= 0.05) {
        return
      }

      // 실제 duration 사용 (최소 0.5초만 유지, 최대 제한 없음)
      const clamped = Math.max(0.5, durationSec)
      
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

  // ensureSceneTts를 유틸리티 함수로 래핑
  const ensureSceneTts = useCallback(
    async (      sceneIndex: number, signal?: AbortSignal, forceRegenerate: boolean = false): Promise<{
      sceneIndex: number
      parts: Array<{
        blob: Blob
        durationSec: number
        url: string | null
        partIndex: number
        markup: string
      }>
    }> => {
      if (!timeline) {
        console.error('[step4/page] ensureSceneTts: timeline이 없습니다.')
        throw new Error('timeline이 없습니다.')
      }
      if (!voiceTemplate) {
        console.error('[step4/page] ensureSceneTts: voiceTemplate이 없습니다.')
        throw new Error('목소리를 먼저 선택해주세요.')
      }

      return ensureSceneTtsUtil({
        timeline,
        sceneIndex,
        voiceTemplate,
        ttsCacheRef,
        ttsInFlightRef,
        changedScenesRef,
        setSceneDurationFromAudio,
        signal,
        forceRegenerate,
      })
    },
    [
      timeline,
      voiceTemplate,
      setSceneDurationFromAudio,
      ttsCacheRef,
      ttsInFlightRef,
      changedScenesRef,
    ]
  )

  const prefetchWindow = useCallback(
    (baseIndex: number) => {
      if (!timeline) {
        return
      }
      if (!voiceTemplate) {
        return
      }

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

  // TTS 미리보기 hook 사용
  const { handleSceneTtsPreview } = useTtsPreview({
    timeline,
    voiceTemplate,
    ensureSceneTts,
    stopScenePreviewAudio,
    setTimeline,
    updateCurrentScene,
    textsRef,
    renderSceneContent,
    changedScenesRef,
  })

  // useVideoPlayback과 useSceneNavigation을 위한 selectScene 함수
  // useSceneNavigation이 먼저 선언되어야 하므로, ref를 통해 연결
  // tempSelectScene은 useVideoPlayback에서 사용되며, 나중에 sceneNavigation.selectScene으로 대체됨
  const tempSelectScene = useCallback((index: number, skipStopPlaying: boolean = false, onTransitionComplete?: () => void) => {
    console.log(`[scene-navigation] selectScene 호출 (temp) | index: ${index}, skipStopPlaying: ${skipStopPlaying}, selectSceneRef.current: ${!!selectSceneRef.current}`)
    if (selectSceneRef.current) {
      selectSceneRef.current(index, skipStopPlaying, onTransitionComplete)
    } else {
      console.warn(`[scene-navigation] selectSceneRef.current가 null입니다! sceneNavigation.selectScene이 아직 설정되지 않았을 수 있습니다.`)
    }
  }, [])

  // 비디오 재생 훅 (TTS/BGM 재생 로직)
  const videoPlayback = useVideoPlayback({
    timeline,
    voiceTemplate,
    bgmTemplate: confirmedBgmTemplate,
    playbackSpeed: timeline?.playbackSpeed ?? 1.0,
    currentSceneIndex,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    updateCurrentScene,
    setTimeline,
    buildSceneMarkup: buildSceneMarkupWrapper,
    makeTtsKey,
    getMp3DurationSec,
    textsRef,
    appRef,
    selectScene: tempSelectScene, // 임시 함수 사용, 나중에 업데이트
    setIsPreparing,
    setIsTtsBootstrapping,
    setIsBgmBootstrapping,
    isTtsBootstrappingRef,
    isBgmBootstrappingRef,
    changedScenesRef,
    ensureSceneTts,
    pixiReady,
    spritesRef,
    loadAllScenes,
    setShowReadyMessage,
    setCurrentTime,
    renderSceneContent,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
    setIsPreviewingTransition,
    setTimelineIsPlaying,
  })

  // 씬 네비게이션 훅 (씬 선택/전환 로직)
  const sceneNavigation = useSceneNavigation({
    timeline,
    scenes,
    currentSceneIndex,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    previousSceneIndexRef,
    lastRenderedSceneIndexRef,
    isManualSceneSelectRef,
    updateCurrentScene,
    setTimeline,
    isPlaying: videoPlayback.isPlaying,
    setIsPlaying: videoPlayback.setIsPlaying,
    isPreviewingTransition,
    setIsPreviewingTransition,
    setCurrentTime,
    resetTtsSession: videoPlayback.resetTtsSession,
    voiceTemplate,
    playbackSpeed: timeline?.playbackSpeed ?? 1.0,
    buildSceneMarkup: buildSceneMarkupWrapper,
    makeTtsKey,
    ttsCacheRef: videoPlayback.ttsCacheRef,
    stopTtsAudio: videoPlayback.stopTtsAudio,
    ttsAudioRef: videoPlayback.ttsAudioRef,
    ttsAudioUrlRef: videoPlayback.ttsAudioUrlRef,
    playTimeoutRef: videoPlayback.playTimeoutRef,
    isPlayingRef,
    textsRef,
    spritesRef,
    appRef,
    activeAnimationsRef,
    loadAllScenes,
    setSelectedPart,
    renderSceneContent,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
  })

  // selectSceneRef 업데이트 및 useTimelinePlayer의 onSceneChange 업데이트
  useEffect(() => {
    selectSceneRef.current = sceneNavigation.selectScene
  }, [sceneNavigation.selectScene])
  
  // isPlaying 상태와 ref 동기화
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])
  
  // 재생 상태 동기화
  usePlaybackStateSync({
    videoPlaybackIsPlaying: videoPlayback.isPlaying,
    timelineIsPlaying,
    setTimelineIsPlaying,
    videoPlaybackSetIsPlaying: videoPlayback.setIsPlaying,
  })
  
  // 비디오 재생 중일 때 useTimelinePlayer의 자동 시간 업데이트 비활성화
  useEffect(() => {
    disableAutoTimeUpdateRef.current = videoPlayback.isPlaying
  }, [videoPlayback.isPlaying])
  
  // 전체 재생을 위한 상태
  const isPlayingAllRef = useRef(false)
  const currentPlayingSceneIndexRef = useRef<number | null>(null)
  const playbackAbortControllerRef = useRef<AbortController | null>(null)

  // 전체 재생 함수
  const playAllScenes = useCallback(async () => {
    if (!timeline || !voiceTemplate) {
      return
    }

    // 모든 씬의 TTS가 준비되었는지 확인
    const scenesToSynthesize: number[] = []
    for (let i = 0; i < timeline.scenes.length; i++) {
      const markups = buildSceneMarkupWrapper(i)
      const cachedCount = markups.filter(markup => {
        const key = makeTtsKey(voiceTemplate, markup)
        const cached = videoPlayback.ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      }).length
      
      if (cachedCount < markups.length) {
        scenesToSynthesize.push(i)
      }
    }

    // TTS가 준비되지 않은 씬이 있으면 합성
    if (scenesToSynthesize.length > 0 && ensureSceneTts) {
      setIsPreparing(true)
      if (setIsTtsBootstrapping) {
        setIsTtsBootstrapping(true)
      }
      
      try {
        const ttsResults = await Promise.all(
          scenesToSynthesize.map(sceneIndex =>
            ensureSceneTts(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex) || false)
          )
        )
        
        // ensureSceneTts 결과를 명시적으로 캐시에 저장 (타이밍 이슈 방지)
        for (const ttsResult of ttsResults) {
          const { sceneIndex, parts } = ttsResult
          if (!parts || parts.length === 0) {
            console.warn(`[playAllScenes] 씬 ${sceneIndex} parts가 비어있음`)
            continue
          }
          
          const markups = buildSceneMarkupWrapper(sceneIndex)
          for (let partIndex = 0; partIndex < markups.length; partIndex++) {
            const part = parts[partIndex]
            if (!part) {
              console.warn(`[playAllScenes] 씬 ${sceneIndex} 구간 ${partIndex + 1} part가 null`)
              continue
            }
            
            if (!part.blob && !part.url) {
              console.warn(`[playAllScenes] 씬 ${sceneIndex} 구간 ${partIndex + 1} blob과 url이 모두 없음`)
              continue
            }
            
            if (!part.durationSec || part.durationSec <= 0) {
              console.warn(`[playAllScenes] 씬 ${sceneIndex} 구간 ${partIndex + 1} durationSec가 없거나 0 이하`)
              continue
            }
            
            // 캐시에 명시적으로 저장 (타이밍 이슈 방지)
            const markup = markups[partIndex]
            const key = makeTtsKey(voiceTemplate, markup)
            const scene = timeline.scenes[sceneIndex]
            const cacheEntry = {
              blob: part.blob,
              durationSec: part.durationSec,
              markup: part.markup || markup,
              url: part.url || null,
              sceneId: scene?.sceneId,
              sceneIndex,
            }
            videoPlayback.ttsCacheRef.current.set(key, cacheEntry)
            console.log(`[playAllScenes] 씬 ${sceneIndex} 구간 ${partIndex + 1} 캐시에 명시적으로 저장 완료 (duration: ${part.durationSec}초)`)
          }
        }
      } catch (error) {
        console.error('[step4/page] TTS 합성 실패:', error)
        setIsPreparing(false)
        if (setIsTtsBootstrapping) {
          setIsTtsBootstrapping(false)
        }
        return
      }
      
      setIsPreparing(false)
      if (setIsTtsBootstrapping) {
        setIsTtsBootstrapping(false)
      }
    }

    // BGM 로드
    if (bgmTemplate) {
      const speed = timeline?.playbackSpeed ?? 1.0
      await startBgmAudio(bgmTemplate, speed, false)
    }

    // 재생 시작
    playbackAbortControllerRef.current = new AbortController()
    isPlayingAllRef.current = true
    setIsPlaying(true)
    setTimelineIsPlaying(true)

    // 현재 씬부터 마지막 씬까지 순차적으로 재생
    const playSceneSequence = async (startIndex: number) => {
      if (!isPlayingAllRef.current || !timeline || playbackAbortControllerRef.current?.signal.aborted) {
        return
      }

      for (let i = startIndex; i < timeline.scenes.length; i++) {
        if (!isPlayingAllRef.current || playbackAbortControllerRef.current?.signal.aborted) {
          break
        }

        currentPlayingSceneIndexRef.current = i

        // playSceneLogic 직접 호출
        await playSceneLogic({
          timeline,
          voiceTemplate,
          playbackSpeed: timeline?.playbackSpeed ?? 1.0,
          sceneIndex: i,
          setCurrentSceneIndex,
          currentSceneIndexRef,
          lastRenderedSceneIndexRef,
          textsRef,
          spritesRef,
          ttsCacheRef: videoPlayback.ttsCacheRef,
          ttsAudioRef: videoPlayback.ttsAudioRef,
          ttsAudioUrlRef: videoPlayback.ttsAudioUrlRef,
          renderSceneImage,
          renderSubtitlePart,
          prepareImageAndSubtitle,
          renderSceneContent,
          setCurrentTime,
          ensureSceneTts,
          changedScenesRef,
          onNextScene: () => {
            // 다음 씬으로 자동 전환
            if (i + 1 < timeline.scenes.length && isPlayingAllRef.current && !playbackAbortControllerRef.current?.signal.aborted) {
              void playSceneSequence(i + 1)
            } else {
              // 모든 씬 재생 완료
              isPlayingAllRef.current = false
              setIsPlaying(false)
              setTimelineIsPlaying(false)
              currentPlayingSceneIndexRef.current = null
              playbackAbortControllerRef.current = null
              stopBgmAudio()
            }
          },
          onComplete: () => {
            // 씬 재생 완료
            if (i + 1 < timeline.scenes.length && isPlayingAllRef.current && !playbackAbortControllerRef.current?.signal.aborted) {
              void playSceneSequence(i + 1)
            } else {
              // 모든 씬 재생 완료
              isPlayingAllRef.current = false
              setIsPlaying(false)
              setTimelineIsPlaying(false)
              currentPlayingSceneIndexRef.current = null
              playbackAbortControllerRef.current = null
              stopBgmAudio()
            }
          },
          abortSignal: playbackAbortControllerRef.current?.signal,
          isPlayingRef: isPlayingRef,
        })
      }
    }

    // 현재 씬부터 재생 시작
    void playSceneSequence(currentSceneIndex)
  }, [
    timeline,
    voiceTemplate,
    buildSceneMarkupWrapper,
    makeTtsKey,
    ensureSceneTts,
    changedScenesRef,
    setIsPreparing,
    setIsTtsBootstrapping,
    bgmTemplate,
    startBgmAudio,
    setIsPlaying,
    setTimelineIsPlaying,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    textsRef,
    spritesRef,
    videoPlayback,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
    setCurrentTime,
    stopBgmAudio,
    isPlayingRef,
  ])

  // 재생 중지 함수
  const stopAllScenes = useCallback(() => {
    if (playbackAbortControllerRef.current) {
      playbackAbortControllerRef.current.abort()
      playbackAbortControllerRef.current = null
    }
    isPlayingAllRef.current = false
    setIsPlaying(false)
    setTimelineIsPlaying(false)
    currentPlayingSceneIndexRef.current = null
    stopBgmAudio()
    videoPlayback.stopTtsAudio()
  }, [setIsPlaying, setTimelineIsPlaying, stopBgmAudio, videoPlayback])

  // 재생 시작 로직을 별도 함수로 분리
  
  // 재생 중지 시 timeout 정리
  useEffect(() => {
    if (!isPlaying && playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current)
      playTimeoutRef.current = null
    }
  }, [isPlaying])

  // 특정 씬의 TTS 캐시 무효화 (저장소 URL도 제거하여 재업로드 유도)
  const invalidateSceneTtsCache = useCallback((sceneIndex: number) => {
    if (!timeline) {
      return
    }
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) {
      return
    }

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
        }
      }
    })
    
    // sceneId나 sceneIndex로 찾지 못한 경우, 
    // 해당 씬의 현재 스크립트로 생성된 모든 키를 찾아서 무효화
    // (스크립트가 변경되었을 때 이전 캐시를 찾기 위함)
    if (keysToInvalidate.length === 0) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      markups.forEach((markup) => {
        const key = makeTtsKey(voiceTemplate || '', markup)
        if (ttsCacheRef.current.has(key)) {
          keysToInvalidate.push(key)
        }
      })
    }
    
    // 찾은 키들의 캐시 삭제 (URL 포함하여 완전히 무효화)
    keysToInvalidate.forEach(key => {
      const cached = ttsCacheRef.current.get(key)
      if (cached) {
        ttsCacheRef.current.delete(key)
      }
    })
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
    renderSceneContent,
  })

  // 씬 편집 핸들러들
  const {
    handleSceneScriptChange,
    handleSceneSplit,
    handleSceneDelete,
    handleSceneDuplicate,
    handleSceneReorder: handleSceneReorderFromHook,
  } = useSceneEditHandlers({
    scenes,
    timeline,
    setScenes,
    setTimeline,
    currentSceneIndex,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    voiceTemplate,
    invalidateSceneTtsCache,
    changedScenesRef,
    originalHandleSceneScriptChange,
    ttsCacheRef,
    selectedImages,
    setSelectedImages,
  })

  // 전환 효과 변경 핸들러 래핑: currentSceneIndexRef를 먼저 설정
  const handleSceneTransitionChange = useCallback((index: number, value: string) => {
    // currentSceneIndexRef를 먼저 설정하여 updateCurrentScene이 올바른 씬 인덱스를 사용하도록 함
    currentSceneIndexRef.current = index
    originalHandleSceneTransitionChange(index, value)
  }, [originalHandleSceneTransitionChange])

  // 비디오 내보내기 hook
  const { isExporting, handleExport } = useVideoExport({
    timeline,
    scenes,
    videoTitle,
    videoDescription,
    voiceTemplate,
    bgmTemplate,
    subtitleFont,
    selectedProducts,
    ttsCacheRef: videoPlayback.ttsCacheRef,
    ensureSceneTts,
  })

  // 씬 순서 변경 핸들러는 useSceneEditHandlers에서 제공
  const handleSceneReorder = handleSceneReorderFromHook

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
    // 재생 중일 때는 다른 상태 변경에 영향받지 않도록 먼저 체크
    if (isPlaying || isPreviewingTransition) {
      pixiCanvas.style.opacity = '1'
      pixiCanvas.style.pointerEvents = 'none'
      pixiCanvas.style.zIndex = '10'
      return // 재생 중이면 여기서 종료하여 다른 조건에 영향받지 않도록 함
    }
    
    // 재생 중이 아닐 때만 편집 모드에 따라 canvas 표시/숨김 처리
    if (useFabricEditing && fabricReady) {
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
        // 렌더링은 PixiJS ticker가 처리
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
      // 렌더링은 PixiJS ticker가 처리
    }
  }, [editMode, selectedElementIndex, selectedElementType, timeline, drawEditHandles, setupSpriteDrag, handleResize, saveImageTransform, drawTextEditHandles, setupTextDrag, handleTextResize, saveTextTransform, editHandlesRef, textEditHandlesRef])





  // handleExport는 useVideoExport hook에서 제공됨

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
                          onClick={() => {
                            if (isPlaying) {
                              stopAllScenes()
                            } else {
                              void playAllScenes()
                            }
                          }}
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
                    if (!timeline || scenes.length === 0) {
                      return
                    }
                    
                    // 쇼츠용 추천 템플릿 적용
                    const nextTimeline = applyShortsTemplateToScenes(timeline, stageDimensions)
                    setTimeline(nextTimeline)
                    
                    // 모든 씬을 다시 로드하여 Transform 적용
                    setTimeout(() => {
                      loadAllScenes()
                      // Canvas 크기 재계산
                      recalculateCanvasSize()
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
              selectedPart={selectedPart}
              theme={theme}
              transitionLabels={transitionLabels}
              onSelect={sceneNavigation.selectScene}
              onScriptChange={handleSceneScriptChange}
              onImageFitChange={handleSceneImageFitChange}
              onReorder={handleSceneReorder}
              onSplitScene={handleSceneSplit}
              onDeleteScene={handleSceneDelete}
              onDuplicateScene={handleSceneDuplicate}
              onTtsPreview={handleSceneTtsPreview}
              onSelectPart={sceneNavigation.selectPart}
              onPlayScene={async (sceneIndex: number) => {
                if (!timeline || !voiceTemplate) {
                  return
                }

                // 해당 씬의 TTS가 준비되었는지 확인
                const markups = buildSceneMarkupWrapper(sceneIndex)
                const scenesToSynthesize: number[] = []
                const cachedCount = markups.filter(markup => {
                  const key = makeTtsKey(voiceTemplate, markup)
                  const cached = videoPlayback.ttsCacheRef.current.get(key)
                  return cached && (cached.blob || cached.url)
                }).length
                
                if (cachedCount < markups.length) {
                  scenesToSynthesize.push(sceneIndex)
                }

                // TTS가 준비되지 않았으면 합성
                if (scenesToSynthesize.length > 0 && ensureSceneTts) {
                  setIsPreparing(true)
                  if (setIsTtsBootstrapping) {
                    setIsTtsBootstrapping(true)
                  }
                  
                  try {
                    await ensureSceneTts(sceneIndex, undefined, changedScenesRef.current.has(sceneIndex) || false)
                  } catch (error) {
                    console.error('[step4/page] TTS 합성 실패:', error)
                    setIsPreparing(false)
                    if (setIsTtsBootstrapping) {
                      setIsTtsBootstrapping(false)
                    }
                    return
                  }
                  
                  setIsPreparing(false)
                  if (setIsTtsBootstrapping) {
                    setIsTtsBootstrapping(false)
                  }
                }

                // 씬 재생
                await playSceneLogic({
                  timeline,
                  voiceTemplate,
                  playbackSpeed: timeline?.playbackSpeed ?? 1.0,
                  sceneIndex,
                  setCurrentSceneIndex,
                  currentSceneIndexRef,
                  lastRenderedSceneIndexRef,
                  textsRef,
                  spritesRef,
                  ttsCacheRef: videoPlayback.ttsCacheRef,
                  ttsAudioRef: videoPlayback.ttsAudioRef,
                  ttsAudioUrlRef: videoPlayback.ttsAudioUrlRef,
                  renderSceneImage,
                  renderSubtitlePart,
                  prepareImageAndSubtitle,
                  renderSceneContent,
                  setCurrentTime,
                  ensureSceneTts,
                  changedScenesRef,
                  onComplete: () => {
                  },
                })
              }}
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

