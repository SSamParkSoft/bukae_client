'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useVideoCreateStore, TimelineData, TimelineScene, SceneScript } from '@/store/useVideoCreateStore'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useSceneHandlers } from '@/hooks/video/useSceneHandlers'
import { useTimelinePlayer } from '@/hooks/video/useTimelinePlayer'
import { usePixiFabric } from '@/hooks/video/usePixiFabric'
import { usePixiEffects } from '@/hooks/video/usePixiEffects'
import { useSceneManager } from '@/hooks/video/useSceneManager'
import { usePixiEditor } from '@/hooks/video/usePixiEditor'
import { useSceneNavigation } from '@/hooks/video/useSceneNavigation'
import { useFullPlayback } from '@/hooks/video/useFullPlayback'
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
import { loadPixiTexture } from '@/utils/pixi'
import { showScene as showSceneUtil } from '@/lib/utils/scene-renderer'
import { useTtsPreview } from '@/hooks/video/useTtsPreview'
import { useFabricHandlers } from '@/hooks/video/useFabricHandlers'
import { applyShortsTemplateToScenes } from '@/lib/utils/scene-template'
import { transitionLabels, transitions, movements, allTransitions } from '@/lib/data/transitions'
import { useVideoCreateAuth } from '@/hooks/useVideoCreateAuth'
import { calculateTotalDuration } from '@/utils/timeline'
import { getScenePlaceholder } from '@/lib/utils/placeholder-image'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import * as fabric from 'fabric'

export function useStep3Container() {
  const router = useRouter()
  
  // Zustand selector 최적화: 필요한 값만 선택
  const scenes = useVideoCreateStore((state) => state.scenes)
  const selectedImages = useVideoCreateStore((state) => state.selectedImages)
  const timeline = useVideoCreateStore((state) => state.timeline)
  const setTimeline = useVideoCreateStore((state) => state.setTimeline)
  const setScenes = useVideoCreateStore((state) => state.setScenes)
  const setSelectedImages = useVideoCreateStore((state) => state.setSelectedImages)
  const subtitlePosition = useVideoCreateStore((state) => state.subtitlePosition)
  const subtitleFont = useVideoCreateStore((state) => state.subtitleFont)
  const subtitleColor = useVideoCreateStore((state) => state.subtitleColor)
  const bgmTemplate = useVideoCreateStore((state) => state.bgmTemplate)
  const _transitionTemplate = useVideoCreateStore((state) => state.transitionTemplate)
  const voiceTemplate = useVideoCreateStore((state) => state.voiceTemplate)
  const _setSubtitlePosition = useVideoCreateStore((state) => state.setSubtitlePosition)
  const _setSubtitleFont = useVideoCreateStore((state) => state.setSubtitleFont)
  const _setSubtitleColor = useVideoCreateStore((state) => state.setSubtitleColor)
  const setBgmTemplate = useVideoCreateStore((state) => state.setBgmTemplate)
  const _setTransitionTemplate = useVideoCreateStore((state) => state.setTransitionTemplate)
  const _setVoiceTemplate = useVideoCreateStore((state) => state.setVoiceTemplate)
  const selectedProducts = useVideoCreateStore((state) => state.selectedProducts)
  const videoTitle = useVideoCreateStore((state) => state.videoTitle)
  const videoDescription = useVideoCreateStore((state) => state.videoDescription)
  
  const theme = useThemeStore((state) => state.theme)
  const sceneStructureStore = useSceneStructureStore()
  
  // PixiJS refs
  const pixiContainerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const containerRef = useRef<PIXI.Container | null>(null)
  const texturesRef = useRef<Map<string, PIXI.Texture>>(new Map())
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  const _handlesRef = useRef<PIXI.Graphics | null>(null)
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
  const updateCurrentSceneRef = useRef<(explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, partIndex?: number | null, sceneIndex?: number, overrideTransitionDuration?: number) => void>(() => {})
  // Fabric.js refs
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElementRef = useRef<HTMLCanvasElement | null>(null)
  
  // State
  const [rightPanelTab, setRightPanelTab] = useState('animation')
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')
  const editModeRef = useRef(editMode)
  // 빈 공간 클릭 감지를 위한 플래그 (스프라이트/텍스트/핸들 클릭 여부 추적)
  const clickedOnPixiElementRef = useRef(false)
  
  // editMode 변경 시 ref 업데이트
  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])
  
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
  const _isTtsBootstrappingRef = useRef(false) // 클로저에서 최신 값 참조용
  const [showReadyMessage, _setShowReadyMessage] = useState(false) // "재생이 가능해요!" 메시지 표시 여부
  const [showVoiceRequiredMessage, setShowVoiceRequiredMessage] = useState(false) // "음성을 먼저 선택해주세요" 메시지 표시 여부
  const [isPreparing, setIsPreparing] = useState(false) // 모든 TTS 합성 준비 중인지 여부
  // 스크립트가 변경된 씬 추적 (재생 시 강제 재생성)
  const changedScenesRef = useRef<Set<number>>(new Set())
  // 선택된 구간 추적 (씬 인덱스, 구간 인덱스)
  const [selectedPart, setSelectedPartState] = useState<{ sceneIndex: number; partIndex: number } | null>(null)
  const selectedPartRef = useRef<{ sceneIndex: number; partIndex: number } | null>(null)
  
  // setSelectedPart를 래핑하여 selectedPartRef도 함께 업데이트
  const setSelectedPart = useCallback((part: { sceneIndex: number; partIndex: number } | null) => {
    selectedPartRef.current = part
    setSelectedPartState(part)
  }, [])

  // 토큰 검증
  const { isValidatingToken: _isValidatingToken } = useVideoCreateAuth()

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

  // 재생 상태 ref (usePixiEditor에서 사용하기 위해 먼저 선언)
  const isPlayingRef = useRef(false)

  // 편집 핸들러 hook (먼저 선언하여 콜백에서 사용 가능하도록)
  const {
    drawEditHandles,
    saveImageTransform,
    saveAllImageTransforms: _saveAllImageTransforms,
    handleResize,
    setupSpriteDrag,
    applyImageTransform: _applyImageTransform,
    saveTextTransform,
    applyTextTransform: _applyTextTransform,
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
    clickedOnPixiElementRef,
    editMode,
    setEditMode,
    selectedElementIndex,
    setSelectedElementIndex,
    selectedElementType,
    setSelectedElementType,
    timeline,
    setTimeline,
    useFabricEditing,
    isPlayingRef, // 재생 중인지 여부 전달 (ref)
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

  // 로드 완료 후 드래그 설정 재적용 및 핸들 표시
  const handleLoadComplete = useCallback((sceneIndex: number) => {
    const sprite = spritesRef.current.get(sceneIndex)
    const text = textsRef.current.get(sceneIndex)
    
    // 편집 모드일 때 스프라이트와 텍스트를 먼저 표시 (핸들을 그리기 전에)
    const currentEditMode = editModeRef.current
    // isPlaying은 useTimelinePlayer에서 가져오므로 여기서는 ref를 직접 사용
    // 재생 중이 아니라고 가정 (편집 모드이므로)
    const isPlaying = false
    
    if (currentEditMode === 'image' || currentEditMode === 'text') {
      // 재생 중이 아니면 스프라이트와 텍스트를 표시
      if (!isPlaying) {
        if (sprite) {
          sprite.visible = true
          sprite.alpha = 1
        }
        if (text) {
          text.visible = true
          text.alpha = 1
        }
      }
    }
    
    if (sprite) {
      setupSpriteDrag(sprite, sceneIndex)
    }
    
    if (text) {
      setupTextDrag(text, sceneIndex)
    }
    
    // 편집 모드일 때 핸들 표시 (updateCurrentScene 완료 후)
    if (currentEditMode === 'image') {
      // 이미지 편집 모드일 때는 이미지 핸들만 표시하고 자막 핸들은 제거
      const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
      if (existingTextHandles && existingTextHandles.parent) {
        existingTextHandles.parent.removeChild(existingTextHandles)
        textEditHandlesRef.current.delete(sceneIndex)
      }
      
      // 스프라이트가 visible하고 alpha가 0보다 클 때만 핸들 그리기
      if (sprite && sprite.visible && sprite.alpha > 0) {
        const existingHandles = editHandlesRef.current.get(sceneIndex)
        if (!existingHandles || !existingHandles.parent) {
          try {
            drawEditHandles(sprite, sceneIndex, handleResize, saveImageTransform)
          } catch {
            // 이미지 핸들 그리기 실패
          }
        }
      }
    } else if (currentEditMode === 'text') {
      // 자막 편집 모드일 때는 자막 핸들만 표시하고 이미지 핸들은 제거
      const existingHandles = editHandlesRef.current.get(sceneIndex)
      if (existingHandles && existingHandles.parent) {
        existingHandles.parent.removeChild(existingHandles)
        editHandlesRef.current.delete(sceneIndex)
      }
      
      // 텍스트가 visible하고 alpha가 0보다 클 때만 핸들 그리기
      if (text && text.visible && text.alpha > 0) {
        const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
        if (!existingTextHandles || !existingTextHandles.parent) {
          try {
            drawTextEditHandles(text, sceneIndex, handleTextResize, saveTextTransform)
          } catch {
            // 자막 핸들 그리기 실패
          }
        }
      }
    }
  }, [setupSpriteDrag, setupTextDrag, drawEditHandles, drawTextEditHandles, handleResize, saveImageTransform, handleTextResize, saveTextTransform])

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
    setCurrentSceneIndex: undefined as ((index: number) => void) | undefined, // 나중에 설정됨
  })
  
  const { updateCurrentScene, syncFabricWithScene, loadAllScenes } = sceneManagerResult1
  
  // loadAllScenes가 항상 정의되도록 보장 (초기화되지 않은 경우를 대비)
  const loadAllScenesStable = loadAllScenes || (async () => {})
  
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
  const timelineScenesRef = useRef<TimelineScene[]>([])
  const loadAllScenesCompletedRef = useRef<boolean>(false) // loadAllScenes 완료 여부 추적

  // Pixi와 타임라인이 모두 준비되면 씬 로드
  useEffect(() => {
    if (!pixiReady || !appRef.current || !containerRef.current || !timeline || timeline.scenes.length === 0 || !loadAllScenesStable) {
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
      sceneId: scene.sceneId,
      image: scene.image,
      text: scene.text || { content: '', font: 'Noto Sans KR', color: '#ffffff', position: 'center' },
      duration: scene.duration,
      transition: scene.transition,
    }))

    // 다음 프레임에 실행하여 ref가 확실히 설정된 후 실행
    requestAnimationFrame(async () => {
      // loadAllScenesStable은 이미 위에서 체크했으므로 안전하게 사용 가능
      loadAllScenesCompletedRef.current = false
      await loadAllScenesStable()
      
      // loadAllScenes 완료 후 spritesRef와 textsRef 상태 확인
      const sceneIndex = currentSceneIndexRef.current
      const _spriteAfterLoad = spritesRef.current.get(sceneIndex)
      const _textAfterLoad = textsRef.current.get(sceneIndex)
      
      loadAllScenesCompletedRef.current = true
      
      // loadAllScenes 완료 후 updateCurrentScene이 호출되므로, 
      // updateCurrentScene 완료를 기다린 후 핸들을 그려야 함
      // useSceneManager의 loadAllScenes는 requestAnimationFrame 내부에서 updateCurrentScene을 호출하므로
      // 여러 프레임을 기다려야 함
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (appRef.current && containerRef.current) {
              // 재생 중이면 이미지 렌더링 스킵 (그룹 재생 중일 수 있음)
              const isPlaying = isPlayingRef?.current || false
              
              // 재생 중이 아니면 현재 씬만 표시
              if (!isPlaying) {
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
              }
              // 렌더링은 PixiJS ticker가 처리
              
              // lastRenderedSceneIndexRef 초기화 (전환 효과 추적용)
              lastRenderedSceneIndexRef.current = sceneIndex
              previousSceneIndexRef.current = sceneIndex
              
              // 편집 모드일 때 핸들 다시 표시 (editMode는 ref로 확인)
              // updateCurrentScene 호출 후 핸들을 그리도록 함
              const currentEditMode = editModeRef.current
              if (currentEditMode === 'image') {
                // 이미지 편집 모드일 때는 이미지 핸들만 표시하고 자막 핸들은 제거
                const currentSprite = spritesRef.current.get(sceneIndex)
                const _currentText = textsRef.current.get(sceneIndex)
                
                // 자막 핸들 제거
                const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
                if (existingTextHandles && existingTextHandles.parent) {
                  existingTextHandles.parent.removeChild(existingTextHandles)
                  textEditHandlesRef.current.delete(sceneIndex)
                }
                
                if (!currentSprite) {
                  return
                }
                
                const existingHandles = editHandlesRef.current.get(sceneIndex)
                if (!existingHandles || !existingHandles.parent) {
                  try {
                    drawEditHandlesRef.current(currentSprite, sceneIndex, handleResizeRef.current, saveImageTransformRef.current)
                  } catch {
                    // 이미지 핸들 그리기 실패
                  }
                }
                try {
                  setupSpriteDragRef.current(currentSprite, sceneIndex)
                } catch {
                  // 이미지 드래그 설정 실패
                }
              } else if (currentEditMode === 'text') {
                // 자막 편집 모드일 때는 자막 핸들만 표시하고 이미지 핸들은 제거
                const _currentSprite = spritesRef.current.get(sceneIndex)
                const currentText = textsRef.current.get(sceneIndex)
                
                // 이미지 핸들 제거
                const existingHandles = editHandlesRef.current.get(sceneIndex)
                if (existingHandles && existingHandles.parent) {
                  existingHandles.parent.removeChild(existingHandles)
                  editHandlesRef.current.delete(sceneIndex)
                }
                
                if (!currentText) {
                  return
                }
                
                const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
                if (!existingTextHandles || !existingTextHandles.parent) {
                  try {
                    drawTextEditHandlesRef.current(currentText, sceneIndex, handleTextResizeRef.current, saveTextTransformRef.current)
                  } catch {
                    // 자막 핸들 그리기 실패
                  }
                }
                try {
                  setupTextDragRef.current(currentText, sceneIndex)
                } catch {
                  // 자막 드래그 설정 실패
                }
              }
            }
          })
        })
      })
    })
  }, [pixiReady, timeline, loadAllScenesStable])

  // Fabric 씬 동기화
  useEffect(() => {
    if (!fabricReady || !timeline || timeline.scenes.length === 0) return
    syncFabricWithScene()
  }, [fabricReady, timeline, editMode, syncFabricWithScene])
  
  // timeline 변경 시 저장된 씬 인덱스 복원 (더 이상 필요 없음 - 편집 종료 버튼에서 직접 처리)

  // 현재 씬의 시작 시간 계산
  const _getSceneStartTime = useCallback((sceneIndex: number) => {
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
  const _showScene = useCallback((index: number) => {
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
    currentTimeRef: timelineCurrentTimeRef,
    progressRatio,
    playbackSpeed,
    setPlaybackSpeed,
    totalDuration,
    selectScene: _timelineSelectScene,
    togglePlay: _togglePlay,
    getStageDimensions: _getStageDimensions,
  } = useTimelinePlayer({
    timeline,
    updateCurrentScene: () => {
      // useTimelinePlayer는 skipAnimation만 받지만, 새로운 시그니처는 explicitPreviousIndex를 받음
      // 빈 함수로 래핑 (실제로는 사용되지 않음)
    },
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
    setConfirmedBgmTemplate: _setConfirmedBgmTemplate,
    isBgmBootstrapping,
    setIsBgmBootstrapping: _setIsBgmBootstrapping,
    isBgmBootstrappingRef: _isBgmBootstrappingRef,
    bgmAudioRef: _bgmAudioRef,
    bgmStartTimeRef: _bgmStartTimeRef,
    stopBgmAudio,
    startBgmAudio,
    handleBgmConfirm,
  } = useBgmManager({
    bgmTemplate,
    playbackSpeed,
    isPlaying,
  })

  // 타임라인 인터랙션
  const { isDraggingTimeline: _isDraggingTimeline, handleTimelineClick: _handleTimelineClick, handleTimelineMouseDown } = useTimelineInteraction({
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
      prepareOnly?: boolean
      isPlaying?: boolean
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
            
            // 이미지는 전환 효과를 통해서만 렌더링되므로 여기서는 처리하지 않음
            
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
      // 재생 중일 때는 setCurrentSceneIndex를 호출하지 않아서 중복 렌더링 방지
      if (!isSameSceneTransition && setCurrentSceneIndex && !options?.isPlaying) {
        currentSceneIndexRef.current = sceneIndex
        setCurrentSceneIndex(sceneIndex)
      } else if (!isSameSceneTransition) {
        // 재생 중일 때는 ref만 업데이트
        currentSceneIndexRef.current = sceneIndex
      }
      
      // updateCurrentScene 호출하여 씬 전환
      // skipAnimation 파라미터 제거: forceTransition === 'none'으로 처리
      updateCurrentScene(
        options?.previousIndex !== undefined ? options.previousIndex : currentSceneIndexRef.current,
        options?.forceTransition || (options?.skipAnimation ? 'none' : undefined),
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
        options?.isPlaying ?? false, // isPlaying 옵션 전달
        partIndex, // partIndex 전달
        sceneIndex // sceneIndex 전달
      )
    }
  }, [timeline, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, updateCurrentScene, renderSceneContentFromManager])
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
  const _bgmStopTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // isPlayingRef는 위에서 이미 선언됨
  const _currentPlayIndexRef = useRef<number>(0)

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
  const _bgmAudioUrlRef = useRef<string | null>(null)
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
  
  // useGroupPlayback용 래퍼 (timeline을 파라미터로 받음)
  const buildSceneMarkupWithTimeline = useCallback(
    (timelineParam: TimelineData | null, sceneIndex: number) => buildSceneMarkup(timelineParam, sceneIndex),
    []
  )

  // Timeline의 duration을 계산 (실제 재생 시간 우선, 없으면 TTS 캐시 기반 계산)
  // 실제 재생 시간이 있으면 그것을 사용하고, 없으면 한 번만 TTS 캐시 기반으로 계산
  // 스크립트가 변경되지 않았고 actualPlaybackDuration이 있으면 재계산하지 않음
  useEffect(() => {
    if (!timeline || !voiceTemplate) return
    
    // 변경된 씬이 있는지 확인 (스크립트가 변경된 씬은 재계산 필요)
    const _hasChangedScenes = changedScenesRef.current.size > 0
    
    const updatedScenes = timeline.scenes.map((scene, index) => {
      // 실제 재생 시간이 있고, 해당 씬이 변경되지 않았으면 그것을 사용 (가장 정확함)
      if (scene.actualPlaybackDuration && scene.actualPlaybackDuration > 0 && !changedScenesRef.current.has(index)) {
        return { ...scene, duration: scene.actualPlaybackDuration }
      }
      
      // 실제 재생 시간이 없으면 TTS 캐시 기반으로 계산 (한 번만)
      const markups = buildSceneMarkup(timeline, index)
      if (markups.length === 0) return scene
      
      let totalTtsDuration = 0
      let cachedPartsCount = 0
      let cachedPartsTotalDuration = 0
      let uncachedPartsTextLength = 0
      let cachedPartsTextLength = 0
      
      // 모든 part의 TTS duration 합산 및 텍스트 길이 계산
      for (let partIndex = 0; partIndex < markups.length; partIndex++) {
        const markup = markups[partIndex]
        const key = makeTtsKey(voiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        
        // 텍스트 길이 계산 (공백 제거)
        const textLength = markup.replace(/\s+/g, '').length
        
        if (cached && cached.durationSec > 0) {
          totalTtsDuration += cached.durationSec
          cachedPartsTotalDuration += cached.durationSec
          cachedPartsCount++
          cachedPartsTextLength += textLength
        } else {
          uncachedPartsTextLength += textLength
        }
      }
      
      // 모든 part가 캐시에 있으면 정확한 합계 사용
      if (cachedPartsCount === markups.length && totalTtsDuration > 0) {
        // TTS 캐시에서 계산된 duration이 더 정확하므로 항상 업데이트
        return { ...scene, duration: totalTtsDuration }
      } 
      // 일부 part만 캐시에 있는 경우: 더 정확한 추정
      else if (cachedPartsCount > 0 && cachedPartsTotalDuration > 0) {
        // 방법 1: 캐시된 part의 평균 duration으로 추정
        const avgCachedDuration = cachedPartsTotalDuration / cachedPartsCount
        const uncachedPartsCount = markups.length - cachedPartsCount
        const estimatedByAvg = totalTtsDuration + (avgCachedDuration * uncachedPartsCount)
        
        // 방법 2: 텍스트 길이 기반 추정 (더 정확)
        let estimatedByText = totalTtsDuration
        if (cachedPartsTextLength > 0 && uncachedPartsTextLength > 0) {
          // 캐시된 part의 초당 글자 수 계산
          const charsPerSecond = cachedPartsTextLength / cachedPartsTotalDuration
          // 캐시되지 않은 part의 duration 추정
          const estimatedUncachedDuration = uncachedPartsTextLength / charsPerSecond
          estimatedByText = totalTtsDuration + estimatedUncachedDuration
        }
        
        // 두 방법 중 더 신뢰할 수 있는 방법 선택
        // 텍스트 길이 기반 추정이 더 정확하므로 우선 사용
        const estimatedTotal = estimatedByText > 0 ? estimatedByText : estimatedByAvg
        
        // 추정값이 합리적인 범위 내에 있으면 사용
        // 캐시된 part가 많을수록 더 신뢰할 수 있으므로 조건 완화
        const cacheRatio = cachedPartsCount / markups.length
        const minRatio = cacheRatio >= 0.7 ? 0.2 : (cacheRatio >= 0.5 ? 0.3 : 0.4)
        const maxRatio = cacheRatio >= 0.7 ? 2.0 : (cacheRatio >= 0.5 ? 3.0 : 4.0)
        
        if (estimatedTotal > 0 && estimatedTotal >= scene.duration * minRatio && estimatedTotal <= scene.duration * maxRatio) {
          return { ...scene, duration: estimatedTotal }
        }
        // 추정값이 범위를 벗어나도 캐시 비율이 높으면 사용
        else if (cacheRatio >= 0.7 && estimatedTotal > 0) {
          return { ...scene, duration: estimatedTotal }
        }
      }
      // 캐시가 전혀 없는 경우: 텍스트 길이 기반 추정 (초당 8글자)
      else if (uncachedPartsTextLength > 0) {
        const estimatedByTextLength = uncachedPartsTextLength / 8
        // 최소 1초, 기존 duration과 비교하여 합리적인 범위 내에 있으면 사용
        const estimatedTotal = Math.max(1, estimatedByTextLength)
        if (estimatedTotal >= scene.duration * 0.3 && estimatedTotal <= scene.duration * 3) {
          return { ...scene, duration: estimatedTotal }
        }
      }
      
      return scene
    })
    
    const hasDurationUpdate = updatedScenes.some((scene, index) => 
      Math.abs(scene.duration - (timeline.scenes[index]?.duration ?? 0)) > 0.01
    )
    
    if (hasDurationUpdate) {
      setTimeline({
        ...timeline,
        scenes: updatedScenes,
      })
    }
  }, [timeline, voiceTemplate, setTimeline, ttsCacheRef])

  // getMp3DurationSec는 lib/utils/audio.ts에서 import하여 사용

  const setSceneDurationFromAudio = useCallback(
    (sceneIndex: number, durationSec: number) => {
      if (!timeline || !voiceTemplate) {
        return
      }
      if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return
      }
      
      // TTS 캐시에서 모든 part의 실제 duration을 다시 계산하여 정확성 보장
      const markups = buildSceneMarkup(timeline, sceneIndex)
      let totalTtsDuration = 0
      let allPartsCached = true
      
      for (let partIndex = 0; partIndex < markups.length; partIndex++) {
        const markup = markups[partIndex]
        const key = makeTtsKey(voiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached && cached.durationSec > 0) {
          totalTtsDuration += cached.durationSec
        } else {
          allPartsCached = false
        }
      }
      
      // 모든 part가 캐시에 있으면 정확한 합계 사용, 없으면 전달받은 durationSec 사용
      const finalDuration = allPartsCached && totalTtsDuration > 0 ? totalTtsDuration : durationSec
      
      const prev = timeline.scenes[sceneIndex]?.duration ?? 0
      if (Math.abs(prev - finalDuration) <= 0.01) {
        return
      }

      // 실제 duration 사용 (최소 0.5초만 유지, 최대 제한 없음)
      const clamped = Math.max(0.5, finalDuration)
      
      // 이전 totalDuration 계산 (같은 sceneId를 가진 씬들 사이의 transition 제외)
      const prevTotalDuration = calculateTotalDuration(timeline)
      
      // 새로운 timeline 생성
      const newTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((s, i) => (i === sceneIndex ? { ...s, duration: clamped } : s)),
      }
      
      // 새로운 totalDuration 계산 (같은 sceneId를 가진 씬들 사이의 transition 제외)
      const newTotalDuration = calculateTotalDuration(newTimeline)
      
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
    [setTimeline, timeline, isPlaying, setCurrentTime, voiceTemplate, ttsCacheRef]
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
        throw new Error('timeline이 없습니다.')
      }
      if (!voiceTemplate) {
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

  const _prefetchWindow = useCallback(
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

  // 전체 재생 훅 (먼저 선언하여 리소스 가져오기)
  const fullPlayback = useFullPlayback({
    timeline,
    voiceTemplate,
    bgmTemplate: confirmedBgmTemplate,
    playbackSpeed: timeline?.playbackSpeed ?? 1.0,
    buildSceneMarkup: buildSceneMarkupWithTimeline,
    makeTtsKey,
    ensureSceneTts,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    setCurrentTime,
    setTimelineIsPlaying,
    setIsPreparing,
    setIsTtsBootstrapping,
    startBgmAudio,
    stopBgmAudio,
    changedScenesRef,
    renderSceneContent,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
    textsRef,
    spritesRef,
    containerRef,
    getMp3DurationSec,
    setTimeline,
    disableAutoTimeUpdateRef,
    currentTimeRef: timelineCurrentTimeRef,
    totalDuration,
    timelineBarRef,
    activeAnimationsRef,
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
    isPlaying: fullPlayback.isPlaying,
    setIsPlaying: fullPlayback.setIsPlaying,
    isPreviewingTransition,
    setIsPreviewingTransition,
    setCurrentTime,
    voiceTemplate,
    playbackSpeed: timeline?.playbackSpeed ?? 1.0,
    buildSceneMarkup: buildSceneMarkupWrapper,
    makeTtsKey,
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
    videoPlaybackIsPlaying: fullPlayback.isPlaying,
    timelineIsPlaying,
    setTimelineIsPlaying,
    videoPlaybackSetIsPlaying: fullPlayback.setIsPlaying,
  })

  // 비디오 재생 중일 때 useTimelinePlayer의 자동 시간 업데이트 비활성화
  useEffect(() => {
    disableAutoTimeUpdateRef.current = fullPlayback.isPlaying || fullPlayback.isPlayingAll
  }, [fullPlayback.isPlaying, fullPlayback.isPlayingAll])

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
        const cached = value as { blob: Blob; durationSec: number; markup: string; url?: string | null; sceneId?: number; sceneIndex?: number }
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
  }, [timeline, voiceTemplate])

  // 씬 편집 핸들러들
  const {
    handleSceneScriptChange: originalHandleSceneScriptChange,
    handleSceneDurationChange: _handleSceneDurationChange,
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
    ttsCacheRef: fullPlayback.ttsCacheRef,
    ensureSceneTts,
    spritesRef,
    textsRef,
  })

  // 씬 순서 변경 핸들러는 useSceneEditHandlers에서 제공
  const handleSceneReorder = handleSceneReorderFromHook

  // useGroupPlayback과 useSingleScenePlayback은 useFullPlayback 내부에서 생성됨
  // 외부에서 접근하기 위해 fullPlayback에서 가져옴
  const { singleScenePlayback, groupPlayback } = fullPlayback

  // 씬 구조 정보 자동 업데이트
  useEffect(() => {
    if (!scenes.length || !timeline) return
    
    sceneStructureStore.updateStructure({
      scenes,
      timeline,
      ttsCacheRef: fullPlayback.ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup: buildSceneMarkupWithTimeline,
      makeTtsKey,
    })
    
    // // 구조 정보 콘솔 출력
    // console.log('=== 씬 구조 정보 ===')
    // console.log('전체 씬 수:', sceneStructureStore.sceneStructures.length)
    // console.log('그룹 수:', sceneStructureStore.groups.size)
    
    // // 각 씬의 구조 정보
    // sceneStructureStore.sceneStructures.forEach((structure) => {
    //   console.log(`\n씬 ${structure.index}:`, {
    //     sceneId: structure.sceneId,
    //     splitIndex: structure.splitIndex,
    //     isSplit: structure.isSplit,
    //     fullSubtitle: structure.fullSubtitle.substring(0, 50) + (structure.fullSubtitle.length > 50 ? '...' : ''),
    //     subtitleParts: structure.subtitleParts,
    //     hasSubtitleSegments: structure.hasSubtitleSegments,
    //     groupStartIndex: structure.groupStartIndex,
    //     groupEndIndex: structure.groupEndIndex,
    //     groupSize: structure.groupSize,
    //     ttsDuration: structure.ttsDuration,
    //     hasTtsCache: structure.hasTtsCache,
    //   })
    // })
    
    // // 그룹 정보
    // console.log('\n=== 그룹 정보 ===')
    // sceneStructureStore.groups.forEach((groupInfo, sceneId) => {
    //   console.log(`그룹 sceneId ${sceneId}:`, {
    //     indices: groupInfo.indices,
    //     firstSceneIndex: groupInfo.firstSceneIndex,
    //     lastSceneIndex: groupInfo.lastSceneIndex,
    //     size: groupInfo.size,
    //     totalTtsDuration: groupInfo.totalTtsDuration,
    //     hasAllTtsCache: groupInfo.hasAllTtsCache,
    //   })
    // })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, timeline, voiceTemplate])

  // 그룹 복사 핸들러
  const handleGroupDuplicate = useCallback((sceneId: number, groupIndices: number[]) => {
    if (!timeline || scenes.length === 0) return

    // 새로운 sceneId 할당
    const maxSceneId = Math.max(...scenes.map(s => s.sceneId || 0), ...timeline.scenes.map(s => s.sceneId || 0))
    const newSceneId = maxSceneId + 1

    // 그룹 내 모든 씬 복사
    const duplicatedScenes: SceneScript[] = []
    const duplicatedTimelineScenes: TimelineScene[] = []
    
    groupIndices.forEach((index, idx) => {
      const originalScene = scenes[index]
      const originalTimelineScene = timeline.scenes[index]
      
      duplicatedScenes.push({
        ...originalScene,
        sceneId: newSceneId, // 새로운 그룹의 sceneId
        splitIndex: idx + 1, // splitIndex 재할당 (1부터 시작)
      })
      
      duplicatedTimelineScenes.push({
        ...originalTimelineScene,
        sceneId: newSceneId, // 새로운 그룹의 sceneId
        splitIndex: idx + 1, // splitIndex 재할당
      })
    })

    // 그룹의 마지막 씬 다음에 삽입
    const lastGroupIndex = Math.max(...groupIndices)
    const insertIndex = lastGroupIndex + 1

    // scenes 배열에 삽입
    const newScenes = [
      ...scenes.slice(0, insertIndex),
      ...duplicatedScenes,
      ...scenes.slice(insertIndex),
    ]

    // timeline.scenes 배열에도 삽입
    const newTimelineScenes = [
      ...timeline.scenes.slice(0, insertIndex),
      ...duplicatedTimelineScenes,
      ...timeline.scenes.slice(insertIndex),
    ]

    setScenes(newScenes)
    setTimeline({
      ...timeline,
      scenes: newTimelineScenes,
    })

    // 복사된 그룹의 첫 번째 씬 선택
    setCurrentSceneIndex(insertIndex)
    currentSceneIndexRef.current = insertIndex

    // 복사된 씬들을 변경 상태로 표시
    duplicatedScenes.forEach((_, idx) => {
      changedScenesRef.current.add(insertIndex + idx)
      invalidateSceneTtsCache(insertIndex + idx)
    })
  }, [scenes, timeline, setScenes, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, invalidateSceneTtsCache, changedScenesRef])

  // 그룹 재생 핸들러 (useGroupPlayback 훅 사용)
  const handleGroupPlay = useCallback(async (sceneId: number, groupIndices: number[]) => {
    console.log('[handleGroupPlay] 호출됨', { sceneId, groupIndices, groupPlayback: !!groupPlayback })
    // 이미 같은 그룹이 재생 중이면 정지
    if (groupPlayback.playingGroupSceneId === sceneId) {
      console.log('[handleGroupPlay] 정지 호출')
      groupPlayback.stopGroup()
      return
    }
    
    console.log('[handleGroupPlay] 재생 호출')
    await groupPlayback.playGroup(sceneId, groupIndices)
  }, [groupPlayback])

  // 씬 재생 핸들러 (useGroupPlayback 훅 사용 - 단일 씬도 그룹으로 처리)
  const handleScenePlay = useCallback(async (sceneIndex: number) => {
    console.log('[handleScenePlay] 호출됨', { sceneIndex, groupPlayback: !!groupPlayback, timeline: !!timeline })
    try {
      // 이미 같은 씬이 재생 중이면 정지
      if (groupPlayback.playingSceneIndex === sceneIndex) {
        console.log('[handleScenePlay] 정지 호출')
        groupPlayback.stopGroup()
        return
      }
      
      // 단일 씬도 useGroupPlayback을 사용하여 재생
      // sceneId는 undefined로 전달하고, groupIndices는 [sceneIndex]로 전달
      const scene = timeline?.scenes[sceneIndex]
      const sceneId = scene?.sceneId
      console.log('[handleScenePlay] 재생 호출', { sceneId, sceneIndex })
      await groupPlayback.playGroup(sceneId, [sceneIndex])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // 인증 오류인 경우 처리
      if (errorMessage.includes('인증') || 
          errorMessage.includes('로그인') ||
          errorMessage.includes('유효하지 않습니다')) {
        // 토큰 정리
        if (typeof window !== 'undefined') {
          const { authStorage } = await import('@/lib/api/auth-storage')
          authStorage.clearTokens()
          
          // 인증 만료 이벤트 발생 (providers.tsx에서 로그인 페이지로 리다이렉트)
          window.dispatchEvent(new CustomEvent('auth:expired'))
          
          // UI에 에러 메시지 표시
          alert('인증 시간이 만료되었어요.\n다시 로그인해주세요.')
          
          // 로그인 페이지로 리다이렉트
          router.replace('/login')
        }
        return
      }
      
      // 기타 오류는 콘솔에만 출력
      console.error('[씬 재생] 오류:', error)
    }
  }, [groupPlayback, timeline, router])

  // 그룹 삭제 핸들러
  const handleGroupDelete = useCallback((sceneId: number, groupIndices: number[]) => {
    if (!timeline || scenes.length === 0) return

    // 그룹 내 모든 씬 삭제 (역순으로 삭제하여 인덱스 변경 문제 방지)
    const sortedIndices = [...groupIndices].sort((a, b) => b - a)
    
    let newScenes = [...scenes]
    let newTimelineScenes = [...timeline.scenes]

    sortedIndices.forEach(index => {
      newScenes = newScenes.filter((_, i) => i !== index)
      newTimelineScenes = newTimelineScenes.filter((_, i) => i !== index)
    })

    setScenes(newScenes)
    setTimeline({
      ...timeline,
      scenes: newTimelineScenes,
    })
  }, [timeline, scenes, setScenes, setTimeline])

  // PixiJS 컨테이너에 빈 공간 클릭 감지 추가 (canvas 요소에 직접 이벤트 추가)
  useEffect(() => {
    if (!containerRef.current || !appRef.current || useFabricEditing || !pixiReady) return

    const app = appRef.current
    const canvas = app.canvas

    // canvas 요소에 직접 클릭 이벤트 추가 (스프라이트/텍스트의 stopPropagation과 무관하게 작동)
    const handleCanvasClick = (e: MouseEvent) => {
      // 플래그 초기화
      clickedOnPixiElementRef.current = false
      
      // 약간의 지연을 두어 스프라이트/텍스트/핸들 클릭 이벤트가 먼저 처리되도록 함
      setTimeout(() => {
        // 스프라이트나 텍스트나 핸들을 클릭했다면 빈 공간 클릭으로 처리하지 않음
        if (clickedOnPixiElementRef.current) {
          return
        }

        // 편집 모드가 'none'이면 처리하지 않음
        if (editMode === 'none') {
          return
        }

        // 마우스 좌표를 PixiJS 좌표로 변환
        const rect = canvas.getBoundingClientRect()
        const scaleX = app.screen.width / rect.width
        const scaleY = app.screen.height / rect.height
        const pixiX = (e.clientX - rect.left) * scaleX
        const pixiY = (e.clientY - rect.top) * scaleY

        const clickedSprite = spritesRef.current.get(currentSceneIndexRef.current)
        const clickedText = textsRef.current.get(currentSceneIndexRef.current)
        
        // 핸들 클릭인지 확인
        const clickedOnHandle = editHandlesRef.current.get(currentSceneIndexRef.current)?.children.some(handle => {
          if (handle instanceof PIXI.Graphics) {
            const handleBounds = handle.getBounds()
            return pixiX >= handleBounds.x && pixiX <= handleBounds.x + handleBounds.width &&
                   pixiY >= handleBounds.y && pixiY <= handleBounds.y + handleBounds.height
          }
          return false
        }) || textEditHandlesRef.current.get(currentSceneIndexRef.current)?.children.some(handle => {
          if (handle instanceof PIXI.Graphics) {
            const handleBounds = handle.getBounds()
            return pixiX >= handleBounds.x && pixiX <= handleBounds.x + handleBounds.width &&
                   pixiY >= handleBounds.y && pixiY <= handleBounds.y + handleBounds.height
          }
          return false
        })

        // 스프라이트나 텍스트를 클릭하지 않고, 핸들도 클릭하지 않은 경우 (빈 공간)
        const spriteBounds = clickedSprite?.getBounds()
        const clickedOnSprite = clickedSprite && spriteBounds && clickedSprite.visible && clickedSprite.alpha > 0 &&
          pixiX >= spriteBounds.x && pixiX <= spriteBounds.x + spriteBounds.width &&
          pixiY >= spriteBounds.y && pixiY <= spriteBounds.y + spriteBounds.height
        
        const textBounds = clickedText?.getBounds()
        const clickedOnText = clickedText && textBounds && clickedText.visible && clickedText.alpha > 0 &&
          pixiX >= textBounds.x && pixiX <= textBounds.x + textBounds.width &&
          pixiY >= textBounds.y && pixiY <= textBounds.y + textBounds.height
        
        if (!clickedOnHandle && !clickedOnSprite && !clickedOnText) {
          // 빈 공간 클릭: 선택 해제 및 편집 모드 종료
          setSelectedElementIndex(null)
          setSelectedElementType(null)
          setEditMode('none')
        }
      }, 50)
    }

    // canvas 요소에 직접 이벤트 리스너 추가 (capture phase에서 처리)
    canvas.addEventListener('mousedown', handleCanvasClick, true)

    return () => {
      canvas.removeEventListener('mousedown', handleCanvasClick, true)
    }
  }, [containerRef, appRef, useFabricEditing, pixiReady, currentSceneIndexRef, spritesRef, textsRef, editHandlesRef, textEditHandlesRef, clickedOnPixiElementRef, editMode, setSelectedElementIndex, setSelectedElementType, setEditMode])

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

  // ESC 키로 편집 모드 해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC 키를 눌렀을 때 편집 모드 해제
      if (e.key === 'Escape' && editMode !== 'none') {
        setSelectedElementIndex(null)
        setSelectedElementType(null)
        setEditMode('none')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [editMode, setEditMode, setSelectedElementIndex, setSelectedElementType])

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

  // 편집 핸들러 함수들을 ref로 저장 (dependency array 크기 일정하게 유지)
  const drawEditHandlesRef = useRef(drawEditHandles)
  const setupSpriteDragRef = useRef(setupSpriteDrag)
  const handleResizeRef = useRef(handleResize)
  const saveImageTransformRef = useRef(saveImageTransform)
  const drawTextEditHandlesRef = useRef(drawTextEditHandles)
  const setupTextDragRef = useRef(setupTextDrag)
  const handleTextResizeRef = useRef(handleTextResize)
  const saveTextTransformRef = useRef(saveTextTransform)
  const loadAllScenesRef = useRef(loadAllScenes)

  // 함수 참조가 변경될 때마다 ref 업데이트
  useEffect(() => {
    drawEditHandlesRef.current = drawEditHandles
    setupSpriteDragRef.current = setupSpriteDrag
    handleResizeRef.current = handleResize
    saveImageTransformRef.current = saveImageTransform
    drawTextEditHandlesRef.current = drawTextEditHandles
    setupTextDragRef.current = setupTextDrag
    handleTextResizeRef.current = handleTextResize
    saveTextTransformRef.current = saveTextTransform
    loadAllScenesRef.current = loadAllScenes
  }, [drawEditHandles, setupSpriteDrag, handleResize, saveImageTransform, drawTextEditHandles, setupTextDrag, handleTextResize, saveTextTransform, loadAllScenes])

  // 편집 모드 변경 시 핸들 표시/숨김
  useEffect(() => {
    if (!containerRef.current || !timeline || !pixiReady) return

    // 편집 모드가 종료되면 핸들 제거
    if (editMode === 'none') {
      editHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      editHandlesRef.current.clear()
      textEditHandlesRef.current.forEach((handles) => {
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
    } else if (editMode === 'image') {
      // 이미지 편집 모드일 때는 이미지 핸들만 표시하고 자막 핸들은 제거
      const currentSceneIndex = timelineCurrentSceneIndex
      
      // 자막 핸들 제거
      const existingTextHandles = textEditHandlesRef.current.get(currentSceneIndex)
      if (existingTextHandles && existingTextHandles.parent) {
        existingTextHandles.parent.removeChild(existingTextHandles)
        textEditHandlesRef.current.delete(currentSceneIndex)
      }
      
      // 스프라이트가 실제로 존재하는지 확인
      const sprite = spritesRef.current.get(currentSceneIndex)
      
      if (!sprite) {
        // loadAllScenes가 완료되지 않았으면 나중에 handleLoadComplete에서 처리됨
        if (!loadAllScenesCompletedRef.current) {
          return
        }
        // loadAllScenes가 완료되었는데도 스프라이트가 없으면 핸들이 이미 그려져 있는지 확인
        const existingHandles = editHandlesRef.current.get(currentSceneIndex)
        if (existingHandles?.parent) {
          // 핸들이 이미 있으면 정상 (handleLoadComplete에서 이미 처리됨)
          return
        }
        return
      }
      
      // 현재 씬의 이미지 핸들 표시
      // 편집 모드에서는 스프라이트를 먼저 표시한 후 핸들 그리기
      sprite.visible = true
      sprite.alpha = 1
      
      const existingHandles = editHandlesRef.current.get(currentSceneIndex)
      if (!existingHandles || !existingHandles.parent) {
        try {
          drawEditHandlesRef.current(sprite, currentSceneIndex, handleResizeRef.current, saveImageTransformRef.current)
        } catch {
          // 이미지 핸들 그리기 실패
        }
      } else {
      }
      try {
        setupSpriteDragRef.current(sprite, currentSceneIndex)
      } catch {
        // 이미지 드래그 설정 실패
      }
    } else if (editMode === 'text') {
      // 자막 편집 모드일 때는 자막 핸들만 표시하고 이미지 핸들은 제거
      const currentSceneIndex = timelineCurrentSceneIndex
      
      // 이미지 핸들 제거
      const existingHandles = editHandlesRef.current.get(currentSceneIndex)
      if (existingHandles && existingHandles.parent) {
        existingHandles.parent.removeChild(existingHandles)
        editHandlesRef.current.delete(currentSceneIndex)
      }
      
      // 텍스트가 실제로 존재하는지 확인
      const text = textsRef.current.get(currentSceneIndex)
      
      if (!text) {
        // loadAllScenes가 완료되지 않았으면 나중에 handleLoadComplete에서 처리됨
        if (!loadAllScenesCompletedRef.current) {
          return
        }
        // loadAllScenes가 완료되었는데도 텍스트가 없으면 핸들이 이미 그려져 있는지 확인
        const existingTextHandles = textEditHandlesRef.current.get(currentSceneIndex)
        if (existingTextHandles?.parent) {
          // 핸들이 이미 있으면 정상 (handleLoadComplete에서 이미 처리됨)
          return
        }
        return
      }
      
      // 현재 씬의 자막 핸들 표시
      // 편집 모드에서는 텍스트를 먼저 표시한 후 핸들 그리기
      text.visible = true
      text.alpha = 1
      
      const existingTextHandles = textEditHandlesRef.current.get(currentSceneIndex)
      if (!existingTextHandles || !existingTextHandles.parent) {
        try {
          drawTextEditHandlesRef.current(text, currentSceneIndex, handleTextResizeRef.current, saveTextTransformRef.current)
        } catch {
          // 자막 핸들 그리기 실패
        }
      } else {
      }
      try {
        setupTextDragRef.current(text, currentSceneIndex)
      } catch {
        // 자막 드래그 설정 실패
      }
    }

    if (appRef.current) {
      // 렌더링은 PixiJS ticker가 처리
    }
  }, [editMode, selectedElementIndex, selectedElementType, timeline, timelineCurrentSceneIndex, pixiReady])

  // 재생 시작 시 편집 모드 해제
  useEffect(() => {
    // isPlaying은 나중에 선언되므로 timelineIsPlaying 사용
    const playing = timelineIsPlaying
    if (playing && editMode !== 'none') {
      // 재생 중에는 편집 모드 해제
      setEditMode('none')
      setSelectedElementIndex(null)
      setSelectedElementType(null)
      
      // 모든 편집 핸들 제거
      editHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      editHandlesRef.current.clear()
      textEditHandlesRef.current.forEach((handles) => {
        if (handles.parent) {
          handles.parent.removeChild(handles)
        }
      })
      textEditHandlesRef.current.clear()
    }
  }, [timelineIsPlaying, editMode, setEditMode, setSelectedElementIndex, setSelectedElementType])




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
      return getScenePlaceholder(index)
    }),
    [scenes, selectedImages]
  )

  // 재생/일시정지 핸들러
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      fullPlayback?.stopAllScenes()
      setShowVoiceRequiredMessage(false)
    } else {
      // 음성 선택 여부 확인 (null, undefined, 빈 문자열 모두 체크)
      if (!voiceTemplate || voiceTemplate.trim() === '') {
        setShowVoiceRequiredMessage(true)
        // 음성 탭으로 자동 이동
        setRightPanelTab('voice')
        // 3초 후 자동으로 숨김
        setTimeout(() => {
          setShowVoiceRequiredMessage(false)
        }, 3000)
        return
      }
      setShowVoiceRequiredMessage(false)
      void fullPlayback?.playAllScenes()
    }
  }, [isPlaying, fullPlayback, voiceTemplate, setRightPanelTab])

  // 크기 조정하기 핸들러
  const handleResizeTemplate = useCallback(() => {
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
  }, [timeline, scenes.length, stageDimensions, setTimeline, loadAllScenes, recalculateCanvasSize])

  // 씬 선택 핸들러
  const handleSceneSelect = useCallback((index: number) => {
    // 씬 재생 중일 때는 씬 선택 무시 (중복 렌더링 방지)
    if (groupPlayback.playingSceneIndex !== null) {
      return
    }
    sceneNavigation.selectScene(index)
  }, [groupPlayback.playingSceneIndex, sceneNavigation])

  // 반환값 최적화
  return useMemo(() => ({
    // Refs
    pixiContainerRef,
    timelineBarRef,
    
    // State
    theme,
    mounted,
    rightPanelTab,
    setRightPanelTab,
    showGrid,
    setShowGrid,
    
    // Store values
    scenes,
    timeline,
    selectedImages,
    bgmTemplate,
    setBgmTemplate,
    subtitlePosition,
    subtitleFont,
    subtitleColor,
    voiceTemplate,
    selectedProducts,
    videoTitle,
    videoDescription,
    
    // Playback state
    isPlaying,
    currentTime,
    totalDuration,
    progressRatio,
    playbackSpeed,
    currentSceneIndex,
    selectedPart,
    isTtsBootstrapping,
    isBgmBootstrapping,
    isPreparing,
    showReadyMessage,
    showVoiceRequiredMessage,
    isExporting,
    isPreviewingTransition,
    
    // Canvas & Grid
    canvasDisplaySize,
    gridOverlaySize,
    stageDimensions,
    
    // Handlers
    handleTimelineMouseDown,
    handlePlayPause,
    handleExport,
    handlePlaybackSpeedChange,
    handleSceneSelect,
    handleSceneScriptChange,
    handleSceneImageFitChange,
    handleSceneReorder,
    handleSceneSplit,
    handleSceneDelete,
    handleSceneDuplicate,
    handleSceneTtsPreview,
    handleSceneTransitionChange,
    handleGroupDuplicate,
    handleGroupPlay,
    handleGroupDelete,
    handleScenePlay,
    handleResizeTemplate,
    onSelectPart: sceneNavigation.selectPart,
    
    // Scene data
    sceneThumbnails,
    transitionLabels,
    allTransitions,
    transitions,
    movements,
    
    // Playback
    fullPlayback,
    singleScenePlayback,
    playingSceneIndex: groupPlayback.playingSceneIndex,
    playingGroupSceneId: groupPlayback.playingGroupSceneId,
    confirmedBgmTemplate,
    handleBgmConfirm,
    setTimeline,
  }), [
    pixiContainerRef,
    timelineBarRef,
    theme,
    mounted,
    rightPanelTab,
    setRightPanelTab,
    showGrid,
    setShowGrid,
    scenes,
    timeline,
    selectedImages,
    bgmTemplate,
    setBgmTemplate,
    subtitlePosition,
    subtitleFont,
    subtitleColor,
    voiceTemplate,
    selectedProducts,
    videoTitle,
    videoDescription,
    isPlaying,
    currentTime,
    totalDuration,
    progressRatio,
    playbackSpeed,
    currentSceneIndex,
    selectedPart,
    isTtsBootstrapping,
    isBgmBootstrapping,
    isPreparing,
    showReadyMessage,
    showVoiceRequiredMessage,
    isExporting,
    isPreviewingTransition,
    canvasDisplaySize,
    gridOverlaySize,
    stageDimensions,
    handleTimelineMouseDown,
    handlePlayPause,
    handleExport,
    handlePlaybackSpeedChange,
    handleSceneSelect,
    handleSceneScriptChange,
    handleSceneImageFitChange,
    handleSceneReorder,
    handleSceneSplit,
    handleSceneDelete,
    handleSceneDuplicate,
    handleSceneTtsPreview,
    handleSceneTransitionChange,
    handleGroupDuplicate,
    handleGroupPlay,
    handleGroupDelete,
    handleScenePlay,
    handleResizeTemplate,
    sceneNavigation.selectPart,
    sceneThumbnails,
    fullPlayback,
    singleScenePlayback,
    confirmedBgmTemplate,
    handleBgmConfirm,
    setTimeline,
    groupPlayback.playingSceneIndex,
    groupPlayback.playingGroupSceneId,
  ])
}


