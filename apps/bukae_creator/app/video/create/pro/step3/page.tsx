'use client'

import { motion } from 'framer-motion'
import { useStep3Container } from '../../fast/step3/hooks/useStep3Container'
import { PreviewPanel } from '../../fast/step3/components/PreviewPanel'
import { ProSceneListPanel, type ProStep3Scene } from './components/ProSceneListPanel'
import { ProEffectsPanel } from './components/ProEffectsPanel'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { useMemo } from 'react'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'

// Pro step2에서 사용하는 확장된 Scene 타입
type ProScene = {
  id: string
  script: string
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number
  videoUrl?: string | null
}

// SceneScript를 ProScene으로 변환
function sceneScriptToProScene(s: SceneScript, index: number): ProScene {
  // SceneScript의 확장된 필드 확인 (localStorage에서 복원된 데이터)
  const extended = s as SceneScript & {
    id?: string
    voiceLabel?: string
    voiceTemplate?: string | null
    ttsDuration?: number
    videoUrl?: string | null
    selectionStartSeconds?: number
    selectionEndSeconds?: number
  }

  return {
    id: extended.id || `scene-${index}`,
    script: s.script || '',
    voiceLabel: extended.voiceLabel,
    voiceTemplate: extended.voiceTemplate,
    ttsDuration: extended.ttsDuration,
    videoUrl: extended.videoUrl,
  }
}

export default function ProStep3Page() {
  const container = useStep3Container()
  const { scenes: storeScenes } = useVideoCreateStore()

  // store의 scenes를 ProScene으로 변환
  const proScenes: ProScene[] = useMemo(() => {
    return storeScenes && storeScenes.length > 0
      ? storeScenes.map((s, index) => sceneScriptToProScene(s, index))
      : []
  }, [storeScenes])

  // ProStep3Scene으로 변환 (selectionStartSeconds, selectionEndSeconds는 기본값 사용)
  const proStep3Scenes: ProStep3Scene[] = useMemo(() => {
    return proScenes.map((scene, index) => {
      const extended = scene as ProScene & {
        selectionStartSeconds?: number
        selectionEndSeconds?: number
      }

      // selectionStartSeconds와 selectionEndSeconds가 없으면 기본값 사용
      // ttsDuration을 기준으로 선택 영역 설정 (0부터 ttsDuration까지)
      const ttsDuration = scene.ttsDuration || 10
      const selectionStartSeconds = extended.selectionStartSeconds ?? 0
      const selectionEndSeconds = extended.selectionEndSeconds ?? ttsDuration

      return {
        id: scene.id,
        script: scene.script,
        videoUrl: scene.videoUrl,
        selectionStartSeconds,
        selectionEndSeconds,
        voiceLabel: scene.voiceLabel,
        voiceTemplate: scene.voiceTemplate,
        ttsDuration: scene.ttsDuration,
      }
    })
  }, [proScenes])

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
            <ProSceneListPanel
              theme={container.theme}
              scenes={proStep3Scenes}
              timeline={container.timeline}
              currentSceneIndex={container.currentSceneIndex}
              playingSceneIndex={container.playingSceneIndex}
              isPreparing={container.isPreparing}
              isTtsBootstrapping={container.isTtsBootstrapping}
              onSelect={container.handleSceneSelect}
              onReorder={container.handleSceneReorder}
              onPlayScene={container.handleScenePlay}
              onOpenEffectPanel={(tab) => {
                // 'voice' 탭은 Pro에서는 사용하지 않으므로 'animation'으로 변경
                const mappedTab = tab === 'voice' ? 'animation' : tab
                container.setRightPanelTab(mappedTab)
              }}
            />
          </div>

          {/* 오른쪽 패널: 효과 설정 */}
          <div className="w-full lg:w-[30%] min-w-[350px] flex flex-col overflow-hidden lg:h-full shrink-0">
            <ProEffectsPanel
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
              onMotionChange={container.handleSceneMotionChange}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
