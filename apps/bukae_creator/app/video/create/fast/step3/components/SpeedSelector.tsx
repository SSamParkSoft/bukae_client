'use client'

import React, { memo } from 'react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface SpeedSelectorProps {
  playbackSpeed: number
  totalDuration: number
  onPlaybackSpeedChange: (speed: number) => void
  onResizeTemplate?: () => void
  onImageFitChange?: (index: number, fit: 'cover' | 'contain' | 'fill') => void
  currentSceneIndex?: number
  timeline?: { scenes?: Array<{ imageFit?: 'cover' | 'contain' | 'fill' }> } | null
}

export const SpeedSelector = memo(function SpeedSelector({
  playbackSpeed,
  totalDuration,
  onPlaybackSpeedChange,
  onResizeTemplate,
  onImageFitChange,
  currentSceneIndex = 0,
  timeline,
}: SpeedSelectorProps) {
  const speed = playbackSpeed ?? 1.0

  const speedValue = (() => {
    if (speed === 1 || speed === 1.0) return "1.00"
    if (speed === 2 || speed === 2.0) return "2.00"
    return speed.toFixed(2)
  })()

  return (
    <div className="w-full space-y-3">
      {/* 속도/비율/타입 선택 버튼들 - 피그마 디자인대로 3개 가로 배치 */}
      <div className="flex items-center gap-3">
        {/* 속도 버튼 */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex-1 h-10 bg-white border border-[#d6d6d6] rounded-lg flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-1 rounded px-1.5 py-0.5">
                <span 
                  className="font-medium text-[#111111] tracking-[-0.14px]"
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: '19.6px'
                  }}
                >
                  {speedValue}x
                </span>
                <ChevronDown className="w-3 h-3 text-[#111111]" />
              </div>
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

        {/* 비율 버튼 */}
        {onImageFitChange && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex-1 h-10 bg-white border border-[#d6d6d6] rounded-lg flex items-center justify-center gap-0 hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-1 rounded px-1.5 py-0.5">
                  <Image 
                    src="/icons/ratio.svg" 
                    alt="비율" 
                    width={16} 
                    height={16}
                    className="w-4 h-4"
                  />
                  <span 
                    className="font-medium text-[#111111] tracking-[-0.14px]"
                    style={{ 
                      fontSize: 'var(--font-size-14)',
                      lineHeight: '19.6px'
                    }}
                  >
                    비율
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#111111]" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-40 p-1"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onImageFitChange) {
                      onImageFitChange(currentSceneIndex, 'fill')
                    }
                  }}
                  className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                    timeline?.scenes?.[currentSceneIndex]?.imageFit === 'fill' ? 'bg-gray-100 font-semibold' : ''
                  }`}
                >
                  늘려 채우기
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onImageFitChange) {
                      onImageFitChange(currentSceneIndex, 'contain')
                    }
                  }}
                  className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                    timeline?.scenes?.[currentSceneIndex]?.imageFit === 'contain' ? 'bg-gray-100 font-semibold' : ''
                  }`}
                >
                  비율 맞춰 채우기
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onImageFitChange) {
                      onImageFitChange(currentSceneIndex, 'cover')
                    }
                  }}
                  className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                    timeline?.scenes?.[currentSceneIndex]?.imageFit === 'cover' ? 'bg-gray-100 font-semibold' : ''
                  }`}
                >
                  꽉 채우기
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 타입 버튼 */}
        <button
          type="button"
          className="flex-1 h-10 bg-white border border-[#d6d6d6] rounded-lg flex items-center justify-center hover:bg-gray-50 transition-all"
        >
          <div className="flex items-center gap-1 rounded px-1.5 py-0.5">
            <Image 
              src="/icons/type.svg" 
              alt="타입" 
              width={16} 
              height={16}
              className="w-4 h-4"
            />
            <span 
              className="font-medium text-[#111111] tracking-[-0.14px]"
              style={{ 
                fontSize: 'var(--font-size-14)',
                lineHeight: '19.6px'
              }}
            >
              타입
            </span>
            <ChevronDown className="w-3 h-3 text-[#111111]" />
          </div>
        </button>
      </div>
    </div>
  )
})
