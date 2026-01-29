'use client'

import React, { memo } from 'react'
import Image from 'next/image'
import { Pause, Grid3x3 } from 'lucide-react'
import { formatTime } from '@/utils/timeline'

interface TimelineBarProps {
  timelineBarRef: React.RefObject<HTMLDivElement | null>
  currentTime: number
  totalDuration: number
  progressRatio: number
  playbackSpeed: number
  isPlaying: boolean
  onTimelineMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  timeline?: unknown
  bgmTemplate?: string | null
  showGrid?: boolean
  onToggleGrid?: () => void
  onPlayPause?: () => void
  isTtsBootstrapping?: boolean
  isBgmBootstrapping?: boolean
  isPreparing?: boolean
}

export const TimelineBar = memo(function TimelineBar({
  timelineBarRef,
  currentTime,
  totalDuration,
  progressRatio,
  playbackSpeed,
  isPlaying,
  onTimelineMouseDown,
  showGrid = false,
  onToggleGrid,
  onPlayPause,
  isTtsBootstrapping = false,
  isBgmBootstrapping = false,
  isPreparing = false,
}: TimelineBarProps) {
  // 배속 적용된 실제 시간 계산
  const actualTime = currentTime / playbackSpeed
  const actualDuration = totalDuration / playbackSpeed

  return (
    <div className="w-full space-y-2">
      {/* 타임라인 바 */}
      <div className="relative">
        <div
          ref={timelineBarRef}
          className="w-full h-0.5 bg-white rounded-full cursor-pointer relative"
          onMouseDown={onTimelineMouseDown}
        >
          <div
            className="h-full rounded-full bg-brand-teal transition-all"
            style={{
              width: `${progressRatio * 100}%`,
              transition: isPlaying ? 'none' : 'width 0.1s ease-out'
            }}
          />
        </div>
      </div>
      
      {/* 재생 버튼, 시간 표시, 그리드 버튼 */}
      <div className="flex items-center gap-2">
        {/* 재생 버튼과 시간 표시 */}
        <div className="flex items-center gap-2">
          {onPlayPause && (
            <button
              onClick={onPlayPause}
              disabled={isTtsBootstrapping || isBgmBootstrapping || isPreparing}
              className="flex items-center justify-center w-5 h-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-[#454545]" />
              ) : (
                <Image 
                  src="/icons/play.svg" 
                  alt="재생" 
                  width={16} 
                  height={16}
                  className="w-4 h-4"
                />
              )}
            </button>
          )}
          <span 
            className="font-medium text-[#454545] tracking-[-0.28px]"
            style={{ 
              fontSize: 'var(--font-size-14)',
              lineHeight: '19.6px'
            }}
          >
            {formatTime(actualTime)} / {formatTime(actualDuration)}
          </span>
        </div>
        
        {/* 그리드 버튼 */}
        {onToggleGrid && (
          <button
            onClick={onToggleGrid}
            className={`ml-auto flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
              showGrid 
                ? 'bg-white border-[#5e8790]' 
                : 'bg-white border-[#d6d6d6] hover:border-[#5e8790]'
            }`}
          >
            <Grid3x3 className={`w-4 h-4 ${showGrid ? 'text-[#5e8790]' : 'text-[#454545]'}`} />
          </button>
        )}
      </div>
    </div>
  )
})
