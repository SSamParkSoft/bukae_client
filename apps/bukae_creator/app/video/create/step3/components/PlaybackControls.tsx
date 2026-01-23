'use client'

import React, { memo, useState } from 'react'
import { Play, Pause, Clock, Grid3x3, RotateCcw, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PlaybackControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  showGrid?: boolean
  onToggleGrid?: () => void
  onResizeTemplate?: () => void
  isTtsBootstrapping: boolean
  isBgmBootstrapping: boolean
  isPreparing: boolean
  showReadyMessage: boolean
}

export const PlaybackControls = memo(function PlaybackControls({
  isPlaying,
  onPlayPause,
  showGrid = false,
  onToggleGrid,
  onResizeTemplate,
  isTtsBootstrapping,
  isBgmBootstrapping,
  isPreparing,
  showReadyMessage,
}: PlaybackControlsProps) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  return (
    <div className="flex items-center gap-1 relative">
      {showReadyMessage && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-2 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-50 animate-bounce">
          재생이 가능해요!
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-600"></div>
        </div>
      )}
      <button
        onClick={onPlayPause}
        disabled={isTtsBootstrapping || isBgmBootstrapping || isPreparing}
        className="flex-1 h-7 bg-white border border-[#d6d6d6] rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-gray-50"
      >
        {isTtsBootstrapping || isBgmBootstrapping || isPreparing ? (
          <>
            <Clock className="w-6 h-6 text-[#111111]" />
            <span 
              className="font-medium text-[#111111] tracking-[-0.14px] text-xs"
              style={{ 
                fontSize: '12px',
                lineHeight: '16px'
              }}
            >
              로딩중…
            </span>
          </>
        ) : isPlaying ? (
          <>
            <Pause className="w-4 h-4 text-[#111111]" />
            <span 
              className="font-medium text-[#111111] tracking-[-0.14px] text-xs"
              style={{ 
                fontSize: '11px',
                lineHeight: '15px'
              }}
            >
              일시정지
            </span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 text-[#111111]" />
            <span 
              className="font-medium text-[#111111] tracking-[-0.14px] text-xs"
              style={{ 
                fontSize: '11px',
                lineHeight: '15px'
              }}
            >
              재생
            </span>
          </>
        )}
      </button>
      {onToggleGrid && (
        <button
          onClick={onToggleGrid}
          className={`flex-1 h-7 rounded-lg flex items-center justify-center gap-1 transition-all ${
            showGrid 
              ? 'bg-brand-teal text-white' 
              : 'bg-white border border-[#d6d6d6] text-[#111111] hover:bg-gray-50'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          <span 
            className="font-medium tracking-[-0.14px] text-xs"
            style={{ 
              fontSize: '11px',
              lineHeight: '15px'
            }}
          >
            격자
          </span>
        </button>
      )}
      {onResizeTemplate && (
        <>
          <button
            onClick={() => setIsResetDialogOpen(true)}
            className="flex-1 h-7 bg-white border border-[#d6d6d6] rounded-lg flex items-center justify-center gap-1 transition-all hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4 text-[#111111]" />
            <span 
              className="font-medium text-[#111111] tracking-[-0.14px] text-xs"
              style={{ 
                fontSize: '11px',
                lineHeight: '15px'
              }}
            >
              초기화
            </span>
          </button>
          <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <DialogContent 
              style={{ width: '100%', maxWidth: '448px' }}
            >
              <DialogHeader className="text-left" style={{ width: '100%' }}>
                <DialogTitle 
                  style={{
                    fontSize: '18px',
                    lineHeight: '25.2px',
                    fontWeight: '600',
                    display: 'block',
                    width: '100%',
                    whiteSpace: 'normal',
                    wordBreak: 'keep-all'
                  }}
                >
                  초기화하시겠어요?
                </DialogTitle>
                <DialogDescription 
                  style={{
                    fontSize: '14px',
                    lineHeight: '19.6px',
                    display: 'block',
                    width: '100%',
                    whiteSpace: 'normal',
                    wordBreak: 'keep-all',
                    marginTop: '8px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Info className="w-3 h-3 shrink-0" />
                    <span>전체 Scene의 이미지와 자막를 초기화해요!</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Info className="w-3 h-3 shrink-0" />
                    <span>적용된 효과와 bgm은 초기화되지 않아요!</span>
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0" style={{ width: '100%' }}>
                <Button 
                  variant="outline" 
                  onClick={() => setIsResetDialogOpen(false)}
                >
                  취소
                </Button>
                <Button 
                  onClick={() => {
                    setIsResetDialogOpen(false)
                    onResizeTemplate()
                  }}
                >
                  확정하기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
})
