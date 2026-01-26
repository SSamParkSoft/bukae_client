'use client'

import React, { memo } from 'react'
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
}

export const TimelineBar = memo(function TimelineBar({
  timelineBarRef,
  currentTime,
  totalDuration,
  progressRatio,
  playbackSpeed,
  isPlaying,
  onTimelineMouseDown,
}: TimelineBarProps) {
  // 배속 적용된 실제 시간 계산
  const actualTime = currentTime / playbackSpeed
  const actualDuration = totalDuration / playbackSpeed

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span 
          className="font-medium text-[#2c2c2c] tracking-[-0.32px]"
          style={{ 
            fontSize: 'var(--font-size-12)',
            lineHeight: 'var(--line-height-16-140)'
          }}
        >
          {formatTime(actualTime)}
        </span>
        <span 
          className="font-medium text-[#2c2c2c] tracking-[-0.32px]"
          style={{ 
            fontSize: 'var(--font-size-12)',
            lineHeight: 'var(--line-height-16-140)'
          }}
        >
          {formatTime(actualDuration)}
        </span>
      </div>
      
      <div className="relative">
        <div
          ref={timelineBarRef}
          className="w-full h-1 bg-white rounded-full cursor-pointer relative shadow-sm hover:shadow-md transition-shadow group"
          onMouseDown={onTimelineMouseDown}
        >
          <div
            className="h-full rounded-full bg-brand-teal transition-all"
            style={{
              width: `${progressRatio * 100}%`,
              transition: isPlaying ? 'none' : 'width 0.1s ease-out'
            }}
          />
          {/* 진행 위치 표시 핸들 */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-brand-teal rounded-full border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: `${progressRatio * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
})
