'use client'

import { memo } from 'react'
import { TimelineBar, SpeedSelector, ExportButton } from './index'
import { useTimelineDrag } from '../hooks/playback/useTimelineDrag'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface ProPreviewPanelProps {
  playbackContainerRef: React.RefObject<HTMLDivElement | null>
  pixiContainerRef: React.RefObject<HTMLDivElement | null>
  timelineBarRef: React.RefObject<HTMLDivElement | null>
  currentTime: number
  totalDuration: number
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  canvasDisplaySize: { width: number; height: number } | null
  handlePlayPause: () => void | Promise<void>
  handleTimelineSeek: (ratio: number) => void
  handleSceneImageFitChange: (index: number, fit: 'cover' | 'contain' | 'fill') => void
  timeline: TimelineData | null
  isPlaying: boolean
  isPreparing?: boolean
  bgmTemplate?: string | null
  confirmedBgmTemplate?: string | null
  currentVideoUrl?: string | null
  currentImageUrl?: string | null
  currentSceneIndex: number
  onExport?: () => void
  isExporting?: boolean
}

export const ProPreviewPanel = memo(function ProPreviewPanel({
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
  isPlaying,
  isPreparing = false,
  bgmTemplate,
  confirmedBgmTemplate,
  currentVideoUrl,
  currentImageUrl,
  currentSceneIndex,
  onExport,
  isExporting = false,
}: ProPreviewPanelProps) {
  const { handleTimelineMouseDown } = useTimelineDrag(timelineBarRef, handleTimelineSeek)

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
          {!currentVideoUrl && !currentImageUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 z-20 pointer-events-none">
              미디어 없음
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
          isPreparing={isPreparing}
          onTimelineMouseDown={handleTimelineMouseDown}
          bgmTemplate={confirmedBgmTemplate ?? bgmTemplate}
          onPlayPause={handlePlayPause}
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
