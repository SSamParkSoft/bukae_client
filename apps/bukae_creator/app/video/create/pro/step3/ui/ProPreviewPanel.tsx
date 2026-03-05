'use client'

import { memo, useCallback, useRef } from 'react'
import { TimelineBar, SpeedSelector, ExportButton } from '../shared/ui'
import { useProStep3Container } from '../hooks/useProStep3Container'
import type { ProStep3Scene } from '../model/types'

interface ProPreviewPanelProps {
  currentVideoUrl?: string | null
  currentSelectionStartSeconds?: number
  currentSceneIndex?: number
  scenes: ProStep3Scene[]
  scenePlaybackRequest?: { sceneIndex: number; requestId: number } | null
  isPlaying: boolean
  onBeforePlay?: () => boolean
  onPlayingChange?: (isPlaying: boolean) => void
  onScenePlaybackComplete?: () => void
  bgmTemplate?: string | null
  confirmedBgmTemplate?: string | null
  onExport?: () => void
  isExporting?: boolean
}

export const ProPreviewPanel = memo(function ProPreviewPanel({
  currentVideoUrl,
  currentSceneIndex = 0,
  scenes,
  scenePlaybackRequest,
  isPlaying,
  onBeforePlay,
  onPlayingChange,
  onScenePlaybackComplete,
  bgmTemplate,
  confirmedBgmTemplate,
  onExport,
  isExporting = false,
}: ProPreviewPanelProps) {
  const container = useProStep3Container({
    scenes,
    currentSceneIndex,
    isPlaying,
    scenePlaybackRequest,
    confirmedBgmTemplate,
    onBeforePlay,
    onPlayingChange,
    onScenePlaybackComplete,
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
    handleTimelineSeek,
    handleSceneImageFitChange,
    timeline,
  } = container

  const isDraggingTimelineRef = useRef(false)

  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = timelineBarRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      handleTimelineSeek(ratio)
      isDraggingTimelineRef.current = true

      const onMove = (moveEvent: MouseEvent) => {
        const bar = timelineBarRef.current
        if (!bar) return
        const rct = bar.getBoundingClientRect()
        const r = Math.max(0, Math.min(1, (moveEvent.clientX - rct.left) / rct.width))
        handleTimelineSeek(r)
      }
      const onUp = () => {
        isDraggingTimelineRef.current = false
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [timelineBarRef, handleTimelineSeek]
  )

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
          onTimelineMouseDown={handleTimelineMouseDown}
          timeline={null}
          bgmTemplate={confirmedBgmTemplate ?? bgmTemplate}
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
