'use client'

import { motion } from 'framer-motion'
import { ProPreviewPanel } from './components/ProPreviewPanel'
import { ProSceneListPanel } from './components/ProSceneListPanel'
import { ProEffectsPanel } from './components/ProEffectsPanel'
import { useVideoCreateStore, type TimelineData } from '@/store/useVideoCreateStore'
import { useCallback, useState } from 'react'
import { allTransitions, transitions, movements } from '@/lib/data/transitions'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'
import {
  useProStep3Scenes,
  useProStep3SelectionChange,
  useProStep3Playback,
  useProStep3State,
} from './hooks'
import type { SceneScript } from '@/lib/types/domain/script'

export default function ProStep3Page() {
  const { scenes: storeScenes, setScenes, bgmTemplate, setBgmTemplate } = useVideoCreateStore()
  
  // 현재 선택된 씬 인덱스
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)

  // Pro step3 씬 데이터 변환 훅
  const { proStep3Scenes } = useProStep3Scenes()

  // 격자 선택 영역 변경 훅
  const { handleSelectionChange } = useProStep3SelectionChange()

  // 재생 상태 관리 훅
  const { isPlaying, handleProPlayPause } = useProStep3Playback(proStep3Scenes)

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

  // 씬 재정렬 핸들러
  const handleSceneReorder = useCallback(
    (newOrder: number[]) => {
      const safeScenes = ensureSceneArray<SceneScript>(storeScenes)
      if (!isValidSceneArray(safeScenes)) {
        return
      }
      const reordered = newOrder.map((index) => safeScenes[index])
      setScenes(reordered)
    },
    [setScenes, storeScenes]
  )

  // 전환 효과 변경 핸들러 (Pro에서는 timeline이 없으므로 빈 함수)
  const handleTransitionChange = useCallback((sceneIndex: number, value: string) => {
    // Pro에서는 전환 효과를 나중에 구현
    console.log('전환 효과 변경:', sceneIndex, value)
  }, [])

  // 모션 변경 핸들러 (Pro에서는 timeline이 없으므로 빈 함수)
  const handleMotionChange = useCallback((sceneIndex: number, motion: any) => {
    // Pro에서는 모션 효과를 나중에 구현
    console.log('모션 변경:', sceneIndex, motion)
  }, [])

  // Timeline 설정 핸들러 (Pro에서는 timeline이 없으므로 빈 함수)
  const handleSetTimeline = useCallback((timeline: TimelineData) => {
    // Pro에서는 timeline을 사용하지 않음
    console.log('Timeline 설정:', timeline)
  }, [])

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
              isPlaying={isPlaying}
              onPlayPause={handleProPlayPause}
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
              timeline={null}
              currentSceneIndex={currentSceneIndex}
              playingSceneIndex={null}
              isPreparing={false}
              isTtsBootstrapping={false}
              onSelect={handleSceneSelect}
              onReorder={handleSceneReorder}
              onPlayScene={async () => {
                // 개별 씬 재생은 ProPreviewPanel의 전체 재생으로 대체
                handleProPlayPause()
              }}
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
              timeline={null}
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
