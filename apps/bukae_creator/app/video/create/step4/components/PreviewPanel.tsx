'use client'

import React, { memo } from 'react'
import { Play, Pause, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/utils/timeline'
import type { TimelineData } from '@/store/useVideoCreateStore'

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
  onTimelineMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onPlayPause: () => void
  onExport: () => void
  onPlaybackSpeedChange: (speed: number) => void
}

export const PreviewPanel = memo(function PreviewPanel({
  theme,
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
  onTimelineMouseDown,
  onPlayPause,
  onExport,
  onPlaybackSpeedChange,
}: PreviewPanelProps) {
  const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
  const actualTime = currentTime / speed
  const actualDuration = totalDuration / speed
  const totalTime = totalDuration / speed

  const speedValue = (() => {
    if (speed === 1 || speed === 1.0) return "1"
    if (speed === 2 || speed === 2.0) return "2"
    return String(speed)
  })()

  return (
    <>
      <div className="p-4 border-b shrink-0 flex items-center" style={{
        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        minHeight: '64px',
        marginTop: '7px',
      }}>
        <div className="flex items-center justify-between w-full">
          <h2 className="text-lg font-semibold" style={{
            color: theme === 'dark' ? '#ffffff' : '#111827'
          }}>
            미리보기
          </h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
        {/* PixiJS 미리보기 - 9:16 비율 고정 (1080x1920) */}
        <div 
          className="flex-1 flex items-center justify-center rounded-lg overflow-hidden min-h-0"
        >
          <div
            ref={pixiContainerRef}
            className="relative bg-black"
            style={{ 
              width: canvasDisplaySize ? `${canvasDisplaySize.width}px` : '100%',
              height: canvasDisplaySize ? `${canvasDisplaySize.height}px` : '100%',
              aspectRatio: canvasDisplaySize ? undefined : '9 / 16',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            {/* 격자 오버레이 (크기 조정하기 템플릿 가이드) */}
            {gridOverlaySize && (
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
                  <span className="absolute top-1 left-1 text-xs text-green-400 bg-black/50 px-1 rounded">
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
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-blue-400 bg-black/50 px-1 rounded whitespace-nowrap">
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

        {/* 재생 컨트롤 */}
        <div className="space-y-2">
          <div 
            className="flex items-center justify-between text-xs" 
            style={{
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}
          >
            <span>{formatTime(actualTime)}</span>
            <span>{formatTime(actualDuration)}</span>
          </div>
          
          <div
            ref={timelineBarRef}
            className="w-full h-2 rounded-full cursor-pointer relative"
            style={{
              backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb'
            }}
            onMouseDown={onTimelineMouseDown}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressRatio * 100}%`,
                backgroundColor: '#8b5cf6',
                transition: isPlaying ? 'none' : 'width 0.1s ease-out'
              }}
            />
          </div>

          <div className="flex items-center gap-2 relative">
            {showReadyMessage && (
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-50 animate-bounce">
                재생이 가능해요!
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-600"></div>
              </div>
            )}
            <Button
              onClick={onPlayPause}
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isTtsBootstrapping || isBgmBootstrapping || isPreparing}
            >
              {isTtsBootstrapping || isBgmBootstrapping || isPreparing ? (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  로딩중…
                </>
              ) : isPlaying ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  일시정지
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  재생
                </>
              )}
            </Button>
            <Button
              onClick={onExport}
              disabled={isExporting}
              size="sm"
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  제작 시작 중...
                </>
              ) : (
                '내보내기'
              )}
            </Button>
          </div>
        
          {/* 배속 선택 */}
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}>
              배속:
            </label>
            <select
              value={speedValue}
              onChange={(e) => onPlaybackSpeedChange(parseFloat(e.target.value))}
              className="flex-1 px-2 py-1 rounded border text-xs"
              style={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                color: theme === 'dark' ? '#ffffff' : '#111827'
              }}
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
            <span className="text-xs" style={{
              color: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}>
              실제 재생: {formatTime(totalTime)}
            </span>
          </div>
        </div>
      </div>
    </>
  )
})

