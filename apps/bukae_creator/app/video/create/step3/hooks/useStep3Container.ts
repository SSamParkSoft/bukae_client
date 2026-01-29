'use client'

import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { useSceneHandlers } from '@/hooks/video/scene/useSceneHandlers'
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
import { useSoundEffectManager } from '@/hooks/video/audio/useSoundEffectManager'
import { useTimelineInteraction } from '@/hooks/video/timeline/useTimelineInteraction'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { useSceneEditHandlers as useSceneEditHandlersFromVideo } from '@/hooks/video/scene/useSceneEditHandlers'
import { useVideoExport } from '@/hooks/video/export/useVideoExport'
import { loadPixiTexture } from '@/utils/pixi'
import { useTtsManager } from './useTtsManager'
// PHASE0: Transport 및 TtsTrack 통합
import { useTransportRenderer } from '@/hooks/video/renderer/useTransportRenderer'
import { useFabricHandlers } from '@/hooks/video/editing/useFabricHandlers'
import { transitionLabels, transitions, movements, allTransitions } from '@/lib/data/transitions'
import { useVideoCreateAuth } from '@/hooks/auth/useVideoCreateAuth'
import { useStep3State } from './state'
import { usePlaybackHandlers, usePlaybackState, usePlaybackDurationTracker } from './playback'
import { useSceneEditHandlers, useEditModeManager, useEditHandlesManager } from './editing'
import { usePixiRenderHandlers, useSceneContentRenderer } from './rendering'
import { useSceneLoader } from './scene-loading'
import { useTransportTtsIntegration, useTransportTtsSync, useTransportSeek } from './transport'
import { useSceneIndexManager, useSceneThumbnails, useSceneStructureSync } from './scene'
import { useTimelineChangeHandler } from './timeline'
import { useBgmPlayback, useTtsDurationSync } from './audio'
// [강화] 리소스 모니터링 및 상태 동기화 검증 (비활성화됨)
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import type { TtsTrack } from '@/hooks/video/audio/TtsTrack'

export function useStep3Container() {
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
    setIsPreparing, // 전체 재생 시 TTS 생성 로딩 표시용
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

  // 편집 핸들러 함수들을 ref로 저장 (useSceneLoader 호출 전에 선언 필요)
  const drawEditHandlesRef = useRef(drawEditHandles)
  const setupSpriteDragRef = useRef(setupSpriteDrag)
  const handleResizeRef = useRef(handleResize)
  const saveImageTransformRef = useRef(saveImageTransform)
  const drawTextEditHandlesRef = useRef(drawTextEditHandles)
  const setupTextDragRef = useRef(setupTextDrag)
  const handleTextResizeRef = useRef(handleTextResize)
  const saveTextTransformRef = useRef(saveTextTransform)

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
  }, [drawEditHandles, setupSpriteDrag, handleResize, saveImageTransform, drawTextEditHandles, setupTextDrag, handleTextResize, saveTextTransform])

  // 씬 로드 및 동기화 (useSceneLoader 훅 사용 - ref 선언 이후에 호출)
  const { loadAllScenesCompletedRef } = useSceneLoader({
    pixiReady,
    appRef: appRef as React.RefObject<PIXI.Application>,
    containerRef: containerRef as React.RefObject<PIXI.Container>,
    timelineRef,
    loadAllScenesStable,
    isSavingTransformRef,
    isManualSceneSelectRef,
    spritesRef,
    textsRef,
    currentSceneIndexRef,
    editHandlesRef: editHandlesRef as React.MutableRefObject<Map<number, PIXI.Graphics>>,
    textEditHandlesRef: textEditHandlesRef as React.MutableRefObject<Map<number, PIXI.Graphics>>,
    editModeRef,
    drawEditHandlesRef: drawEditHandlesRef as unknown as React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>,
    handleResizeRef: handleResizeRef as unknown as React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>,
    saveImageTransformRef: saveImageTransformRef as unknown as React.MutableRefObject<() => void>,
    setupSpriteDragRef: setupSpriteDragRef as React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number) => void>,
    drawTextEditHandlesRef: drawTextEditHandlesRef as unknown as React.MutableRefObject<(text: PIXI.Text, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>,
    handleTextResizeRef: handleTextResizeRef as unknown as React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>,
    saveTextTransformRef: saveTextTransformRef as unknown as React.MutableRefObject<() => void>,
    setupTextDragRef: setupTextDragRef as React.MutableRefObject<(text: PIXI.Text, sceneIndex: number) => void>,
    isPlayingRef,
    lastRenderedSceneIndexRef: lastRenderedSceneIndexRef as unknown as React.MutableRefObject<number>,
    previousSceneIndexRef: previousSceneIndexRef as unknown as React.MutableRefObject<number>,
    syncFabricWithScene,
    fabricReady,
    editMode,
    timeline,
  })
  
  // timeline 변경 시 저장된 씬 인덱스 복원 (더 이상 필요 없음 - 편집 종료 버튼에서 직접 처리)

  // Transport 및 TTS 통합 관리 (useTransportTtsIntegration 훅 사용)
  const {
    transport,
    ttsTrack,
    audioContext,
    calculatedTotalDuration,
    renderAtRef,
    onDurationChangeRef,
    buildSceneMarkupWrapper: buildSceneMarkupWithTimeline,
    ttsCacheRefShared,
    onSegmentStartRef,
    onSegmentEndRef,
  } = useTransportTtsIntegration({
    timeline,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
  })

  // Transport 기반 재생 상태 (초기 선언만, 실제 구현은 useTtsManager 이후)
  const isPlaying = transport.isPlaying
  const currentTime = transport.currentTime
  
  // 씬 재생 및 그룹 재생 상태 관리
  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null)
  const [playingGroupSceneId, setPlayingGroupSceneId] = useState<number | null>(null)
  
  // PHASE0: Transport 기반 렌더링 시스템 (playingSceneIndex, playingGroupSceneId 선언 이후에 호출)
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
    playingSceneIndex,
    playingGroupSceneId,
    fabricCanvasRef: step3State.fabricCanvasRef,
    fabricScaleRatioRef: step3State.fabricScaleRatioRef,
  })
  const [playbackEndTime, setPlaybackEndTime] = useState<number | null>(null) // 재생 종료 시간
  
  // Transport 렌더러는 내부에서 currentTime 구독 및 자동 렌더링 처리
  // 외부에서는 setIsPlaying/setCurrentTime에서만 renderAt 호출
  const progressRatio = calculatedTotalDuration > 0 ? transport.currentTime / calculatedTotalDuration : 0
  const playbackSpeed = transport.playbackRate
  const setPlaybackSpeed = transport.setRate
  const totalDuration = calculatedTotalDuration
  
  // BGM 관리 (setCurrentTime 이전에 선언하여 seekBgmAudio 사용 가능하도록)
  const {
    confirmedBgmTemplate,
    isBgmBootstrapping,
    bgmAudioRef,
    stopBgmAudio,
    pauseBgmAudio,
    resumeBgmAudio,
    startBgmAudio,
    seekBgmAudio,
    handleBgmConfirm,
  } = useBgmManager({
    bgmTemplate,
    playbackSpeed,
    isPlaying,
  })
  
  // Transport Seek 로직
  const setCurrentTime = useTransportSeek({
    transport,
    ttsTrack,
    audioContext,
    confirmedBgmTemplate,
    seekBgmAudio,
    renderAtRef,
  })
  
  // 씬 인덱스 계산 및 관리 (useSceneIndexManager 훅 사용)
  const {
    currentSceneIndex,
    setCurrentSceneIndex,
  } = useSceneIndexManager({
    timeline,
    ttsTrack,
    transport,
    isPlaying,
    renderAtRef,
    ttsCacheRefShared,
    voiceTemplate,
    buildSceneMarkupWithTimeline,
    makeTtsKey,
    currentSceneIndexRef,
  })
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
  
  // BGM 재생 관리
  useBgmPlayback({
    isPlaying,
    confirmedBgmTemplate,
    playbackSpeed,
    transport,
    bgmAudioRef,
    startBgmAudio,
    pauseBgmAudio,
    resumeBgmAudio,
    stopBgmAudio,
  })

  // 효과음 확정 핸들러
  const handleSoundEffectConfirm = useCallback((effectId: string | null) => {
    setConfirmedSoundEffect(effectId)
  }, [setConfirmedSoundEffect])

  // 효과음 관리 (세그먼트 전환 시점에 재생)
  useSoundEffectManager({
    timeline,
    isPlaying,
    currentTime: transport.currentTime,
    ttsCacheRef: ttsCacheRefShared,
    voiceTemplate,
    buildSceneMarkup: buildSceneMarkupWithTimeline,
    makeTtsKey,
    getActiveSegment: ttsTrack.getActiveSegment,
  })

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

  // 타임라인 인터랙션은 setIsPlaying이 선언된 후에 호출됨 (아래에서 호출)
  
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
  
  // 씬 재생 시간 추적
  const { sceneStartTimesRef, lastSceneIndexRef } = usePlaybackDurationTracker({
    timeline,
    setTimeline,
    renderAtRef,
    transportRendererRef,
  })
  
  // TTS duration 동기화 (transportRendererRef 선언 이후에 호출)
  useTtsDurationSync({
    transport,
    ttsCacheRef,
    ttsCacheRefShared,
    transportRendererRef,
    renderAtRef,
    onDurationChangeRef,
  })
  
  // ttsTrack을 ref로 저장하여 안정적인 참조 유지
  const ttsTrackRef = useRef(ttsTrack)
  useEffect(() => {
    ttsTrackRef.current = ttsTrack
  }, [ttsTrack])
  
  // Transport의 playbackRate 변경 시 TtsTrack에 전달
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
    if (currentTtsTrack && 'setPlaybackRate' in currentTtsTrack) {
      (currentTtsTrack as { setPlaybackRate: (rate: number) => void }).setPlaybackRate(playbackSpeed)
    }
  }, [playbackSpeed])
  
  // onSegmentStartRef와 onSegmentEndRef가 설정된 후 ttsTrack에 다시 설정
  useEffect(() => {
    const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
    if (currentTtsTrack) {
      if (onSegmentStartRef.current) {
        const startCallback = onSegmentStartRef.current
        currentTtsTrack.setOnSegmentStart((segmentStartTime: number, sceneIndex: number) => {
          startCallback(segmentStartTime, sceneIndex)
        })
      }
      if (onSegmentEndRef.current) {
        const endCallback = onSegmentEndRef.current
        currentTtsTrack.setOnSegmentEnd((segmentEndTime: number, sceneIndex: number) => {
          // 매개변수는 타입 호환성을 위해 전달하지만 실제로는 사용하지 않음
          // 세그먼트 종료는 Transport의 정상적인 렌더링 루프로 처리됨
          endCallback(segmentEndTime, sceneIndex)
        })
      }
    }
    // onSegmentEndRef, onSegmentStartRef는 ref이므로 의존성 배열에서 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 의존성 배열 비움 - ttsTrack과 onSegmentStartRef, onSegmentEndRef는 ref로 접근
  
  // 씬/그룹 재생 시 Transport 시간 고정을 위한 ref
  const sceneGroupPlayStartTimeRef = useRef<number | null>(null)
  const sceneGroupPlayStartAudioCtxTimeRef = useRef<number | null>(null)

  // ensureSceneTts 래퍼 함수 (usePlaybackState가 기대하는 타입으로 변환)
  const ensureSceneTtsWrapper = useCallback(async (sceneIndex: number): Promise<void> => {
    await ensureSceneTts(sceneIndex)
  }, [ensureSceneTts])

  // 재생 상태 관리 (usePlaybackState 훅 사용 - ref 선언 이후에 호출)
  // setIsPlaying을 먼저 선언하여 useTimelineInteraction에서 사용 가능하도록 함
  const playbackStateResult = usePlaybackState({
    timeline,
    voiceTemplate,
    buildSceneMarkupWithTimeline,
    makeTtsKey,
    ensureSceneTts: ensureSceneTtsWrapper,
    transport,
    ttsTrack,
    audioContext,
    ttsCacheRef,
    ttsCacheRefShared,
    renderAtRef,
    playingSceneIndex,
    playingGroupSceneId,
    setPlayingSceneIndex,
    setPlayingGroupSceneId,
    setPlaybackEndTime,
    confirmedBgmTemplate,
    playbackSpeed,
    bgmAudioRef,
    startBgmAudio,
    pauseBgmAudio,
    resumeBgmAudio,
    sceneGroupPlayStartTimeRef,
    sceneGroupPlayStartAudioCtxTimeRef,
    ttsTrackRef: ttsTrackRef as React.MutableRefObject<{ getTtsTrack: () => TtsTrack | null }>,
    setIsPreparing,
  })
  const { setIsPlaying } = playbackStateResult

  // Transport/TTS 동기화
  const lastTtsUpdateTimeRef = useRef<number>(-1)
  useTransportTtsSync({
    transport,
    ttsTrack,
    audioContext,
    timeline,
    isPlaying,
    playingSceneIndex,
    playingGroupSceneId,
    playbackEndTime,
    setIsPlaying,
    setPlaybackEndTime,
    setPlayingSceneIndex,
    setPlayingGroupSceneId,
    renderAtRef,
    onSegmentStartRef,
    onSegmentEndRef,
    transportRendererRef,
    sceneGroupPlayStartTimeRef,
    sceneGroupPlayStartAudioCtxTimeRef,
    ttsTrackRef: ttsTrackRef as React.MutableRefObject<{ getTtsTrack: () => TtsTrack | null }>,
    lastTtsUpdateTimeRef,
  })

  // 타임라인 인터랙션 (setIsPlaying이 선언된 후에 호출)
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
    renderAtRef,
    transport,
    ttsTrack,
    audioContext,
    totalDuration: calculatedTotalDuration, // progressRatio 계산과 동일한 totalDuration 사용
  })
  
  // 씬 콘텐츠 렌더링 래퍼
  const { renderSceneContent } = useSceneContentRenderer({
    timeline,
    setTimeline,
    currentSceneIndexRef,
    setCurrentSceneIndex,
    updateCurrentScene,
    renderSceneContentFromManager,
    renderSubtitlePart,
    renderSceneImage,
  })
  
  // UX 개선: 효과 변경 중 자동 렌더링 스킵을 위한 ref
  const isPreviewingTransitionRef = useRef<boolean>(false)
  const [isPreviewingTransition, setIsPreviewingTransitionState] = useState<boolean>(false)
  
  // setIsPreviewingTransition 래퍼: ref와 state 모두 업데이트
  const setIsPreviewingTransition = useCallback((value: boolean) => {
    isPreviewingTransitionRef.current = value
    setIsPreviewingTransitionState(value)
  }, [])






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
    playingSceneIndex,
    playingGroupSceneId,
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
    handleSceneMotionChange: originalHandleSceneMotionChange,
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
    spritesRef,
    stageDimensions,
    fabricCanvasRef,
    fabricScaleRatioRef,
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
    // timeline 업데이트는 originalHandleSceneTransitionChange에서 처리됨
    // timeline 변경 감지 useEffect에서 자동으로 renderAt 호출됨
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalHandleSceneTransitionChange])

  const handleSceneMotionChange = useCallback((index: number, motion: import('@/hooks/video/effects/motion/types').MotionConfig | null) => {
    currentSceneIndexRef.current = index
    originalHandleSceneMotionChange(index, motion)
    // timeline 업데이트는 originalHandleSceneMotionChange에서 처리됨
    // timeline 변경 감지 useEffect에서 자동으로 renderAt 호출됨
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalHandleSceneMotionChange])

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

  // 씬 구조 정보 동기화
  useSceneStructureSync({
    scenes,
    timeline,
    voiceTemplate,
    ttsCacheRefShared,
    buildSceneMarkupWithTimeline,
    makeTtsKey,
  })

  // 타임라인 변경 감지 및 렌더링 업데이트 (useTimelineChangeHandler 훅 사용)
  // UX 개선: 효과 변경 중에는 자동 렌더링을 스킵하여 렌더링 충돌 방지
  useTimelineChangeHandler({
    timeline,
    renderAtRef,
    pixiReady,
    isPlaying,
    transport,
    isPreviewingTransitionRef,
  })

  // 재생 핸들러 훅 (Transport 기반)
  const playbackHandlers = usePlaybackHandlers({
    timelineRef,
    voiceTemplateRef,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setShowVoiceRequiredMessage,
    setScenesWithoutVoice,
    setRightPanelTab,
    router,
    playingSceneIndex,
    playingGroupSceneId,
    currentSceneIndex,
    onGroupPlayStart: (sceneId, endTime) => {
      setPlayingGroupSceneId(sceneId)
      setPlayingSceneIndex(null)
      setPlaybackEndTime(endTime)
      
      // 그룹 재생 시 해당 그룹의 씬 인덱스들을 TtsTrack에 설정
      if (timeline) {
        const groupSceneIndices = timeline.scenes
          .map((scene, idx) => scene.sceneId === sceneId ? idx : -1)
          .filter(idx => idx >= 0)
        const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
        if (currentTtsTrack && groupSceneIndices.length > 0) {
          currentTtsTrack.setAllowedSceneIndices(groupSceneIndices)
        }
      }
      
      // 씬/그룹 재생 시작 시간 초기화 (다음 useEffect에서 설정됨)
      sceneGroupPlayStartTimeRef.current = null
      sceneGroupPlayStartAudioCtxTimeRef.current = null
    },
    onScenePlayStart: (sceneIndex, endTime) => {
      setPlayingSceneIndex(sceneIndex)
      setPlayingGroupSceneId(null)
      setPlaybackEndTime(endTime)
      
      // 씬 재생 시 해당 씬 인덱스를 TtsTrack에 설정
      const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
      if (currentTtsTrack) {
        currentTtsTrack.setAllowedSceneIndices([sceneIndex])
      }
      
      // 씬/그룹 재생 시작 시간 초기화 (다음 useEffect에서 설정됨)
      sceneGroupPlayStartTimeRef.current = null
      sceneGroupPlayStartAudioCtxTimeRef.current = null
    },
    onFullPlayStart: () => {
      // 전체 재생 시작 시 종료 시간 제한 제거 및 허용된 씬 인덱스 제거
      setPlaybackEndTime(null)
      setPlayingSceneIndex(null)
      setPlayingGroupSceneId(null)
      
      // 전체 재생 시 모든 씬 허용
      const currentTtsTrack = ttsTrackRef.current.getTtsTrack()
      if (currentTtsTrack) {
        currentTtsTrack.setAllowedSceneIndices(null)
      }
    },
  })
  
  const {
    handlePlayPause,
    handleGroupPlay,
    handleScenePlay,
  } = playbackHandlers

  // loadAllScenes ref 추가 (useSceneLoader에서 사용하지 않지만 다른 곳에서 사용 가능)
  const loadAllScenesRef = useRef(loadAllScenes)
  useEffect(() => {
    loadAllScenesRef.current = loadAllScenes
  }, [loadAllScenes])

  // 편집 모드 관리 (useEditModeManager 훅 사용 - ref 선언 이후에 호출)
  useEditModeManager({
    containerRef: containerRef as React.RefObject<PIXI.Container>,
    appRef: appRef as React.RefObject<PIXI.Application>,
    pixiContainerRef: pixiContainerRef as React.RefObject<HTMLDivElement>,
    fabricCanvasRef: step3State.fabricCanvasRef as React.RefObject<fabric.Canvas>,
    currentSceneIndexRef,
    spritesRef,
    textsRef,
    editHandlesRef: editHandlesRef as React.MutableRefObject<Map<number, PIXI.Graphics>>,
    textEditHandlesRef: textEditHandlesRef as React.MutableRefObject<Map<number, PIXI.Graphics>>,
    clickedOnPixiElementRef,
    timelineRef,
    loadAllScenesCompletedRef,
    drawEditHandlesRef: drawEditHandlesRef as unknown as React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>,
    handleResizeRef: handleResizeRef as unknown as React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>,
    saveImageTransformRef: saveImageTransformRef as unknown as React.MutableRefObject<() => void>,
    setupSpriteDragRef: setupSpriteDragRef as React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number) => void>,
    drawTextEditHandlesRef: drawTextEditHandlesRef as unknown as React.MutableRefObject<(text: PIXI.Text, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>,
    handleTextResizeRef: handleTextResizeRef as unknown as React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>,
    saveTextTransformRef: saveTextTransformRef as unknown as React.MutableRefObject<() => void>,
    setupTextDragRef: setupTextDragRef as React.MutableRefObject<(text: PIXI.Text, sceneIndex: number) => void>,
    useFabricEditing,
    pixiReady,
    fabricReady,
    editMode,
    setEditMode,
    selectedElementIndex,
    setSelectedElementIndex,
    selectedElementType,
    setSelectedElementType,
    isPlaying,
    isPreviewingTransition,
    currentSceneIndex,
    timeline,
    setupSpriteDrag,
    setupTextDrag,
  })

  // [강화] 리소스 모니터링 및 상태 동기화 검증 (비활성화됨)

  // 편집 모드 핸들 관리
  useEditHandlesManager({
    containerRef: containerRef as React.RefObject<PIXI.Container>,
    pixiReady,
    editMode,
    selectedElementIndex,
    selectedElementType,
    setSelectedElementIndex,
    setSelectedElementType,
    currentSceneIndexRef,
    spritesRef,
    textsRef,
    editHandlesRef: editHandlesRef as React.MutableRefObject<Map<number, PIXI.Graphics>>,
    textEditHandlesRef: textEditHandlesRef as React.MutableRefObject<Map<number, PIXI.Graphics>>,
    loadAllScenesCompletedRef,
    drawEditHandlesRef: drawEditHandlesRef as unknown as React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>,
    handleResizeRef: handleResizeRef as unknown as React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>,
    saveImageTransformRef: saveImageTransformRef as unknown as React.MutableRefObject<() => void>,
    setupSpriteDragRef: setupSpriteDragRef as React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number) => void>,
    drawTextEditHandlesRef: drawTextEditHandlesRef as unknown as React.MutableRefObject<(text: PIXI.Text, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>,
    handleTextResizeRef: handleTextResizeRef as unknown as React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>,
    saveTextTransformRef: saveTextTransformRef as unknown as React.MutableRefObject<() => void>,
    setupTextDragRef: setupTextDragRef as React.MutableRefObject<(text: PIXI.Text, sceneIndex: number) => void>,
    timelineRef,
  })

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

  // 씬 썸네일 관리 (useSceneThumbnails 훅 사용)
  const { sceneThumbnails } = useSceneThumbnails({
    scenes,
    selectedImages,
  })

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
    handleSceneMotionChange,
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
    handleSceneMotionChange,
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