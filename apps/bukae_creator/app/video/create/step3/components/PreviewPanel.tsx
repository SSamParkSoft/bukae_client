'use client'

import React, { memo, useMemo, useState, useEffect } from 'react'
import { Play, Pause, Clock, Loader2, Grid3x3, Upload, ChevronDown, RotateCcw, Info } from 'lucide-react'
import { formatTime, calculateTotalDuration } from '@/utils/timeline'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
  currentSceneIndex?: number
  textsRef?: React.MutableRefObject<Map<number, PIXI.Text>>
  appRef?: React.RefObject<PIXI.Application | null>
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
  currentSceneIndex = 0,
  textsRef,
  appRef,
}: PreviewPanelProps) {
  const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  
  // 최신 timeline의 totalDuration 계산 (TTS 합성으로 duration이 업데이트되었을 수 있음)
  // 배속과는 무관하게 항상 동일한 값이어야 함
  const latestTotalDuration = useMemo(() => {
    if (timeline) {
      return calculateTotalDuration(timeline)
    }
    return totalDuration
  }, [timeline, totalDuration])
  
  // 최신 totalDuration을 사용한 progressRatio 계산
  // 배속과는 무관하게 항상 동일한 값이어야 함
  const latestProgressRatio = useMemo(() => {
    if (latestTotalDuration === 0) return 0
    return Math.min(1, currentTime / latestTotalDuration)
  }, [currentTime, latestTotalDuration])
  
  // 배속 변경 시에도 다시 계산되도록 speed를 의존성에 포함
  const actualTime = useMemo(() => currentTime / speed, [currentTime, speed])
  const actualDuration = useMemo(() => latestTotalDuration / speed, [latestTotalDuration, speed])
  const totalTime = useMemo(() => latestTotalDuration / speed, [latestTotalDuration, speed])

  const speedValue = (() => {
    if (speed === 1 || speed === 1.0) return "1.00"
    if (speed === 2 || speed === 2.0) return "2.00"
    return speed.toFixed(2)
  })()

  // 캔버스의 실제 너비를 측정
  const [canvasActualWidth, setCanvasActualWidth] = useState<number | null>(null)
  
  useEffect(() => {
    if (!pixiContainerRef.current) return

    const updateCanvasWidth = () => {
      if (pixiContainerRef.current) {
        const width = pixiContainerRef.current.offsetWidth
        setCanvasActualWidth(width)
      }
    }

    // 초기 측정
    updateCanvasWidth()

    // ResizeObserver로 크기 변경 감지
    const resizeObserver = new ResizeObserver(updateCanvasWidth)
    resizeObserver.observe(pixiContainerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [pixiContainerRef, canvasDisplaySize])

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* PixiJS 미리보기 - 9:16 비율 고정 (1080x1920) */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden min-h-0 shrink-0"
        >
          <div
            ref={pixiContainerRef}
            className="relative bg-black mx-auto"
            style={{ 
              width: canvasDisplaySize ? `${canvasDisplaySize.width}px` : 'auto',
              height: canvasDisplaySize ? `${canvasDisplaySize.height}px` : '100%',
              aspectRatio: '9 / 16',
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
        <div 
          className="px-3 py-2 space-y-2 shrink-0 mx-auto"
          style={{
            width: canvasActualWidth ? `${canvasActualWidth}px` : '100%',
            maxWidth: '100%',
          }}
        >
          {/* 타임라인 시간 표시 및 바 */}
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
            
            <div
              ref={timelineBarRef}
              className="w-full h-1 bg-white rounded-full cursor-pointer relative shadow-sm hover:shadow-md transition-shadow group"
              onMouseDown={onTimelineMouseDown}
            >
              <div
                className="h-full rounded-full bg-brand-teal transition-all"
                style={{
                  width: `${latestProgressRatio * 100}%`,
                  transition: isPlaying ? 'none' : 'width 0.1s ease-out'
                }}
              />
              {/* 진행 위치 표시 핸들 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-brand-teal rounded-full border-2 border-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  left: `${latestProgressRatio * 100}%`,
                }}
              />
            </div>
          </div>

          {/* 버튼들: 재생, 격자, 크기 조정 */}
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

          {/* 배속 선택 및 실제 재생 시간 */}
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

          {/* 내보내기 버튼 */}
          <button
            onClick={onExport}
            disabled={isExporting}
            className="w-full h-9 bg-[#5e8790] text-white rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-[#5e8790]/90"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span 
                  className="font-bold tracking-[-0.32px] text-xs"
                  style={{ 
                    fontSize: '12px',
                    lineHeight: '16px'
                  }}
                >
                  제작 시작 중...
                </span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span 
                  className="font-bold tracking-[-0.32px] text-xs"
                  style={{ 
                    fontSize: '12px',
                    lineHeight: '16px'
                  }}
                >
                  내보내기
                </span>
              </>
            )}
          </button>
        </div>
    </div>
  )
})

