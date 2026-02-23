'use client'

import { memo } from 'react'
import { TimelineBar, SpeedSelector, ExportButton } from '@/app/video/create/step3/shared/ui'
import { useProStep3Container } from '../hooks/useProStep3Container'
import type { ProStep3Scene } from '../model/types'

interface ProPreviewPanelProps {
  currentVideoUrl?: string | null
  currentSelectionStartSeconds?: number
  currentSceneIndex?: number
  scenes: ProStep3Scene[]
  isPlaying: boolean
  onBeforePlay?: () => boolean
  onPlayingChange?: (isPlaying: boolean) => void
  bgmTemplate?: string | null
  onExport?: () => void
  isExporting?: boolean
}

export const ProPreviewPanel = memo(function ProPreviewPanel({
  currentVideoUrl,
  currentSceneIndex = 0,
  scenes,
  isPlaying,
  onBeforePlay,
  onPlayingChange,
  bgmTemplate,
  onExport,
  isExporting = false,
}: ProPreviewPanelProps) {
  const container = useProStep3Container({
    scenes,
    currentSceneIndex,
    isPlaying,
    onBeforePlay,
    onPlayingChange,
  })

  const {
    playbackContainerRef,
    pixiContainerRef,
    timelineBarRef,
    currentTime,
    totalDuration,
    playbackSpeed,
    setPlaybackSpeed,
    canvasDisplaySize,
    handlePlayPause,
    handleSceneImageFitChange,
    timeline,
  } = container

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0 shrink-0 mb-4">
        <div
          ref={playbackContainerRef}
          className="relative bg-black rounded-2xl overflow-hidden mx-auto"
          style={{
            width: canvasDisplaySize ? `${canvasDisplaySize.width}px` : '100%',
            height: canvasDisplaySize ? `${canvasDisplaySize.height}px` : 'auto',
            aspectRatio: '9 / 16',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <div ref={pixiContainerRef} className="absolute inset-0 z-10" />
          {!currentVideoUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 z-20 pointer-events-none">
              비디오 없음
            </div>
          )}
        </div>
      </div>

      <div className="w-full shrink-0 space-y-3">
        <TimelineBar
          timelineBarRef={timelineBarRef}
          currentTime={currentTime}
          totalDuration={totalDuration}
          progressRatio={totalDuration > 0 ? currentTime / totalDuration : 0}
          playbackSpeed={playbackSpeed}
          isPlaying={isPlaying}
          onTimelineMouseDown={() => {
            // Pro step3에서는 수동 seek 미지원
          }}
          timeline={null}
          bgmTemplate={bgmTemplate}
          showGrid={false}
          onPlayPause={handlePlayPause}
          isTtsBootstrapping={false}
          isBgmBootstrapping={false}
          isPreparing={false}
        />

        <SpeedSelector
          playbackSpeed={playbackSpeed}
          totalDuration={totalDuration}
          onPlaybackSpeedChange={setPlaybackSpeed}
          onResizeTemplate={() => {
            // Pro step3에서는 미지원
          }}
          onImageFitChange={handleSceneImageFitChange}
          currentSceneIndex={currentSceneIndex}
          timeline={timeline}
        />

        {onExport && (
          <div className="mb-2">
            <ExportButton isExporting={isExporting} onExport={onExport} />
          </div>
        )}
      </div>
    </div>
  )
})
