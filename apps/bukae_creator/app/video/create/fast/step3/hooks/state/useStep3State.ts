'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useVideoCreateStore, TimelineData } from '@/store/useVideoCreateStore'
import { useThemeStore } from '@/store/useThemeStore'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import * as fabric from 'fabric'

/**
 * Step3 상태 관리 훅
 * 모든 refs와 state를 관리합니다.
 */
export function useStep3State() {
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
  const voiceTemplate = useVideoCreateStore((state) => state.voiceTemplate)
  const setBgmTemplate = useVideoCreateStore((state) => state.setBgmTemplate)
  const selectedProducts = useVideoCreateStore((state) => state.selectedProducts)
  const videoTitle = useVideoCreateStore((state) => state.videoTitle)
  const videoDescription = useVideoCreateStore((state) => state.videoDescription)
  
  const theme = useThemeStore((state) => state.theme)
  
  // ============================================
  // Refs: 렌더링에 영향 없는 내부 상태 추적 및 DOM 참조
  // ============================================
  
  // Timeline ref (useEffect 최적화를 위해 사용, 렌더링 불필요)
  const timelineRef = useRef(timeline)
  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])
  
  // VoiceTemplate ref (핸들러 최적화를 위해 사용, 렌더링 불필요)
  const voiceTemplateRef = useRef(voiceTemplate)
  useEffect(() => {
    voiceTemplateRef.current = voiceTemplate
  }, [voiceTemplate])
  
  // 레거시 재생 시스템 ref 제거 - Transport 기반으로 완전 전환
  // const fullPlaybackRef = useRef<any>(null)
  // const groupPlaybackRef = useRef<any>(null)
  
  // PixiJS DOM 및 객체 참조 (렌더링 불필요, 내부 로직에서만 사용)
  const pixiContainerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<PIXI.Application | null>(null)
  const containerRef = useRef<PIXI.Container | null>(null)
  const texturesRef = useRef<Map<string, PIXI.Texture>>(new Map())
  const spritesRef = useRef<Map<number, PIXI.Sprite>>(new Map())
  const textsRef = useRef<Map<number, PIXI.Text>>(new Map())
  
  // 드래그 상태 추적 (렌더링 불필요, 이벤트 핸들러에서만 사용)
  const isDraggingRef = useRef(false)
  const draggingElementRef = useRef<'image' | 'text' | null>(null) // 현재 드래그 중인 요소 타입
  const dragStartPosRef = useRef<{ x: number; y: number; boundsWidth?: number; boundsHeight?: number }>({ x: 0, y: 0 })
  
  // 리사이즈 상태 추적 (렌더링 불필요, 이벤트 핸들러에서만 사용)
  const isResizingRef = useRef(false)
  const resizeHandleRef = useRef<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null)
  const resizeStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const isFirstResizeMoveRef = useRef(true)
  
  // Transform 저장 (렌더링 불필요, 편집 로직에서만 사용)
  const originalTransformRef = useRef<{ x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number; baseWidth?: number; baseHeight?: number } | null>(null)
  const originalSpriteTransformRef = useRef<Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>>(new Map()) // 편집 시작 시 원래 Transform 저장
  const originalTextTransformRef = useRef<Map<number, { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; rotation: number }>>(new Map()) // 텍스트 편집 시작 시 원래 Transform 저장
  const isSavingTransformRef = useRef(false) // Transform 저장 중 플래그 (loadAllScenes 재호출 방지)
  const savedSceneIndexRef = useRef<number | null>(null) // 편집 종료 시 씬 인덱스 저장
  
  // 편집 핸들 컨테이너 (렌더링 불필요, PixiJS 객체 참조만)
  const editHandlesRef = useRef<Map<number, PIXI.Container>>(new Map()) // 편집 핸들 컨테이너 (씬별)
  const textEditHandlesRef = useRef<Map<number, PIXI.Container>>(new Map()) // 텍스트 편집 핸들 컨테이너 (씬별)
  const isResizingTextRef = useRef(false) // 텍스트 리사이즈 중 플래그
  
  // 씬 인덱스 추적 (렌더링 불필요, 내부 로직에서만 사용)
  const currentSceneIndexRef = useRef(0)
  const previousSceneIndexRef = useRef<number | null>(null) // useTimelinePlayer와 공유
  const lastRenderedSceneIndexRef = useRef<number | null>(null) // 전환 효과 추적용 (로컬)
  
  // 재생 상태 추적 (렌더링 불필요, 내부 로직에서만 사용)
  const disableAutoTimeUpdateRef = useRef<boolean>(false) // 비디오 재생 중일 때 자동 시간 업데이트 비활성화
  const changedScenesRef = useRef<Set<number>>(new Set()) // 스크립트가 변경된 씬 추적 (재생 시 강제 재생성)
  
  // 함수 참조 (렌더링 불필요, 다른 훅에서 호출용)
  const updateCurrentSceneRef = useRef<(explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, partIndex?: number | null, sceneIndex?: number, overrideTransitionDuration?: number) => void>(() => {})
  
  // Fabric.js refs (렌더링 불필요, Fabric.js 객체 참조만)
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const fabricScaleRatioRef = useRef<number>(1) // Fabric.js 좌표 스케일 비율
  
  // 기타 내부 상태 (렌더링 불필요)
  const clickedOnPixiElementRef = useRef(false) // 빈 공간 클릭 감지를 위한 플래그 (스프라이트/텍스트/핸들 클릭 여부 추적)
  const isManualSceneSelectRef = useRef(false) // 수동 씬 선택 중 플래그 (handleScenePartSelect에서 사용)
  
  // 진행 중인 애니메이션 추적 (렌더링 불필요, 애니메이션 제어용)
  const activeAnimationsRef = useRef<Map<number, gsap.core.Timeline>>(new Map())
  
  // selectScene 함수를 나중에 연결하기 위한 ref
  const selectSceneRef = useRef<((index: number, skipStopPlaying?: boolean, onTransitionComplete?: () => void) => void) | null>(null)
  
  // playTimeoutRef는 내부에서 생성 (씬 네비게이션 전용)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // isPlaying 상태와 ref 동기화
  const isPlayingRef = useRef(false)
  
  // ============================================
  // State: UI 렌더링에 필요한 값들
  // ============================================
  
  // 패널 및 UI 상태 (조건부 렌더링에 사용)
  const [rightPanelTab, setRightPanelTab] = useState('animation')
  const [showGrid, setShowGrid] = useState(false) // 격자 표시 여부
  const [mounted, setMounted] = useState(false) // 클라이언트 마운트 상태 (SSR/Hydration mismatch 방지)
  
  // 편집 모드 상태 (UI에 표시됨)
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')
  const editModeRef = useRef(editMode) // 편집 모드 ref (이벤트 핸들러에서 최신 값 접근용)
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null)
  const [selectedElementType, setSelectedElementType] = useState<'image' | 'text' | null>(null)
  
  // editMode 변경 시 ref 업데이트 (이벤트 핸들러에서 최신 값 접근용)
  useEffect(() => {
    editModeRef.current = editMode
  }, [editMode])
  
  // DOM 참조 (렌더링 불필요, DOM 조작용)
  const timelineBarRef = useRef<HTMLDivElement>(null)
  
  // PixiJS/Fabric 준비 상태 (UI에 표시됨)
  const [pixiReady, setPixiReady] = useState(false)
  const [fabricReady, setFabricReady] = useState(false)
  
  // TTS/BGM 상태 (UI 로딩 표시에 사용)
  const [isTtsBootstrapping, setIsTtsBootstrapping] = useState(false) // 첫 씬 TTS 로딩 상태
  const [isPreparing, setIsPreparing] = useState(false) // 모든 TTS 합성 준비 중인지 여부
  
  // 메시지 표시 상태 (UI에 표시됨)
  const [showReadyMessage] = useState(false) // "재생이 가능해요!" 메시지 표시 여부
  const [showVoiceRequiredMessage, setShowVoiceRequiredMessage] = useState(false) // "음성을 먼저 선택해주세요" 메시지 표시 여부
  const [scenesWithoutVoice, setScenesWithoutVoice] = useState<number[]>([]) // 목소리가 선택되지 않은 씬 번호 목록
  
  // 사운드 효과 상태 (UI에 표시됨)
  const [soundEffect, setSoundEffect] = useState<string | null>(null)
  const [confirmedSoundEffect, setConfirmedSoundEffect] = useState<string | null>(null)
  
  // 선택된 구간 상태 (UI에 표시됨)
  const [selectedPart, setSelectedPartState] = useState<{ sceneIndex: number; partIndex: number } | null>(null)
  const selectedPartRef = useRef<{ sceneIndex: number; partIndex: number } | null>(null) // 선택된 구간 ref (이벤트 핸들러에서 최신 값 접근용)
  
  // setSelectedPart를 래핑하여 selectedPartRef도 함께 업데이트 (이벤트 핸들러에서 최신 값 접근용)
  const setSelectedPart = useCallback((part: { sceneIndex: number; partIndex: number } | null) => {
    selectedPartRef.current = part
    setSelectedPartState(part)
  }, [])
  
  // 클라이언트에서만 렌더링 (SSR/Hydration mismatch 방지)
  useEffect(() => {
    setMounted(true)
  }, [])

  return {
    // Router
    router,
    
    // Zustand store values
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
    voiceTemplate,
    setBgmTemplate,
    selectedProducts,
    videoTitle,
    videoDescription,
    theme,
    
    // Refs
    timelineRef,
    voiceTemplateRef,
    // fullPlaybackRef, // 레거시 제거
    // groupPlaybackRef, // 레거시 제거
    pixiContainerRef,
    appRef,
    containerRef,
    texturesRef,
    spritesRef,
    textsRef,
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
    isSavingTransformRef,
    savedSceneIndexRef,
    editHandlesRef,
    textEditHandlesRef,
    isResizingTextRef,
    currentSceneIndexRef,
    previousSceneIndexRef,
    lastRenderedSceneIndexRef,
    disableAutoTimeUpdateRef,
    changedScenesRef,
    updateCurrentSceneRef,
    fabricCanvasRef,
    fabricCanvasElementRef,
    fabricScaleRatioRef,
    clickedOnPixiElementRef,
    isManualSceneSelectRef,
    activeAnimationsRef,
    selectSceneRef,
    playTimeoutRef,
    isPlayingRef,
    editModeRef,
    selectedPartRef,
    timelineBarRef,
    
    // State
    rightPanelTab,
    setRightPanelTab,
    showGrid,
    setShowGrid,
    mounted,
    editMode,
    setEditMode,
    selectedElementIndex,
    setSelectedElementIndex,
    selectedElementType,
    setSelectedElementType,
    pixiReady,
    setPixiReady,
    fabricReady,
    setFabricReady,
    isTtsBootstrapping,
    setIsTtsBootstrapping,
    isPreparing,
    setIsPreparing,
    showReadyMessage,
    showVoiceRequiredMessage,
    setShowVoiceRequiredMessage,
    scenesWithoutVoice,
    setScenesWithoutVoice,
    soundEffect,
    setSoundEffect,
    confirmedSoundEffect,
    setConfirmedSoundEffect,
    selectedPart,
    setSelectedPart,
  }
}
