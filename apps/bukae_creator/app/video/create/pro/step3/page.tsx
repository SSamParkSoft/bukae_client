'use client'

import { motion } from 'framer-motion'
import { ProPreviewPanel } from './ui/ProPreviewPanel'
import { ProSceneListPanel } from './ui/ProSceneListPanel'
import { ProEffectsPanel } from './ui/ProEffectsPanel'
import { useVideoCreateStore, type TimelineData } from '@/store/useVideoCreateStore'
import { useCallback, useState } from 'react'
import { allTransitions, transitions, movements } from '@/lib/data/transitions'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'
import { getPlayableSegments, reorderByIndexOrder } from '@/app/video/create/step3/shared/model'
import type { MotionConfig } from '@/hooks/video/effects/motion/types'
import {
  useProStep3Scenes,
  useProStep3SelectionChange,
  useProStep3State,
} from './hooks'
import type { SceneScript } from '@/lib/types/domain/script'
import { useTimelineInitializer } from '@/hooks/video/timeline/useTimelineInitializer'

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
  } = useVideoCreateStore()
  
  // 현재 선택된 씬 인덱스
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null)
  const [scenePlaybackRequest, setScenePlaybackRequest] = useState<{ sceneIndex: number; requestId: number } | null>(null)

  // Pro step3 씬 데이터 변환 훅
  const { proStep3Scenes } = useProStep3Scenes()

  // Timeline 초기화 (씬에서 timeline 생성)
  useTimelineInitializer({
    scenes: storeScenes,
    selectedImages: [],
    subtitleFont: subtitleFont || null,
    subtitleColor: subtitleColor || null,
    subtitlePosition: subtitlePosition || null,
    timeline,
    setTimeline,
  })

  // 격자 선택 영역 변경 훅
  const { handleSelectionChange } = useProStep3SelectionChange()

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

  // 효과 패널 및 사운드 상태 관리 훅
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

  // 현재 선택된 씬의 비디오 URL과 선택 영역
  const currentScene = proStep3Scenes[currentSceneIndex]
  const currentVideoUrl = currentScene?.videoUrl || null
  const currentSelectionStartSeconds = currentScene?.selectionStartSeconds || 0

  // 씬 선택 핸들러
  const handleSceneSelect = useCallback((index: number) => {
    setCurrentSceneIndex(index)
  }, [])

  const handleScenePlay = useCallback(async (sceneIndex: number) => {
    const targetScene = proStep3Scenes[sceneIndex]
    if (!targetScene?.videoUrl) {
      alert('재생할 영상이 없습니다.')
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

  // 씬 재정렬 핸들러
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

  // 전환 효과 변경 핸들러
  const handleTransitionChange = useCallback((sceneIndex: number, value: string) => {
    if (!timeline?.scenes?.[sceneIndex]) {
      return
    }

    const nextScenes = timeline.scenes.map((scene, index) => {
      if (index !== sceneIndex) {
        return scene
      }
      return {
        ...scene,
        transition: value,
      }
    })

    setTimeline({
      ...timeline,
      scenes: nextScenes,
    })
  }, [setTimeline, timeline])

  // 모션 변경 핸들러
  const handleMotionChange = useCallback((sceneIndex: number, motion: MotionConfig | null) => {
    if (!timeline?.scenes?.[sceneIndex]) {
      return
    }

    const nextScenes = timeline.scenes.map((scene, index) => {
      if (index !== sceneIndex) {
        return scene
      }
      return {
        ...scene,
        motion: motion ?? undefined,
      }
    })

    setTimeline({
      ...timeline,
      scenes: nextScenes,
    })
  }, [setTimeline, timeline])

  // Timeline 설정 핸들러 (store의 setTimeline 사용)
  const handleSetTimeline = useCallback((newTimeline: TimelineData) => {
    setTimeline(newTimeline)
  }, [setTimeline])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 고정 80px 양옆 마진 + 최대 1760px 컨테이너 */}
      <div
        className="w-full h-full mx-auto"
        style={{ maxWidth: '1760px', paddingLeft: '80px', paddingRight: '80px' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col lg:flex-row h-full overflow-hidden w-full gap-4 lg:gap-3 xl:gap-4 2xl:gap-5"
        >
          {/* 왼쪽 패널: 미리보기 (Pro 전용 - 썸네일만 표시) */}
          <div className="w-full lg:w-[25%] min-w-[250px] flex flex-col overflow-hidden lg:h-full">
            <ProPreviewPanel
              currentVideoUrl={currentVideoUrl}
              currentSelectionStartSeconds={currentSelectionStartSeconds}
              currentSceneIndex={currentSceneIndex}
              scenes={proStep3Scenes}
              scenePlaybackRequest={scenePlaybackRequest}
              isPlaying={isPlaying}
              onBeforePlay={canStartPlayback}
              onPlayingChange={handlePlayingChange}
              onScenePlaybackComplete={handleScenePlaybackComplete}
              bgmTemplate={bgmTemplate}
              onExport={() => {
                // 내보내기 기능은 나중에 구현
                alert('내보내기 기능은 준비 중입니다.')
              }}
              isExporting={false}
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
              onOpenEffectPanel={() => {
                // 효과 패널은 나중에 구현
              }}
              onSelectionChange={handleSelectionChange}
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
              setTimeline={handleSetTimeline}
              onMotionChange={handleMotionChange}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
