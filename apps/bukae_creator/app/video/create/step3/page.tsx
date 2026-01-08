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
    <div className="flex flex-col h-screen overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex overflow-hidden"
        style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}
      >
        <div className="flex-1 flex overflow-hidden h-full" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* 왼쪽 패널: 미리보기 + 타임라인 */}
        <div className="w-[30%] border-r flex flex-col h-full overflow-hidden" style={{
          borderColor: container.theme === 'dark' ? '#374151' : '#e5e7eb',
          backgroundColor: container.theme === 'dark' ? '#111827' : '#ffffff'
        }}>
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
            onTimelineMouseDown={container.handleTimelineMouseDown}
            onPlayPause={container.handlePlayPause}
            onExport={container.handleExport}
            onPlaybackSpeedChange={container.handlePlaybackSpeedChange}
          />
        </div>

        {/* 중앙 패널: 씬 리스트 */}
        <div className="w-[40%] border-r flex flex-col h-full overflow-hidden" style={{
          borderColor: container.theme === 'dark' ? '#374151' : '#e5e7eb',
          backgroundColor: container.theme === 'dark' ? '#111827' : '#ffffff'
        }}>
          <SceneListPanel
            theme={container.theme}
            scenes={container.scenes}
            timeline={container.timeline}
            sceneThumbnails={container.sceneThumbnails}
            currentSceneIndex={container.currentSceneIndex}
            selectedPart={container.selectedPart}
            showGrid={container.showGrid}
            stageDimensions={container.stageDimensions}
            transitionLabels={container.transitionLabels}
            playingSceneIndex={container.playingSceneIndex}
            playingGroupSceneId={container.playingGroupSceneId}
            isPreparing={container.isPreparing}
            isTtsBootstrapping={container.isTtsBootstrapping}
            onToggleGrid={() => container.setShowGrid(!container.showGrid)}
            onResizeTemplate={container.handleResizeTemplate}
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
        <div className="w-[30%] flex flex-col h-full overflow-hidden" style={{
          borderColor: container.theme === 'dark' ? '#374151' : '#e5e7eb',
          backgroundColor: container.theme === 'dark' ? '#111827' : '#ffffff',
          maxWidth: '30%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}>
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
        </div>
      </motion.div>
    </div>
  )
}
