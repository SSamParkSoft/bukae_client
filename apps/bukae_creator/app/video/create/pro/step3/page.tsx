'use client'

import { motion } from 'framer-motion'
import { ProPreviewPanel } from './ui/ProPreviewPanel'
import { ProSceneListPanel } from './ui/ProSceneListPanel'
import { ProEffectsPanel } from './ui/ProEffectsPanel'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { allTransitions, transitions, movements } from '@/lib/data/transitions'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'
import { getPlayableSegments, reorderByIndexOrder } from './utils'
import type { MotionConfig } from '@/hooks/video/effects/motion/types'
import {
  useProStep3Scenes,
  useProStep3SelectionChange,
  useProStep3State,
} from './hooks'
import type { SceneScript } from '@/lib/types/domain/script'
import { useTimelineInitializer } from '@/hooks/video/timeline/useTimelineInitializer'
import { useProVideoExport } from '@/hooks/video/export/useProVideoExport'
import { useSceneMediaUpload } from './hooks/useSceneMediaUpload'
import { useProStep3Container } from './hooks/useProStep3Container'

export default function ProStep3Page() {
  const {
    scenes: storeScenes,
    setScenes,
    bgmTemplate,
    setBgmTemplate,
    timeline,
    setTimeline,
    subtitleFont,
    subtitleColor,
    subtitlePosition,
    videoTitle,
    videoDescription,
    selectedProducts,
  } = useVideoCreateStore()

  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null)
  const [scenePlaybackRequest, setScenePlaybackRequest] = useState<{ sceneIndex: number; requestId: number } | null>(null)

  const { proStep3Scenes } = useProStep3Scenes()

  useTimelineInitializer({
    scenes: storeScenes,
    selectedImages: [],
    subtitleFont: subtitleFont || null,
    subtitleColor: subtitleColor || null,
    subtitlePosition: subtitlePosition || null,
    timeline,
    setTimeline,
  })

  const { handleSelectionChange, handleOriginalVideoDurationLoaded } = useProStep3SelectionChange()

  const canStartPlayback = useCallback(() => {
    const playableScenes = getPlayableSegments(
      proStep3Scenes.map((scene) => ({
        ...scene,
        mediaUrl: scene.videoUrl,
      }))
    )
    if (playableScenes.length === 0) {
      alert('재생할 영상이 없습니다.')
      return false
    }
    return true
  }, [proStep3Scenes])

  const handlePlayingChange = useCallback((nextPlaying: boolean) => {
    setIsPlaying(nextPlaying)
    if (!nextPlaying) {
      setPlayingSceneIndex(null)
    }
  }, [])

  const handleScenePlaybackComplete = useCallback(() => {
    setPlayingSceneIndex(null)
  }, [])

  const {
    rightPanelTab,
    setRightPanelTab,
    confirmedBgmTemplate,
    soundEffect,
    setSoundEffect,
    confirmedSoundEffect,
    handleBgmConfirm,
    handleSoundEffectConfirm,
  } = useProStep3State()

  const { isExporting, handleExport } = useProVideoExport({
    proStep3Scenes,
    timeline,
    videoTitle: videoTitle || '',
    videoDescription: videoDescription || '',
    bgmTemplate,
    subtitleFont,
    selectedProducts: selectedProducts ?? [],
  })

  const { uploadingSceneIndex, compressingSceneIndex, handleVideoUpload } = useSceneMediaUpload()

  const container = useProStep3Container({
    scenes: proStep3Scenes,
    currentSceneIndex,
    isPlaying,
    scenePlaybackRequest,
    confirmedBgmTemplate,
    onBeforePlay: canStartPlayback,
    onPlayingChange: handlePlayingChange,
    onScenePlaybackComplete: handleScenePlaybackComplete,
  })

  const { renderAtRef, enterEditMode } = container

  const currentScene = proStep3Scenes[currentSceneIndex]
  const currentVideoUrl = currentScene?.videoUrl || null
  const currentImageUrl = currentScene?.imageUrl || null

  const editModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (editModeTimerRef.current !== null) {
        clearTimeout(editModeTimerRef.current)
      }
    }
  }, [])

  const handleSceneSelect = useCallback((index: number) => {
    const targetScene = proStep3Scenes[index]
    if (!targetScene) {
      setCurrentSceneIndex(index)
      return
    }

    // 1. 선택한 씬을 즉시 강제 렌더링
    renderAtRef.current?.(0, {
      forceSceneIndex: index,
      forceRender: true,
      forceTransitionComplete: true,
    })

    // 2. 씬 인덱스 설정
    setCurrentSceneIndex(index)

    // 3. edit 모드 진입
    const mode = targetScene.imageUrl || targetScene.videoUrl ? 'image' : 'text'
    if (editModeTimerRef.current !== null) {
      clearTimeout(editModeTimerRef.current)
    }
    editModeTimerRef.current = setTimeout(() => enterEditMode(mode), 50)
  }, [proStep3Scenes, renderAtRef, enterEditMode])

  const handleScenePlay = useCallback(async (sceneIndex: number) => {
    const targetScene = proStep3Scenes[sceneIndex]
    const videoUrl = targetScene?.videoUrl?.trim() || ''
    const imageUrl = targetScene?.imageUrl?.trim() || ''

    if (!videoUrl && !imageUrl) {
      alert('재생할 영상/이미지가 없습니다.')
      return
    }

    setCurrentSceneIndex(sceneIndex)
    if (!isPlaying || playingSceneIndex !== sceneIndex) {
      setPlayingSceneIndex(sceneIndex)
    }
    setScenePlaybackRequest((prev) => ({
      sceneIndex,
      requestId: (prev?.requestId ?? 0) + 1,
    }))
  }, [isPlaying, playingSceneIndex, proStep3Scenes])

  const handleSceneReorder = useCallback(
    (newOrder: number[]) => {
      const safeScenes = ensureSceneArray<SceneScript>(storeScenes)
      if (!isValidSceneArray(safeScenes)) {
        return
      }
      const reordered = reorderByIndexOrder(safeScenes, newOrder)
      setScenes(reordered)
    },
    [setScenes, storeScenes]
  )

  const handleTransitionChange = useCallback((sceneIndex: number, value: string) => {
    if (!timeline?.scenes?.[sceneIndex]) {
      return
    }
    const nextScenes = timeline.scenes.map((scene, index) => {
      if (index !== sceneIndex) {
        return scene
      }
      const hasTransitionEffect = value !== 'none'
      const nextTransitionDuration =
        value === 'none'
          ? 0
          : scene.transitionDuration && scene.transitionDuration > 0
            ? scene.transitionDuration
            : 0.5
      return {
        ...scene,
        transition: value,
        transitionDuration: nextTransitionDuration,
        motion: hasTransitionEffect ? undefined : scene.motion,
      }
    })
    setTimeline({ ...timeline, scenes: nextScenes })
  }, [setTimeline, timeline])

  const handleMotionChange = useCallback((sceneIndex: number, motion: MotionConfig | null) => {
    if (!timeline?.scenes?.[sceneIndex]) {
      return
    }
    const nextScenes = timeline.scenes.map((scene, index) => {
      if (index !== sceneIndex) {
        return scene
      }
      const hasMotion = motion != null
      return {
        ...scene,
        motion: motion ?? undefined,
        transition: hasMotion ? 'none' : scene.transition,
        transitionDuration: hasMotion ? 0 : scene.transitionDuration,
      }
    })
    setTimeline({ ...timeline, scenes: nextScenes })
  }, [setTimeline, timeline])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="w-full h-full mx-auto"
        style={{ maxWidth: '1760px', paddingLeft: '80px', paddingRight: '80px' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col lg:flex-row h-full overflow-hidden w-full gap-4 lg:gap-3 xl:gap-4 2xl:gap-5"
        >
          {/* 왼쪽 패널: 미리보기 */}
          <div className="w-full lg:w-[25%] min-w-[250px] flex flex-col overflow-hidden lg:h-full">
            <ProPreviewPanel
              playbackContainerRef={container.playbackContainerRef}
              pixiContainerRef={container.pixiContainerRef}
              timelineBarRef={container.timelineBarRef}
              currentTime={container.currentTime}
              totalDuration={container.totalDuration}
              playbackSpeed={container.playbackSpeed}
              setPlaybackSpeed={container.setPlaybackSpeed}
              canvasDisplaySize={container.canvasDisplaySize}
              handlePlayPause={container.handlePlayPause}
              handleTimelineSeek={container.handleTimelineSeek}
              handleSceneImageFitChange={container.handleSceneImageFitChange}
              timeline={container.timeline}
              isPlaying={isPlaying}
              bgmTemplate={bgmTemplate}
              confirmedBgmTemplate={confirmedBgmTemplate}
              currentVideoUrl={currentVideoUrl}
              currentImageUrl={currentImageUrl}
              currentSceneIndex={currentSceneIndex}
              onExport={handleExport}
              isExporting={isExporting}
            />
          </div>

          {/* 중앙 패널: 씬 리스트 */}
          <div className="w-full lg:w-[45%] min-w-[480px] flex flex-col overflow-hidden lg:h-full shrink-0 lg:mr-2">
            <ProSceneListPanel
              theme="light"
              scenes={proStep3Scenes}
              timeline={timeline}
              currentSceneIndex={currentSceneIndex}
              playingSceneIndex={playingSceneIndex}
              isPreparing={false}
              isTtsBootstrapping={false}
              onSelect={handleSceneSelect}
              onReorder={handleSceneReorder}
              onPlayScene={handleScenePlay}
              onVideoUpload={handleVideoUpload}
              uploadingSceneIndex={uploadingSceneIndex}
              compressingSceneIndex={compressingSceneIndex}
              onOpenEffectPanel={(tab) => {
                setRightPanelTab(tab)
              }}
              onSelectionChange={handleSelectionChange}
              onOriginalVideoDurationLoaded={handleOriginalVideoDurationLoaded}
            />
          </div>

          {/* 오른쪽 패널: 효과 설정 */}
          <div className="w-full lg:w-[30%] min-w-[350px] flex flex-col overflow-hidden lg:h-full shrink-0">
            <ProEffectsPanel
              theme="light"
              rightPanelTab={rightPanelTab}
              setRightPanelTab={setRightPanelTab}
              timeline={timeline}
              currentSceneIndex={currentSceneIndex}
              allTransitions={allTransitions}
              transitions={transitions}
              movements={movements}
              onTransitionChange={handleTransitionChange}
              bgmTemplate={bgmTemplate}
              setBgmTemplate={setBgmTemplate}
              confirmedBgmTemplate={confirmedBgmTemplate}
              onBgmConfirm={handleBgmConfirm}
              soundEffect={soundEffect}
              setSoundEffect={setSoundEffect}
              confirmedSoundEffect={confirmedSoundEffect}
              onSoundEffectConfirm={handleSoundEffectConfirm}
              setTimeline={setTimeline}
              onMotionChange={handleMotionChange}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
