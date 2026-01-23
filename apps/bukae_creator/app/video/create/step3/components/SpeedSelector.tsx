'use client'

import React, { memo } from 'react'
import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatTime } from '@/utils/timeline'

interface SpeedSelectorProps {
  playbackSpeed: number
  totalDuration: number
  onPlaybackSpeedChange: (speed: number) => void
}

export const SpeedSelector = memo(function SpeedSelector({
  playbackSpeed,
  totalDuration,
  onPlaybackSpeedChange,
}: SpeedSelectorProps) {
  const speed = playbackSpeed ?? 1.0

  const speedValue = (() => {
    if (speed === 1 || speed === 1.0) return "1.00"
    if (speed === 2 || speed === 2.0) return "2.00"
    return speed.toFixed(2)
  })()

  const totalTime = totalDuration / speed

  return (
    <div className="flex items-center justify-between gap-1.5">
      <div className="flex items-center gap-1">
        <span 
          className="font-medium text-[#2c2c2c] tracking-[-0.32px] text-xs"
          style={{ 
            fontSize: '11px',
            lineHeight: '15px'
          }}
        >
          배속:
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-[60px] h-6 bg-[#e3e3e3] border border-[#d6d6d6] rounded-lg flex items-center justify-between px-1.5 hover:bg-gray-200 transition-all"
            >
              <span 
                className="font-medium text-[#5d5d5d] tracking-[-0.14px] text-xs"
                style={{ 
                  fontSize: '11px',
                  lineHeight: '15px'
                }}
              >
                {speedValue}x
              </span>
              <ChevronDown className="w-3 h-3 text-[#5d5d5d]" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-32 p-1"
            align="start"
          >
            <div className="flex flex-col">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speedOption) => (
                <button
                  key={speedOption}
                  type="button"
                  onClick={() => {
                    onPlaybackSpeedChange(speedOption)
                  }}
                  className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                    Math.abs(speed - speedOption) < 0.01 ? 'bg-gray-100 font-semibold' : ''
                  }`}
                >
                  {speedOption === 1.0 ? '1.00' : speedOption === 2.0 ? '2.00' : speedOption.toFixed(2)}x
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-1">
        <span 
          className="font-medium text-[#2c2c2c] tracking-[-0.32px] text-xs"
          style={{ 
            fontSize: '11px',
            lineHeight: '15px'
          }}
        >
          실제 재생:
        </span>
        <span 
          className="font-medium text-[#2c2c2c] tracking-[-0.32px] text-xs"
          style={{ 
            fontSize: '11px',
            lineHeight: '15px'
          }}
        >
          {formatTime(totalTime)}
        </span>
      </div>
    </div>
  )
})
