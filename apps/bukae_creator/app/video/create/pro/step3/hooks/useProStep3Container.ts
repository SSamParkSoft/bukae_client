'use client'

import { useMemo, useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useProTransportRenderer } from './playback/useProTransportRenderer'
import { useProTransportTtsSync } from './playback/useProTransportTtsSync'
import { useProTransportPlayback } from './playback/useProTransportPlayback'
import { useProFabricResizeDrag } from './editing/useProFabricResizeDrag'
import { useProEditModeManager } from './editing/useProEditModeManager'
import { useTimelineChangeHandler } from '@/app/video/create/step3/shared/hooks/timeline'
import type { ProStep3Scene } from '../model/types'

export interface UseProStep3ContainerParams {
  scenes: ProStep3Scene[]
  currentSceneIndex: number
  isPlaying: boolean
  pixiReady: boolean
  canvasDisplaySize: { width: number; height: number } | null
  currentTime: number
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>
  totalDuration: number
  setTotalDuration: React.Dispatch<React.SetStateAction<number>>
  playbackSpeed: number
  setPlaybackSpeed: React.Dispatch<React.SetStateAction<number>>
  editMode: 'none' | 'image' | 'text'
  setEditMode: React.Dispatch<React.SetStateAction<'none' | 'image' | 'text'>>
  onBeforePlay?: () => boolean
  onPlayingChange?: (isPlaying: boolean) => void
  loadVideoAsSprite: (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number) => Promise<void>
  renderSubtitle: (sceneIndex: number, script: string) => void
  appRef: React.MutableRefObject<PIXI.Application | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  currentSceneIndexRef: React.MutableRefObject<number>
  playbackContainerRef: React.RefObject<HTMLDivElement | null>
  pixiContainerRef: React.RefObject<HTMLDivElement | null>
  subtitleContainerRef: React.RefObject<PIXI.Container | null>
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; url?: string | null }>>
  ttsAudioRefsRef: React.MutableRefObject<Map<number, HTMLAudioElement>>
}

const STAGE_WIDTH = 1080
const STAGE_HEIGHT = 1920

/**
 * Pro step3 오케스트레이션 훅 (Fast useStep3Container와 동일한 패턴)
 * 공유 훅(useTimelineChangeHandler) + Pro 전용 훅(Transport, Fabric, EditMode)을 조합하여
 * 재생/렌더/편집 관련 상태와 핸들러를 한 곳에서 반환.
 */
export function useProStep3Container(params: UseProStep3ContainerParams) {
  const {
    scenes,
    currentSceneIndex,
    isPlaying,
    pixiReady,
    canvasDisplaySize,
    currentTime,
    setCurrentTime,
    totalDuration,
    setTotalDuration,
    playbackSpeed,
    setPlaybackSpeed,
    editMode,
    setEditMode,
    onBeforePlay,
    onPlayingChange,
    loadVideoAsSprite,
    renderSubtitle,
    appRef,
    spritesRef,
    textsRef,
    videoElementsRef,
    currentSceneIndexRef,
    playbackContainerRef,
    pixiContainerRef,
    subtitleContainerRef,
    ttsCacheRef,
    ttsAudioRefsRef,
  } = params

  const timeline = useVideoCreateStore((state) => state.timeline)
  const setTimeline = useVideoCreateStore((state) => state.setTimeline)

  const totalDurationValue = totalDuration
  const useFabricEditing = editMode === 'text'

  const { transportHook, transportState, renderAtRef } = useProTransportRenderer({
    timeline,
    scenes,
    pixiReady,
    appRef,
    spritesRef,
    videoElementsRef,
    currentSceneIndexRef,
    loadVideoAsSprite,
    renderSubtitle,
  })

  useProTransportTtsSync({
    transportHook,
    isPlaying: transportState.isPlaying,
    pixiReady,
    playbackSpeed,
    currentTime,
    scenes,
    ttsCacheRef,
    ttsAudioRefsRef,
  })

  const { handlePlayPause } = useProTransportPlayback({
    transportHook,
    transportState,
    playbackSpeed,
    totalDurationValue,
    currentSceneIndex,
    scenes,
    pixiReady,
    renderAtRef,
    onBeforePlay,
    onPlayingChange,
    setCurrentTime,
    setTotalDuration,
  })

  const timelineScenesKey = useMemo(() => {
    if (!timeline?.scenes || timeline.scenes.length === 0) return ''
    return timeline.scenes
      .map(
        (scene, idx) =>
          `${idx}-${scene.imageTransform ? JSON.stringify(scene.imageTransform) : 'none'}-${scene.text?.content || ''}`
      )
      .join('|')
  }, [timeline])

  const { syncFromScene: syncFabricScene, syncFromSceneDirect, fabricCanvasRef: proFabricCanvasRef, fabricReady } = useProFabricResizeDrag({
    videoElementsRef,
    enabled: pixiReady && !isPlaying && useFabricEditing,
    playbackContainerRef,
    canvasDisplaySize,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    currentSceneIndex,
    timeline,
    setTimeline,
    spritesRef,
    textsRef,
  })

  useEffect(() => {
    if (isPlaying && editMode !== 'none') {
      setEditMode('none')
    }
  }, [isPlaying, editMode, setEditMode])

  useProEditModeManager({
    appRef,
    fabricCanvasRef: proFabricCanvasRef,
    subtitleContainerRef,
    useFabricEditing,
    pixiReady,
    fabricReady,
    isPlaying,
  })

  useTimelineChangeHandler({
    timeline,
    renderAtRef,
    pixiReady,
    isPlaying: transportState.isPlaying,
    transport: transportHook,
  })

  // 초기 로드 시 타임라인을 0초로 초기화하고 첫 번째 씬 렌더링
  const hasInitializedRef = useRef(false)
  useEffect(() => {
    // pixiReady가 처음 true가 되었을 때만 초기화 (한 번만 실행)
    if (!pixiReady || hasInitializedRef.current || transportState.isPlaying || !renderAtRef.current || scenes.length === 0) return
    
    // Transport를 0초로 초기화
    transportHook.seek(0)
    setCurrentTime(0)
    
    // 첫 번째 씬 렌더링
    if (currentSceneIndex >= 0) {
      renderAtRef.current(0, { forceSceneIndex: currentSceneIndex, forceRender: true })
    } else {
      renderAtRef.current(0, { forceRender: true })
    }
    
    hasInitializedRef.current = true
  }, [pixiReady, transportState.isPlaying, transportHook, renderAtRef, scenes, currentSceneIndex, setCurrentTime])

  useEffect(() => {
    if (!pixiReady || transportState.isPlaying || !renderAtRef.current) return
    const t = transportHook.getTime()
    renderAtRef.current(t, { skipAnimation: false, forceRender: true })
  }, [timelineScenesKey, pixiReady, transportState.isPlaying, transportHook, renderAtRef])

  return {
    handlePlayPause,
    currentTime,
    setCurrentTime,
    totalDuration,
    setTotalDuration,
    playbackSpeed,
    setPlaybackSpeed,
    transportHook,
    transportState,
    renderAtRef,
    syncFabricScene,
    syncFromSceneDirect,
    proFabricCanvasRef,
    fabricReady,
    useFabricEditing,
    editMode,
    setEditMode,
    timeline,
    setTimeline,
  }
}
