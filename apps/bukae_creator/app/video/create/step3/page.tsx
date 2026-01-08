'use client'

import { motion } from 'framer-motion'
import { useStep3Container } from './hooks/useStep3Container'
import { PreviewPanel } from './components/PreviewPanel'
import { SceneListPanel } from './components/SceneListPanel'
import { EffectsPanel } from '@/components/video-editor/EffectsPanel'

export default function Step3Page() {
  const container = useStep3Container()
  
  if (!container.mounted) {
    return null
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex h-full overflow-hidden w-full px-[100px]"
      >
        {/* 왼쪽 패널: 미리보기 + 타임라인 */}
        <div className="flex-[0_0_25%] min-w-[200px] max-w-[350px] border-r border-white flex flex-col overflow-hidden h-full">
          <PreviewPanel
            theme={container.theme}
            pixiContainerRef={container.pixiContainerRef}
            canvasDisplaySize={container.canvasDisplaySize}
            gridOverlaySize={container.gridOverlaySize}
            timelineBarRef={container.timelineBarRef}
            timeline={container.timeline}
            playbackSpeed={container.playbackSpeed}
            currentTime={container.currentTime}
            totalDuration={container.totalDuration}
            progressRatio={container.progressRatio}
            isPlaying={container.isPlaying}
            showReadyMessage={container.showReadyMessage}
            isTtsBootstrapping={container.isTtsBootstrapping}
            isBgmBootstrapping={container.isBgmBootstrapping}
            isPreparing={container.isPreparing}
            isExporting={container.isExporting}
            showGrid={container.showGrid}
            onTimelineMouseDown={container.handleTimelineMouseDown}
            onPlayPause={container.handlePlayPause}
            onExport={container.handleExport}
            onPlaybackSpeedChange={container.handlePlaybackSpeedChange}
            onToggleGrid={() => container.setShowGrid(!container.showGrid)}
            onResizeTemplate={container.handleResizeTemplate}
          />
        </div>

        {/* 중앙 패널: 씬 리스트 */}
        <div className="flex-[0_0_45%] min-w-[400px] border-r border-white flex flex-col overflow-hidden h-full mr-6">
          <SceneListPanel
            theme={container.theme}
            scenes={container.scenes}
            timeline={container.timeline}
            sceneThumbnails={container.sceneThumbnails}
            currentSceneIndex={container.currentSceneIndex}
            selectedPart={container.selectedPart}
            transitionLabels={container.transitionLabels}
            playingSceneIndex={container.playingSceneIndex}
            playingGroupSceneId={container.playingGroupSceneId}
            isPreparing={container.isPreparing}
            isTtsBootstrapping={container.isTtsBootstrapping}
            onSelect={container.handleSceneSelect}
            onScriptChange={container.handleSceneScriptChange}
            onImageFitChange={container.handleSceneImageFitChange}
            onReorder={container.handleSceneReorder}
            onSplitScene={container.handleSceneSplit}
            onDeleteScene={container.handleSceneDelete}
            onDuplicateScene={container.handleSceneDuplicate}
            onTtsPreview={container.handleSceneTtsPreview}
            onSelectPart={container.onSelectPart}
            onDuplicateGroup={container.handleGroupDuplicate}
            onPlayGroup={container.handleGroupPlay}
            onDeleteGroup={container.handleGroupDelete}
            onPlayScene={container.handleScenePlay}
          />
        </div>

        {/* 오른쪽 패널: 효과 설정 */}
        <div className="flex-[0_0_40%] min-w-[300px] max-w-[580px] flex flex-col overflow-hidden h-full">
          <EffectsPanel
            theme={container.theme}
            rightPanelTab={container.rightPanelTab}
            setRightPanelTab={container.setRightPanelTab}
            timeline={container.timeline}
            currentSceneIndex={container.currentSceneIndex}
            allTransitions={container.allTransitions}
            transitions={container.transitions}
            movements={container.movements}
            onTransitionChange={container.handleSceneTransitionChange}
            bgmTemplate={container.bgmTemplate}
            setBgmTemplate={container.setBgmTemplate}
            confirmedBgmTemplate={container.confirmedBgmTemplate}
            onBgmConfirm={container.handleBgmConfirm}
            setTimeline={container.setTimeline}
          />
        </div>
      </motion.div>
    </div>
  )
}
