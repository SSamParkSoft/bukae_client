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
          {/* 왼쪽 패널: 미리보기 + 타임라인 */}
          <div className="w-full lg:w-[25%] min-w-[250px] flex flex-col overflow-hidden lg:h-full">
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
            onImageFitChange={container.handleSceneImageFitChange}
            currentSceneIndex={container.currentSceneIndex}
            textsRef={container.textsRef}
            appRef={container.appRef}
            bgmTemplate={container.bgmTemplate}
          />
          </div>

          {/* 중앙 패널: 씬 리스트 */}
          <div className="w-full lg:w-[45%] min-w-[480px] flex flex-col overflow-hidden lg:h-full shrink-0 lg:mr-2">
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
            voiceTemplate={container.voiceTemplate}
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
            onVoiceTemplateChange={container.handleSceneVoiceTemplateChange}
            onOpenEffectPanel={(tab) => container.setRightPanelTab(tab)}
          />
          </div>

          {/* 오른쪽 패널: 효과 설정 */}
          <div className="w-full lg:w-[30%] min-w-[350px] flex flex-col overflow-hidden lg:h-full shrink-0">
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
            soundEffect={container.soundEffect}
            setSoundEffect={container.setSoundEffect}
            confirmedSoundEffect={container.confirmedSoundEffect}
            onSoundEffectConfirm={container.handleSoundEffectConfirm}
            setTimeline={container.setTimeline}
            showVoiceRequiredMessage={container.showVoiceRequiredMessage}
            scenesWithoutVoice={container.scenesWithoutVoice}
            globalVoiceTemplate={container.voiceTemplate}
            onVoiceTemplateChange={container.handleSceneVoiceTemplateChange}
            onMotionChange={container.handleSceneMotionChange}
          />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
