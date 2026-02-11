'use client'

import React, { memo } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { TimelineBar, SpeedSelector, ExportButton } from '@/app/video/create/step3/shared/ui'
import * as PIXI from 'pixi.js'

interface PreviewPanelProps {
  theme: string | undefined
  pixiContainerRef: React.RefObject<HTMLDivElement | null>
  canvasDisplaySize: { width: number; height: number } | null
  gridOverlaySize: { width: number; height: number } | null
  timelineBarRef: React.RefObject<HTMLDivElement | null>
  timeline: TimelineData | null
  playbackSpeed: number
  currentTime: number
  totalDuration: number
  progressRatio: number
  isPlaying: boolean
  showReadyMessage: boolean
  isTtsBootstrapping: boolean
  isBgmBootstrapping: boolean
  isPreparing: boolean
  isExporting: boolean
  showGrid?: boolean
  onTimelineMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onPlayPause: () => void
  onExport: () => void
  onPlaybackSpeedChange: (speed: number) => void
  onToggleGrid?: () => void
  onResizeTemplate?: () => void
  onImageFitChange?: (index: number, fit: 'cover' | 'contain' | 'fill') => void
  currentSceneIndex?: number
  textsRef?: React.MutableRefObject<Map<number, PIXI.Text>>
  appRef?: React.RefObject<PIXI.Application | null>
  bgmTemplate?: string | null
}

export const PreviewPanel = memo(function PreviewPanel({
  pixiContainerRef,
  canvasDisplaySize,
  gridOverlaySize,
  timelineBarRef,
  timeline,
  playbackSpeed,
  currentTime,
  totalDuration,
  progressRatio,
  isPlaying,
  showReadyMessage,
  isTtsBootstrapping,
  isBgmBootstrapping,
  isPreparing,
  isExporting,
  showGrid = false,
  onTimelineMouseDown,
  onPlayPause,
  onExport,
  onPlaybackSpeedChange,
  onToggleGrid,
  onResizeTemplate,
  onImageFitChange,
  currentSceneIndex = 0,
  textsRef,
  appRef,
  bgmTemplate,
}: PreviewPanelProps) {
  const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* PixiJS 미리보기 - 9:16 비율 고정 (1080x1920) */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden min-h-0 shrink-0 mb-4"
      >
        <div
          ref={pixiContainerRef}
          className="relative bg-black rounded-2xl overflow-hidden mx-auto"
          style={{ 
            width: canvasDisplaySize ? `${canvasDisplaySize.width}px` : '100%',
            height: canvasDisplaySize ? `${canvasDisplaySize.height}px` : 'auto',
            aspectRatio: '9 / 16',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {/* 격자 오버레이 (크기 조정하기 템플릿 가이드) */}
          {gridOverlaySize && gridOverlaySize.width > 0 && gridOverlaySize.height > 0 && (
            <div 
              className="absolute pointer-events-none z-50"
              style={{ 
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${gridOverlaySize.width}px`,
                height: `${gridOverlaySize.height}px`,
              }}
            >
              {/* 이미지 추천 영역 (녹색) - 상단 15%부터 70% 높이 */}
              <div 
                className="absolute border-2 border-green-500"
                style={{
                  top: '15%',
                  left: '0',
                  right: '0',
                  height: '70%',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                }}
              >
                <span className="absolute top-1 left-1 text-xs text-green-400 bg-black/50 rounded">
                  이미지 영역
                </span>
              </div>
              
              {/* 텍스트 추천 영역 (파란색) - 하단 중앙, 75% 너비 */}
              <div 
                className="absolute border-2 border-blue-500"
                style={{
                  top: '88.5%',
                  left: '12.5%',
                  width: '75%',
                  height: '7%',
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                }}
              >
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-blue-400 bg-black/50 rounded whitespace-nowrap">
                  자막 영역
                </span>
              </div>
              
              {/* 3x3 격자선 (Rule of Thirds) */}
              <div className="absolute inset-0">
                {/* 수직선 */}
                <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/30" />
                <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/30" />
                {/* 수평선 */}
                <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
                <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />
                {/* 중심선 */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/50" />
                <div className="absolute left-0 right-0 top-1/2 h-px bg-white/50" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 재생 컨트롤 - 피그마 디자인대로 */}
      <div className="w-full shrink-0 space-y-3">
        {/* 타임라인 바 - 재생 버튼, 시간 표시, 그리드 버튼 포함 */}
        <TimelineBar
          timelineBarRef={timelineBarRef}
          currentTime={currentTime}
          totalDuration={totalDuration}
          progressRatio={progressRatio}
          playbackSpeed={speed}
          isPlaying={isPlaying}
          onTimelineMouseDown={onTimelineMouseDown}
          timeline={timeline}
          bgmTemplate={bgmTemplate}
          showGrid={showGrid}
          onToggleGrid={onToggleGrid}
          onPlayPause={onPlayPause}
          isTtsBootstrapping={isTtsBootstrapping}
          isBgmBootstrapping={isBgmBootstrapping}
          isPreparing={isPreparing}
        />

        {/* 속도/비율/타입 선택 버튼들 */}
        <SpeedSelector
          playbackSpeed={speed}
          totalDuration={totalDuration}
          onPlaybackSpeedChange={onPlaybackSpeedChange}
          onResizeTemplate={onResizeTemplate}
          onImageFitChange={onImageFitChange}
          currentSceneIndex={currentSceneIndex}
          timeline={timeline}
        />

        {/* 내보내기 버튼 */}
        <div className="mb-2">
          <ExportButton
            isExporting={isExporting}
            onExport={onExport}
          />
        </div>
      </div>
    </div>
  )
})

