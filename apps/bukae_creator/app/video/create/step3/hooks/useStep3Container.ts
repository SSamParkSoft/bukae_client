'use client'

import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import { useSceneHandlers } from '@/hooks/video/scene/useSceneHandlers'
import { calculateSceneIndexFromTime, getSceneStartTime } from '@/utils/timeline'
import { calculateSceneFromTime } from '@/utils/timeline-render'
import { usePixiFabric } from '@/hooks/video/pixi/usePixiFabric'
import { usePixiEffects } from '@/hooks/video/effects/usePixiEffects'
import { useSceneManager } from '@/hooks/video/scene/useSceneManager'
import { usePixiEditor } from '@/hooks/video/editing/usePixiEditor'
import { useSceneNavigation } from '@/hooks/video/scene/useSceneNavigation'
import { useTimelineInitializer } from '@/hooks/video/timeline/useTimelineInitializer'
import { useGridManager } from '@/hooks/video/canvas/useGridManager'
import { useCanvasSize } from '@/hooks/video/canvas/useCanvasSize'
import { useFontLoader } from '@/hooks/video/canvas/useFontLoader'
import { useBgmManager } from '@/hooks/video/audio/useBgmManager'
import { useTimelineInteraction } from '@/hooks/video/timeline/useTimelineInteraction'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { useSceneEditHandlers as useSceneEditHandlersFromVideo } from '@/hooks/video/scene/useSceneEditHandlers'
import { useVideoExport } from '@/hooks/video/export/useVideoExport'
import { loadPixiTexture } from '@/utils/pixi'
import { useTtsManager } from './useTtsManager'
// PHASE0: Transport 및 TtsTrack 통합
import { useTransport } from '@/hooks/video/transport/useTransport'
import { useTtsTrack } from '@/hooks/video/audio/useTtsTrack'
import { useTransportRenderer } from '@/hooks/video/renderer/useTransportRenderer'
import { calculateTotalDuration } from '@/utils/timeline'
import { useFabricHandlers } from '@/hooks/video/editing/useFabricHandlers'
import { transitionLabels, transitions, movements, allTransitions } from '@/lib/data/transitions'
import { useVideoCreateAuth } from '@/hooks/auth/useVideoCreateAuth'
import { getScenePlaceholder } from '@/lib/utils/placeholder-image'
import { useStep3State } from './state'
import { usePlaybackHandlers } from './playback'
import { useSceneEditHandlers } from './editing'
import { usePixiRenderHandlers } from './rendering'
// [강화] 리소스 모니터링 및 상태 동기화 검증 (비활성화됨)
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'

export function useStep3Container() {
  const sceneStructureStore = useSceneStructureStore()
  
  // 상태 관리 훅 (모든 refs와 state)
  const step3State = useStep3State()
  const {
    router,
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
    timelineBarRef,
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
    // setIsTtsBootstrapping, // 사용하지 않음
    isPreparing,
    // setIsPreparing, // 사용하지 않음
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
  } = step3State

  // PixiJS 편집 모드일 때는 Fabric.js 편집 비활성화
  const useFabricEditing = false // PixiJS 편집 사용

  // 토큰 검증
  useVideoCreateAuth()


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
    // timeline이나 scenes가 아직 준비되지 않은 경우에도 안전하게 처리
    timelineScenesLength: timeline?.scenes?.length ?? 0,
  })

  // activeAnimationsRef는 useStep3State에서 가져옴

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
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, editMode, useFabricEditing])

  // 텍스처 로드 래퍼 (texturesRef 사용)
  const loadPixiTextureWithCache = (url: string): Promise<PIXI.Texture> => {
    return loadPixiTexture(url, texturesRef.current)
  }

  // isPlayingRef는 useStep3State에서 가져옴

  // 편집 핸들러 hook (먼저 선언하여 콜백에서 사용 가능하도록)
  const {
    drawEditHandles,
    saveImageTransform,
    handleResize,
    setupSpriteDrag,
    saveTextTransform,
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

  // PixiJS 렌더링 핸들러 훅
  const { handleAnimationComplete, handleLoadComplete } = usePixiRenderHandlers({
    spritesRef,
    textsRef,
    editHandlesRef,
    textEditHandlesRef,
    editModeRef,
    setupSpriteDrag,
    setupTextDrag,
    drawEditHandles,
    drawTextEditHandles,
    handleResize,
    saveImageTransform,
    handleTextResize,
    saveTextTransform,
  })

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

  // 씬 관리 hook
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
  const loadAllScenesStable = useMemo(() => loadAllScenes || (async () => {}), [loadAllScenes])
  
  // updateCurrentScene을 ref로 감싸서 안정적인 참조 유지
  updateCurrentSceneRef.current = updateCurrentScene

  // selectSceneRef는 useStep3State에서 가져옴

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
    useFabricEditing,
  })


  // timeline의 scenes 배열 길이나 구조가 변경될 때만 loadAllScenes 호출
  const timelineScenesLengthRef = useRef<number>(0)
  const timelineScenesRef = useRef<TimelineScene[]>([])
  const loadAllScenesCompletedRef = useRef<boolean>(false) // loadAllScenes 완료 여부 추적

  // scenes의 실제 변경사항만 감지하는 key 생성 (timeline 객체 참조 변경 무시)
  const timelineScenesKey = useMemo(() => {
    if (!timeline || !timeline.scenes || timeline.scenes.length === 0) return ''
    return timeline.scenes.map(s => 
      `${s.sceneId}-${s.image}-${s.text?.content || ''}-${s.duration}-${s.transition || 'none'}`
    ).join('|')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline?.scenes])

  // Pixi와 타임라인이 모두 준비되면 씬 로드
  useEffect(() => {
    const currentTimeline = timelineRef.current
    if (!pixiReady || !appRef.current || !containerRef.current || !currentTimeline || currentTimeline.scenes.length === 0 || !loadAllScenesStable) {
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
    const scenesLength = currentTimeline.scenes.length
    const scenesChanged = timelineScenesLengthRef.current !== scenesLength || 
      currentTimeline.scenes.some((scene, i) => {
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
    timelineScenesRef.current = currentTimeline.scenes.map(scene => ({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixiReady, timelineScenesKey, loadAllScenesStable])

  // Fabric 씬 동기화
  useEffect(() => {
    const currentTimeline = timelineRef.current
    if (!fabricReady || !currentTimeline || currentTimeline.scenes.length === 0) return
    syncFabricWithScene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, timelineScenesKey, editMode, syncFabricWithScene])
  
  // timeline 변경 시 저장된 씬 인덱스 복원 (더 이상 필요 없음 - 편집 종료 버튼에서 직접 처리)

  // buildSceneMarkupWithTimeline을 먼저 선언
  const buildSceneMarkupWithTimeline = useCallback(
    (timelineParam: TimelineData | null, sceneIndex: number) => buildSceneMarkup(timelineParam, sceneIndex),
    []
  )

  // TTS 캐시 ref를 먼저 생성 (useTransport와 useTtsManager에서 공유)
  const ttsCacheRefShared = useRef(
    new Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>()
  )

  // PHASE0: Transport 및 TtsTrack 통합
  const transport = useTransport()
  
  // 클라이언트에서만 audioContext 가져오기 (서버에서는 undefined)
  const audioContext = typeof window !== 'undefined' && transport.transport 
    ? transport.getAudioContext() 
    : undefined
  
  // Transport를 ref로 저장하여 안정적인 참조 유지
  const transportRef = useRef(transport)
  useEffect(() => {
    transportRef.current = transport
  }, [transport])
  
  // TTS 세그먼트 종료 콜백 (renderAtRef가 설정된 후 업데이트됨)
  const onSegmentEndRef = useRef<((segmentEndTime: number, sceneIndex: number) => void) | null>(null)
  // TTS 세그먼트 시작 콜백 (renderAtRef가 설정된 후 업데이트됨)
  const onSegmentStartRef = useRef<((segmentStartTime: number, sceneIndex: number) => void) | null>(null)
  
  const ttsTrack = useTtsTrack({
    timeline,
    voiceTemplate,
    ttsCacheRef: ttsCacheRefShared,
    audioContext: audioContext as AudioContext | undefined,
    transportTime: transport.currentTime,
    buildSceneMarkup: buildSceneMarkupWithTimeline,
    makeTtsKey,
    // TTS 세그먼트 시작 시 즉시 렌더링 업데이트 (TTS와 씬 전환 동기화)
    onSegmentStart: useCallback((segmentStartTime: number, sceneIndex: number) => {
      const callback = onSegmentStartRef.current
      if (callback) {
        callback(segmentStartTime, sceneIndex)
      }
    }, []),
    // TTS 세그먼트 종료 시 즉시 렌더링 업데이트 (실제로는 호출하지 않음 - Transport 렌더링 루프에 맡김)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSegmentEnd: useCallback((_segmentEndTime: number, _sceneIndex: number) => {
      const callback = onSegmentEndRef.current
      if (callback) {
        // 매개변수는 타입 호환성을 위해 전달하지만 실제로는 사용하지 않음
        callback(_segmentEndTime, _sceneIndex)
      }
    }, []),
  })

  // totalDuration 계산 (Transport에 설정)
  const calculatedTotalDuration = useMemo(() => {
    if (!timeline) return 0
    return calculateTotalDuration(timeline, {
      ttsCacheRef: ttsCacheRefShared,
      voiceTemplate,
      buildSceneMarkup: buildSceneMarkupWithTimeline,
      makeTtsKey,
    })
  }, [timeline, voiceTemplate, buildSceneMarkupWithTimeline])

  // Transport에 totalDuration 설정
  useEffect(() => {
    transport.setTotalDuration(calculatedTotalDuration)
  }, [transport, calculatedTotalDuration])

  // PHASE0: Transport 기반 렌더링 시스템
  const transportRenderer = useTransportRenderer({
    transport: transport.transport,
    timeline,
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    previousSceneIndexRef,
    activeAnimationsRef,
    stageDimensions,
    ttsCacheRef: ttsCacheRefShared,
    voiceTemplate,
    buildSceneMarkup: buildSceneMarkupWithTimeline,
    makeTtsKey,
    getActiveSegment: ttsTrack.getActiveSegment, // TTS 세그먼트 전환 감지용
    loadPixiTextureWithCache,
    applyEnterEffect,
    onSceneLoadComplete: handleLoadComplete,
  })

  // renderAt ref (Transport 렌더러에서 설정됨)
  const renderAtRef = useRef<((tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => void) | undefined>(undefined)
  
  // TTS duration 변경 시 렌더링 즉시 업데이트를 위한 콜백 ref
  const onDurationChangeRef = useRef<((sceneIndex: number, durationSec: number) => void) | undefined>(undefined)

  // Transport 기반 재생 상태 (초기 선언만, 실제 구현은 useTtsManager 이후)
  const isPlaying = transport.isPlaying
  const currentTime = transport.currentTime
  const setCurrentTime = ((time: number | ((prev: number) => number)) => {
    const targetTime = typeof time === 'function' ? time(transport.currentTime) : time
    const wasPlaying = transport.isPlaying
    transport.seek(targetTime)
    // TtsTrack도 seek (재생 중일 때만, 클라이언트에서만)
    // 재생 중이 아닐 때는 TTS 재생하지 않음 (씬 클릭 시 음성 재생 방지)
    if (wasPlaying && typeof window !== 'undefined' && transport.transport && audioContext) {
      const audioCtxTime = audioContext.currentTime
      ttsTrack.playFrom(targetTime, audioCtxTime)
    } else {
      // 재생 중이 아닐 때는 TTS 정지 (씬 클릭 시 음성 재생 방지)
      if (typeof window !== 'undefined') {
        ttsTrack.stopAll()
      }
    }
    // 시각적 렌더링 업데이트
    if (renderAtRef.current) {
      renderAtRef.current(targetTime, { skipAnimation: true })
    }
  }) as React.Dispatch<React.SetStateAction<number>>
  
  // Transport 렌더러는 내부에서 currentTime 구독 및 자동 렌더링 처리
  // 외부에서는 setIsPlaying/setCurrentTime에서만 renderAt 호출
  const progressRatio = calculatedTotalDuration > 0 ? transport.currentTime / calculatedTotalDuration : 0
  const playbackSpeed = transport.playbackRate
  const setPlaybackSpeed = transport.setRate
  const totalDuration = calculatedTotalDuration
  // currentSceneIndex를 상태로 관리하여 씬 카드 클릭 시 수동 선택을 추적
  // 재생 중일 때는 계산된 값을 사용, 재생 중이 아닐 때는 수동 선택을 우선
  const [manualSceneIndex, setManualSceneIndex] = useState<number | null>(null)
  // 렌더링과 동일한 조건 사용: segmentChanged 감지 (TTS 파일 전환 시 즉시 업데이트)
  // getActiveSegment를 사용해서 실제 TTS 파일 전환 시 하이라이트도 즉시 업데이트
  const calculatedSceneIndex = timeline && ttsTrack.getActiveSegment
    ? (() => {
        // TTS 세그먼트에서 씬 인덱스 가져오기 (TTS 파일 전환 시 즉시 반영)
        const activeSegment = ttsTrack.getActiveSegment(transport.currentTime)
        if (activeSegment && activeSegment.segment.sceneIndex !== undefined) {
          return activeSegment.segment.sceneIndex
        }
        // fallback: calculateSceneFromTime 사용
        if (renderAtRef.current) {
          const calculated = calculateSceneFromTime(
            timeline,
            transport.currentTime,
            {
              ttsCacheRef: ttsCacheRefShared,
              voiceTemplate,
              buildSceneMarkup: buildSceneMarkupWithTimeline,
              makeTtsKey,
            }
          )
          return calculated.sceneIndex
        }
        return calculateSceneIndexFromTime(timeline, transport.currentTime)
      })()
    : (timeline ? calculateSceneIndexFromTime(timeline, transport.currentTime) : 0)
  // 재생 중일 때는 계산된 값 사용, 재생 중이 아닐 때는 수동 선택 우선
  const currentSceneIndex = isPlaying 
    ? calculatedSceneIndex 
    : (manualSceneIndex !== null ? manualSceneIndex : calculatedSceneIndex)
  const setCurrentSceneIndex = (index: number) => { 
    currentSceneIndexRef.current = index
    setManualSceneIndex(index) // 수동 선택 상태 업데이트
    // Transport seek도 함께 수행 (해당 씬의 시작 시간으로)
    if (timeline) {
      const sceneStartTime = getSceneStartTime(timeline, index)
      transport.seek(sceneStartTime)
    }
  }
  
  // 재생 중일 때는 계산된 값으로 currentSceneIndexRef 동기화
  useEffect(() => {
    if (isPlaying && calculatedSceneIndex !== currentSceneIndexRef.current) {
      currentSceneIndexRef.current = calculatedSceneIndex
    }
  }, [isPlaying, calculatedSceneIndex])
  // TTS 관리
  // ttsCacheRefShared를 useTtsManager와 공유하여 동기화 보장
  const {
    ttsCacheRef,
    // stopScenePreviewAudio, // 사용하지 않음
    ensureSceneTts,
    invalidateSceneTtsCache,
  } = useTtsManager({
    timeline,
    voiceTemplate,
    setTimeline,
    isPlaying,
    setCurrentTime,
    changedScenesRef,
    onDurationChange: (sceneIndex, durationSec) => {
      // ref를 통해 최신 콜백 호출
      onDurationChangeRef.current?.(sceneIndex, durationSec)
    },
  })
  
  // TTS duration 변경 시 렌더링 즉시 업데이트를 위한 콜백 (useTtsManager 호출 이후에 정의)
  const handleDurationChange = useCallback((sceneIndex: number, durationSec: number) => {
    // TTS duration이 변경되면 ttsCacheRefShared를 먼저 동기화한 후 렌더링
    // useTtsManager의 ttsCacheRef가 업데이트되었으므로 ttsCacheRefShared에도 반영
    if (ttsCacheRef && ttsCacheRefShared) {
      // 최신 캐시를 ttsCacheRefShared에 동기화
      ttsCacheRef.current.forEach((value, key) => {
        if (!ttsCacheRefShared.current.has(key) || 
            ttsCacheRefShared.current.get(key)?.durationSec !== value.durationSec) {
          ttsCacheRefShared.current.set(key, value)
        }
      })
    }
    
    // 렌더링 캐시 리셋 (TTS duration 변경으로 인한 씬 경계 변경을 감지하기 위해)
    // 이렇게 하면 다음 renderAt 호출 시 중복 체크를 우회하여 강제 렌더링됨
    if (transportRendererRef.current?.resetRenderCache) {
      transportRendererRef.current.resetRenderCache()
    }
    
    // 캐시 동기화 및 캐시 리셋 후 현재 재생 시간에서 렌더링을 즉시 수행
    if (renderAtRef.current && transport) {
      const currentTime = transport.currentTime
      // 즉시 렌더링 (캐시 리셋으로 인해 중복 체크를 우회하여 TTS duration 변경 시 즉시 반영)
      renderAtRef.current(currentTime, { skipAnimation: false })
    }
  }, [transport, ttsCacheRef, ttsCacheRefShared])
  
  // handleDurationChange를 ref에 저장하여 useTtsManager에서 사용 가능하도록
  useEffect(() => {
    onDurationChangeRef.current = handleDurationChange
  }, [handleDurationChange])

  // TTS 캐시 동기화: useTtsManager의 ttsCacheRef를 ttsCacheRefShared에 동기화
  // useTtsManager가 내부에서 생성한 ttsCacheRef를 ttsCacheRefShared로 교체
  // 폴링 방식 제거: TTS 파일 생성 완료 시점에만 refreshSegments 호출
  // 주의: 여기서는 동기화만 수행하고 refreshSegments는 호출하지 않음 (무한 루프 방지)
  // ref는 변경을 감지할 수 없으므로, 주기적으로 체크하거나 setIsPlaying에서만 동기화
  // useEffect는 제거하고 setIsPlaying에서만 동기화하도록 변경

  // setIsPlaying 구현 (useTtsManager 이후에 선언하여 ensureSceneTts 사용 가능)
  const setIsPlaying = async (playing: boolean) => { 
    if (playing) {
      // 재생 시작 전에 모든 씬의 TTS 파일이 있는지 확인하고 없으면 생성
      if (timeline && voiceTemplate) {
        const scenesToLoad: number[] = []
        for (let sceneIndex = 0; sceneIndex < timeline.scenes.length; sceneIndex++) {
          const scene = timeline.scenes[sceneIndex]
          const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
          if (!sceneVoiceTemplate) continue
          
          const markups = buildSceneMarkupWithTimeline(timeline, sceneIndex)
          let needsTts = false
          
          for (const markup of markups) {
            if (!markup) continue
            const key = makeTtsKey(sceneVoiceTemplate, markup)
            if (!ttsCacheRefShared.current.has(key)) {
              needsTts = true
              break
            }
          }
          
          if (needsTts) {
            scenesToLoad.push(sceneIndex)
          }
        }
        
          // 필요한 씬들의 TTS 생성 (병렬로 처리하되 동시 요청 수 제한)
          if (scenesToLoad.length > 0) {
            const MAX_CONCURRENT = 3
            for (let i = 0; i < scenesToLoad.length; i += MAX_CONCURRENT) {
              const batch = scenesToLoad.slice(i, i + MAX_CONCURRENT)
              await Promise.all(
                batch.map(async (sceneIndex) => {
                  try {
                    await ensureSceneTts(sceneIndex)
                    // 각 씬의 TTS 생성 완료 후 즉시 캐시 동기화
                    if (ttsCacheRef && ttsCacheRefShared) {
                      // 해당 씬의 모든 키를 찾아서 동기화
                      const scene = timeline.scenes[sceneIndex]
                      if (scene) {
                        const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
                        const markups = buildSceneMarkupWithTimeline(timeline, sceneIndex)
                        markups.forEach((markup) => {
                          if (!markup) return
                          const key = makeTtsKey(sceneVoiceTemplate, markup)
                          const cached = ttsCacheRef.current.get(key)
                          if (cached) {
                            ttsCacheRefShared.current.set(key, cached)
                          }
                        })
                      }
                    }
                  } catch  {
                    // TTS 생성 실패 (로그 제거)
                  }
                })
              )
            }
            
            // TTS 파일 생성 완료 후 전체 캐시 동기화 (중요!)
            // useTtsManager의 ttsCacheRef를 ttsCacheRefShared에 동기화
            if (ttsCacheRef && ttsCacheRefShared) {
              ttsCacheRefShared.current.clear()
              ttsCacheRef.current.forEach((value, key) => {
                ttsCacheRefShared.current.set(key, value)
              })
              
              // 디버깅: 캐시 동기화 확인
              console.log('[useStep3Container] TTS 캐시 동기화 완료', {
                sourceCacheSize: ttsCacheRef.current.size,
                sharedCacheSize: ttsCacheRefShared.current.size,
                sampleKeys: Array.from(ttsCacheRefShared.current.keys()).slice(0, 3),
                sampleValues: Array.from(ttsCacheRefShared.current.values()).slice(0, 3).map(v => ({
                  hasUrl: !!v.url,
                  url: v.url,
                  durationSec: v.durationSec,
                })),
              })
            }
          
          // TTS 파일 생성 완료 후 세그먼트 강제 업데이트 (폴링 방식 제거)
          // refreshSegments를 호출하여 segments를 재계산하고 preload 실행
          // refreshSegments가 Promise를 반환하므로 segments 업데이트 및 preload 완료를 기다림
          if (typeof window !== 'undefined' && ttsTrack.refreshSegments) {
            await ttsTrack.refreshSegments()
          }
        }
      }
      
      const currentT = transport.currentTime
      transport.play()
      // TtsTrack 재생 시작 (클라이언트에서만)
      // preload가 완료된 후에 호출되므로 버퍼가 로드되어 있음
      if (typeof window !== 'undefined' && transport.transport && audioContext) {
        const audioCtxTime = audioContext.currentTime
        ttsTrack.playFrom(currentT, audioCtxTime)
      }
      // 시각적 렌더링 업데이트 (현재 위치에서 재생 시작)
      if (renderAtRef.current) {
        renderAtRef.current(currentT, { skipAnimation: false })
      }
    } else {
      // 일시정지 전에 현재 시간을 먼저 가져옴 (pause()가 timelineOffsetSec를 업데이트하기 전)
      const currentT = transport.getTime()
      transport.pause()
      ttsTrack.stopAll()
      // 시각적 렌더링 업데이트 (현재 위치에서 일시정지)
      // skipAnimation=true로 설정하여 애니메이션 없이 즉시 렌더링
      if (renderAtRef.current) {
        renderAtRef.current(currentT, { skipAnimation: true })
      }
    }
  }

  // BGM 관리
  const {
    confirmedBgmTemplate,
    isBgmBootstrapping,
    // stopBgmAudio, // 사용하지 않음
    // startBgmAudio, // 사용하지 않음
    handleBgmConfirm,
  } = useBgmManager({
    bgmTemplate,
    playbackSpeed,
    isPlaying,
  })

  // 효과음 확정 핸들러
  const handleSoundEffectConfirm = useCallback((effectId: string | null) => {
    setConfirmedSoundEffect(effectId)
  }, [setConfirmedSoundEffect])

  // TTS 유틸리티 함수들 (lib/utils/tts.ts에서 import)
  // buildSceneMarkup과 makeTtsKey는 유틸리티 함수로 직접 사용
  // 다른 hook에 전달하기 위한 래퍼 함수
  // buildSceneMarkup은 timeline.scenes의 text.content와 scenes.length만 사용하므로 최적화
  const scenesTextContents = useMemo(() => {
    if (!timeline || !timeline.scenes) return []
    return timeline.scenes.map(s => s.text?.content || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline?.scenes])
  
  const scenesTextContentKey = useMemo(() => {
    return scenesTextContents.join('|||') + `|length:${scenesTextContents.length}`
  }, [scenesTextContents])
  
  const buildSceneMarkupWrapper = useCallback(
    (sceneIndex: number) => buildSceneMarkup(timelineRef.current, sceneIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenesTextContentKey]
  )

  // 타임라인 인터랙션
  const { handleTimelineMouseDown } = useTimelineInteraction({
    timeline,
    timelineBarRef,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setCurrentSceneIndex,
    updateCurrentScene,
    lastRenderedSceneIndexRef,
    previousSceneIndexRef,
    ttsCacheRef: ttsCacheRefShared,
    buildSceneMarkup: buildSceneMarkupWithTimeline,
    makeTtsKey: makeTtsKey,
    voiceTemplate: voiceTemplate,
  })
  
  // useSceneManager를 setCurrentSceneIndex와 함께 다시 생성
  // PHASE0: renderAt(t) 패턴을 위한 추가 파라미터들 (타입 호환을 위해 타입 단언 사용)
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
    // PHASE0: renderAt(t) 패턴을 위한 파라미터들
    ttsCacheRef: ttsCacheRefShared,
    voiceTemplate,
    buildSceneMarkup: buildSceneMarkupWrapper,
    makeTtsKey,
  } as Parameters<typeof useSceneManager>[0] & {
    ttsCacheRef?: typeof ttsCacheRefShared
    voiceTemplate?: string | null
    buildSceneMarkup?: (sceneIndex: number) => string[]
    makeTtsKey?: (voice: string, markup: string) => string
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
  
  // transportRenderer를 ref로 저장하여 안정적인 참조 유지
  const transportRendererRef = useRef(transportRenderer)
  useEffect(() => {
    transportRendererRef.current = transportRenderer
  }, [transportRenderer])
  
  // 씬별 실제 재생 시간 추적 (씬 전환 시 actualPlaybackDuration 업데이트)
  const sceneStartTimesRef = useRef<Map<number, number>>(new Map())
  const lastSceneIndexRef = useRef<number>(-1)
  
  // renderAt을 ref로 저장하여 setIsPlaying/setCurrentTime에서 사용 가능하도록
  useEffect(() => {
    const currentRenderer = transportRendererRef.current
    if (currentRenderer?.renderAt) {
      // renderAt을 래핑하여 씬 전환 시 실제 재생 시간 업데이트
      const originalRenderAt = currentRenderer.renderAt
      renderAtRef.current = (tSec: number, options?: { skipAnimation?: boolean; forceSceneIndex?: number }) => {
        // 원본 renderAt 호출
        originalRenderAt(tSec, options)
        
        // 성능 최적화: actualPlaybackDuration 업데이트는 씬 전환 시에만 비동기로 실행
        // requestAnimationFrame 핸들러 내부에서 무거운 계산과 setTimeline 호출 방지
        if (timeline && !options?.skipAnimation) {
          // setTimeout으로 지연시켜 requestAnimationFrame 핸들러 블로킹 방지
          setTimeout(() => {
            const currentSceneIndex = lastSceneIndexRef.current
            const previousSceneIndex = sceneStartTimesRef.current.size > 0 
              ? Array.from(sceneStartTimesRef.current.keys()).pop() ?? -1 
              : -1
            
            // 씬이 변경되었을 때만 actualPlaybackDuration 업데이트
            if (previousSceneIndex >= 0 && previousSceneIndex !== currentSceneIndex && previousSceneIndex < timeline.scenes.length) {
              // 이전 씬의 시작 시간 계산 (캐시 사용)
              let previousSceneStartTime = sceneStartTimesRef.current.get(previousSceneIndex)
              if (previousSceneStartTime === undefined) {
                previousSceneStartTime = 0
                for (let i = 0; i < previousSceneIndex; i++) {
                  const prevScene = timeline.scenes[i]
                  if (prevScene) {
                    const prevDuration = prevScene.actualPlaybackDuration && prevScene.actualPlaybackDuration > 0
                      ? prevScene.actualPlaybackDuration
                      : prevScene.duration || 0
                    previousSceneStartTime += prevDuration
                  }
                }
                sceneStartTimesRef.current.set(previousSceneIndex, previousSceneStartTime)
              }
              
              const previousSceneActualDuration = tSec - previousSceneStartTime
              if (previousSceneActualDuration > 0 && previousSceneActualDuration < 1000) {
                const previousScene = timeline.scenes[previousSceneIndex]
                const currentActualDuration = previousScene?.actualPlaybackDuration ?? 0
                
                if (Math.abs(previousSceneActualDuration - currentActualDuration) >= 0.1) {
                  const updatedScenes = timeline.scenes.map((scene, idx) =>
                    idx === previousSceneIndex
                      ? { ...scene, actualPlaybackDuration: previousSceneActualDuration }
                      : scene
                  )
                  setTimeline({
                    ...timeline,
                    scenes: updatedScenes,
                  })
                }
              }
            }
          }, 0) // 다음 이벤트 루프에서 실행
        }
      }
      
      // renderAt이 설정된 후 세그먼트 시작 콜백 업데이트 (TTS와 씬 전환 동기화)
      onSegmentStartRef.current = (segmentStartTime: number, sceneIndex: number) => {
        // 성능 최적화: console.log 제거 (과도한 로그가 성능 저하 유발)
        // const currentTransport = transportRef.current
        // const currentTransportTime = currentTransport.currentTime
        // console.log('[useStep3Container] TTS 세그먼트 시작 감지', {
        //   segmentStartTime,
        //   sceneIndex,
        //   currentTransportTime,
        //   timeDiff: segmentStartTime - currentTransportTime,
        // })
        
        if (renderAtRef.current) {
          // 세그먼트 시작 시간과 씬 인덱스를 직접 사용하여 정확한 동기화 보장
          // forceSceneIndex를 사용하여 calculateSceneFromTime의 계산 오류 방지
          // console.log('[useStep3Container] renderAt 호출 (세그먼트 시작)', { segmentStartTime, sceneIndex, currentTransportTime })
          renderAtRef.current(segmentStartTime, { skipAnimation: false, forceSceneIndex: sceneIndex })
        }
      }
      
      // renderAt이 설정된 후 세그먼트 종료 콜백 업데이트
      // TTS 세그먼트 종료 시 정확한 씬 전환 보장
      onSegmentEndRef.current = (segmentEndTime: number, sceneIndex: number) => {
        if (!renderAtRef.current || !timeline) {
          return
        }
        
        // 세그먼트 종료 시점에 정확한 씬 전환 보장
        // segmentEndTime은 현재 씬의 종료 시간이므로, 다음 씬으로 전환해야 함
        const nextSceneIndex = sceneIndex + 1 < timeline.scenes.length ? sceneIndex + 1 : sceneIndex
        
        // segmentEndTime을 기반으로 정확한 씬을 렌더링
        // forceSceneIndex를 사용하여 calculateSceneFromTime의 계산 오류 방지
        renderAtRef.current(segmentEndTime, { skipAnimation: false, forceSceneIndex: nextSceneIndex })
      }
    }
  }, [timeline, setTimeline, voiceTemplate, buildSceneMarkupWithTimeline, makeTtsKey, ttsCacheRefShared]) // timeline과 setTimeline 추가
  
  // ttsTrack을 ref로 저장하여 안정적인 참조 유지
  const ttsTrackRef = useRef(ttsTrack)
  useEffect(() => {
    ttsTrackRef.current = ttsTrack
  }, [ttsTrack])
  
  // onSegmentStartRef와 onSegmentEndRef가 설정된 후 ttsTrack에 다시 설정
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
    if (currentTtsTrack) {
      if (onSegmentStartRef.current) {
        const startCallback = onSegmentStartRef.current
        currentTtsTrack.setOnSegmentStart((segmentStartTime: number, sceneIndex: number) => {
          startCallback(segmentStartTime, sceneIndex)
        })
        // console.log('[useStep3Container] TTS 세그먼트 시작 콜백 재설정 완료')
      }
      if (onSegmentEndRef.current) {
        const endCallback = onSegmentEndRef.current
        currentTtsTrack.setOnSegmentEnd((segmentEndTime: number, sceneIndex: number) => {
          // 매개변수는 타입 호환성을 위해 전달하지만 실제로는 사용하지 않음
          // 세그먼트 종료는 Transport의 정상적인 렌더링 루프로 처리됨
          endCallback(segmentEndTime, sceneIndex)
        })
        // console.log('[useStep3Container] TTS 세그먼트 종료 콜백 재설정 완료')
      }
    }
  }, []) // 의존성 배열 비움 - ttsTrack과 onSegmentStartRef, onSegmentEndRef는 ref로 접근
  
  // Transport 시간이 변경될 때 자동으로 TtsTrack 재생 업데이트 (재생 중일 때만)
  const lastTtsUpdateTimeRef = useRef<number>(-1)
  useEffect(() => {
    if (!isPlaying || !audioContext || !transport.transport) {
      return
    }
    
    const currentT = transport.currentTime
    // 이전 시간과 비교하여 씬이 변경되었거나 충분히 시간이 지났을 때만 업데이트
    const timeDiff = Math.abs(currentT - lastTtsUpdateTimeRef.current)
    
    // 씬이 변경되었거나 0.1초 이상 지났을 때만 업데이트 (과도한 호출 방지)
    if (timeDiff >= 0.1 || lastTtsUpdateTimeRef.current < 0) {
      const audioCtxTime = audioContext.currentTime
      ttsTrack.playFrom(currentT, audioCtxTime)
      lastTtsUpdateTimeRef.current = currentT
    }
  }, [transport.currentTime, isPlaying, audioContext, ttsTrack])
  
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, updateCurrentScene, renderSceneContentFromManager])
  
  // isPreviewingTransition (Transport에서는 별도 관리 필요)
  const isPreviewingTransition = false
  const setIsPreviewingTransition = () => {}






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

  // playTimeoutRef는 useStep3State에서 가져옴



  // TODO: TTS 미리보기 기능은 TtsTrack 기반으로 재구현 필요
  const handleSceneTtsPreview = useCallback(async () => {
    // Transport 기반 TTS 미리보기 구현 필요
    // TTS 미리보기는 아직 구현되지 않음 (로그 제거)
  }, [])

  // 레거시 재생 시스템 제거 완료 - Transport 기반으로 완전 전환
  // 호환성을 위해 더미 객체 유지 (다른 컴포넌트에서 참조할 수 있음)
  const fullPlayback = {
    ttsCacheRef: ttsCacheRefShared,
  }
  const singleScenePlayback = {}
  const groupPlayback = {
    playingSceneIndex: null as number | null,
    playingGroupSceneId: null as number | null,
  }

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
    isPlaying: isPlaying,
    setIsPlaying: setIsPlaying,
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

  // selectSceneRef 업데이트 (함수 참조 저장)
  selectSceneRef.current = sceneNavigation.selectScene
  
  // isPlaying 상태와 ref 동기화
  isPlayingRef.current = isPlaying
  
  // 비디오 재생 중일 때 자동 시간 업데이트 비활성화
  disableAutoTimeUpdateRef.current = isPlaying

  // 재생 중지 시 timeout 정리
  if (!isPlaying && playTimeoutRef.current) {
    clearTimeout(playTimeoutRef.current)
    playTimeoutRef.current = null
  }

  // 씬 편집 핸들러들
  const {
    handleSceneScriptChange: originalHandleSceneScriptChange,
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

  // 씬 편집 핸들러 훅 (그룹 복사, 삭제, voiceTemplate 변경, 템플릿 리사이즈)
  const {
    handleGroupDuplicate,
    handleGroupDelete,
    handleSceneVoiceTemplateChange,
    handleResizeTemplate,
  } = useSceneEditHandlers({
    timeline,
    scenes,
    setTimeline,
    setScenes,
    timelineRef,
    changedScenesRef,
    invalidateSceneTtsCache,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    stageDimensions,
    loadAllScenes,
    recalculateCanvasSize,
  })

  // 씬 편집 핸들러들 (useSceneEditHandlers는 @/hooks/video/useSceneEditHandlers를 사용)
  const {
    handleSceneScriptChange,
    handleSceneSplit,
    handleSceneDelete,
    handleSceneDuplicate,
    handleSceneReorder: handleSceneReorderFromHook,
  } = useSceneEditHandlersFromVideo({
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
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ttsCacheRef: ttsCacheRefShared,
    ensureSceneTts,
    spritesRef,
    textsRef,
  })

  // 씬 순서 변경 핸들러는 useSceneEditHandlers에서 제공
  const handleSceneReorder = handleSceneReorderFromHook

  // 레거시 ref 제거 - 더 이상 필요 없음
  // fullPlaybackRef.current = fullPlayback
  // groupPlaybackRef.current = groupPlayback

  // 씬 구조 정보 자동 업데이트
  useEffect(() => {
    if (!scenes.length || !timeline) return
    
    sceneStructureStore.updateStructure({
      scenes,
      timeline,
      ttsCacheRef: ttsCacheRefShared,
      voiceTemplate,
      buildSceneMarkup: buildSceneMarkupWithTimeline,
      makeTtsKey,
    })
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, timeline, voiceTemplate])

  // 재생 핸들러 훅 (Transport 기반)
  const playbackHandlers = usePlaybackHandlers({
    timelineRef,
    voiceTemplateRef,
    isPlaying,
    setIsPlaying,
    setShowVoiceRequiredMessage,
    setScenesWithoutVoice,
    setRightPanelTab,
    router,
  })
  
  const {
    handlePlayPause,
    handleGroupPlay,
    handleScenePlay,
  } = playbackHandlers

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
        if (!app.screen || rect.width === 0 || rect.height === 0) return
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
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [selectedElementIndex, selectedElementType, editMode, setEditMode])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // [강화] 리소스 모니터링 및 상태 동기화 검증 (비활성화됨)

  // 편집 모드 변경 시 핸들 표시/숨김
  useEffect(() => {
    const currentTimeline = timelineRef.current
    if (!containerRef.current || !currentTimeline || !pixiReady) return

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
      // selectedElementIndex, selectedElementType은 ref로 접근하거나 직접 체크
      // (의존성 배열에서 제거하여 불필요한 재실행 방지)
      if (selectedElementIndex !== null || selectedElementType !== null) {
        setSelectedElementIndex(null)
        setSelectedElementType(null)
      }
    } else if (editMode === 'image') {
      // 이미지 편집 모드일 때는 이미지 핸들만 표시하고 자막 핸들은 제거
      const currentSceneIndex = currentSceneIndexRef.current
      
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
      const currentSceneIndex = currentSceneIndexRef.current
      
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, pixiReady])

  // 재생 시작 시 편집 모드 해제
  useEffect(() => {
    // isPlaying 사용 (Transport 또는 레거시)
    const playing = isPlaying
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
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, editMode, setEditMode, setSelectedElementIndex, setSelectedElementType])




  // handleExport는 useVideoExport hook에서 제공됨

  // sceneThumbnails 최적화: scenes와 selectedImages의 실제 변경사항만 추적
  const scenesImageUrls = useMemo(() => {
    return scenes.map(s => s.imageUrl || '')
  }, [scenes])
  
  const scenesImageKey = useMemo(() => {
    return scenesImageUrls.join(',') + '|' + selectedImages.join(',')
  }, [scenesImageUrls, selectedImages])
  
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenesImageKey]
  )

  // handlePlayPause, handleGroupPlay, handleScenePlay는 usePlaybackHandlers에서 가져옴
  // handleResizeTemplate은 useSceneEditHandlers에서 가져옴

  // 씬 선택 핸들러
  const handleSceneSelect = useCallback((index: number) => {
    // Transport 기반에서는 재생 중에도 씬 선택 가능 (Transport가 자동으로 처리)
    // 씬 클릭 시 TTS 재생 방지: 재생 중이 아니면 TTS 정지
    if (!isPlaying && typeof window !== 'undefined') {
      ttsTrack.stopAll()
    }
    sceneNavigation.selectScene(index)
  }, [sceneNavigation, isPlaying, ttsTrack])

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
    scenesWithoutVoice,
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
    handleSceneVoiceTemplateChange,
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
    soundEffect,
    setSoundEffect,
    confirmedSoundEffect,
    handleSoundEffectConfirm,
    setTimeline,
    
    // For subtitle underline overlay
    textsRef,
    appRef,
    renderAt: transportRenderer.renderAt,
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    scenesWithoutVoice,
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
    handleSceneVoiceTemplateChange,
    sceneNavigation.selectPart,
    sceneThumbnails,
    fullPlayback,
    singleScenePlayback,
    confirmedBgmTemplate,
    handleBgmConfirm,
    soundEffect,
    setSoundEffect,
    confirmedSoundEffect,
    handleSoundEffectConfirm,
    setTimeline,
    groupPlayback.playingSceneIndex,
    groupPlayback.playingGroupSceneId,
    transportRenderer.renderAt,
  ])
}