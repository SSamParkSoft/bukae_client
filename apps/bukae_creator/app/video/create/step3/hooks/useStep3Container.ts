'use client'

import { useRef, useEffect, useMemo, useCallback } from 'react'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import { useSceneHandlers } from '@/hooks/video/scene/useSceneHandlers'
import { useTimelinePlayer } from '@/hooks/video/playback/useTimelinePlayer'
import { usePixiFabric } from '@/hooks/video/pixi/usePixiFabric'
import { usePixiEffects } from '@/hooks/video/effects/usePixiEffects'
import { useSceneManager } from '@/hooks/video/scene/useSceneManager'
import { usePixiEditor } from '@/hooks/video/editing/usePixiEditor'
import { useSceneNavigation } from '@/hooks/video/scene/useSceneNavigation'
import { useFullPlayback } from '@/hooks/video/playback/useFullPlayback'
import { useTimelineInitializer } from '@/hooks/video/timeline/useTimelineInitializer'
import { useGridManager } from '@/hooks/video/canvas/useGridManager'
import { useCanvasSize } from '@/hooks/video/canvas/useCanvasSize'
import { useFontLoader } from '@/hooks/video/canvas/useFontLoader'
import { useBgmManager } from '@/hooks/video/audio/useBgmManager'
import { useTimelineInteraction } from '@/hooks/video/timeline/useTimelineInteraction'
import { usePlaybackStateSync } from '@/hooks/video/playback/usePlaybackStateSync'
import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getMp3DurationSec } from '@/lib/utils/audio'
import { useSceneEditHandlers as useSceneEditHandlersFromVideo } from '@/hooks/video/scene/useSceneEditHandlers'
import { useVideoExport } from '@/hooks/video/export/useVideoExport'
import { loadPixiTexture } from '@/utils/pixi'
import { useTtsManager } from './useTtsManager'
import { useTtsPreview } from '@/hooks/video/tts/useTtsPreview'
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
    fullPlaybackRef,
    groupPlaybackRef,
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

  // buildSceneMarkupWithTimeline을 먼저 선언 (useTimelinePlayer에서 사용)
  const buildSceneMarkupWithTimeline = useCallback(
    (timelineParam: TimelineData | null, sceneIndex: number) => buildSceneMarkup(timelineParam, sceneIndex),
    []
  )

  // TTS 캐시 ref를 먼저 생성 (useTimelinePlayer와 useTtsManager에서 공유)
  const ttsCacheRefShared = useRef(
    new Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>()
  )

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
    // TTS 캐시를 사용하여 더 정확한 duration 계산
    ttsCacheRef: ttsCacheRefShared,
    voiceTemplate: voiceTemplate,
    buildSceneMarkup: buildSceneMarkupWithTimeline,
    makeTtsKey: makeTtsKey,
  })

  // 통합된 상태 사용
  const isPlaying = timelineIsPlaying
  const setIsPlaying = setTimelineIsPlaying
  const currentSceneIndex = timelineCurrentSceneIndex
  const setCurrentSceneIndex = setTimelineCurrentSceneIndex

  // TTS 관리 (useTimelinePlayer 이후에 호출하여 isPlaying과 setCurrentTime 사용)
  // ttsCacheRefShared를 useTtsManager와 공유하여 동기화 보장
  const {
    ttsCacheRef,
    stopScenePreviewAudio,
    ensureSceneTts,
    invalidateSceneTtsCache,
  } = useTtsManager({
    timeline,
    voiceTemplate,
    setTimeline,
    isPlaying,
    setCurrentTime,
    changedScenesRef,
  })

  // TTS 캐시 동기화: useTtsManager의 ttsCacheRef를 ttsCacheRefShared에 동기화
  // useTtsManager가 내부에서 생성한 ttsCacheRef를 ttsCacheRefShared로 교체
  useEffect(() => {
    if (ttsCacheRef && ttsCacheRefShared) {
      // useTtsManager의 ttsCacheRef 내용을 ttsCacheRefShared에 복사
      ttsCacheRefShared.current.clear()
      ttsCacheRef.current.forEach((value, key) => {
        ttsCacheRefShared.current.set(key, value)
      })
    }
  }, [ttsCacheRef])

  // BGM 관리
  const {
    confirmedBgmTemplate,
    isBgmBootstrapping,
    stopBgmAudio,
    startBgmAudio,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, setTimeline, setCurrentSceneIndex, currentSceneIndexRef, updateCurrentScene, renderSceneContentFromManager])
  const isPreviewingTransition = timelineIsPreviewingTransition
  const setIsPreviewingTransition = setTimelineIsPreviewingTransition






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
  
  // useGroupPlayback용 래퍼 (timeline을 파라미터로 받음)
  // buildSceneMarkupWithTimeline은 위에서 이미 선언됨



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

  // selectSceneRef 업데이트 (함수 참조 저장)
  selectSceneRef.current = sceneNavigation.selectScene
  
  // isPlaying 상태와 ref 동기화
  isPlayingRef.current = isPlaying
  
  // 재생 상태 동기화
  usePlaybackStateSync({
    videoPlaybackIsPlaying: fullPlayback.isPlaying,
    timelineIsPlaying,
    setTimelineIsPlaying,
    videoPlaybackSetIsPlaying: fullPlayback.setIsPlaying,
  })

  // 비디오 재생 중일 때 useTimelinePlayer의 자동 시간 업데이트 비활성화
  disableAutoTimeUpdateRef.current = fullPlayback.isPlaying || fullPlayback.isPlayingAll

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
  
  // fullPlayback과 groupPlayback ref 업데이트 (핸들러 최적화를 위해)
  fullPlaybackRef.current = fullPlayback
  groupPlaybackRef.current = groupPlayback

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
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, timeline, voiceTemplate])

  // 재생 핸들러 훅
  const playbackHandlers = usePlaybackHandlers({
    timelineRef,
    voiceTemplateRef,
    fullPlaybackRef,
    groupPlaybackRef,
    isPlaying,
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
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineIsPlaying, editMode, setEditMode, setSelectedElementIndex, setSelectedElementType])




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
    // 씬 재생 중일 때는 씬 선택 무시 (중복 렌더링 방지)
    const currentGroupPlayback = groupPlaybackRef.current
    if (currentGroupPlayback?.playingSceneIndex !== null) {
      return
    }
    sceneNavigation.selectScene(index)
    // ref는 변경되어도 리렌더링을 트리거하지 않으므로 dependency에 포함할 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneNavigation])

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
  ])
}