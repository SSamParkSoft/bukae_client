'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { GripVertical, Pause, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTime } from '@/utils/timeline'
import { transitionLabels } from '@/lib/data/transitions'
import { findSoundEffectMetadataByPath } from '@/lib/data/sound-effects'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import type { TimelineScene } from '@/lib/types/domain/timeline'

const ICONS = {
  play: '/icons/play.svg',
  transition: '/icons/transition.svg',
  subtitle: '/icons/subtitle.svg',
  sound: '/icons/sound.svg',
} as const

export interface ProStep3SceneCardProps {
  sceneIndex: number
  sceneOrderNumber: number
  scriptText: string
  /** 업로드된 영상 URL */
  videoUrl?: string | null
  /** 격자 선택 영역 시작 시간 (초) */
  selectionStartSeconds: number
  /** 격자 선택 영역 끝 시간 (초) */
  selectionEndSeconds: number
  /** 적용된 보이스 라벨 */
  voiceLabel?: string
  /** TimelineScene 데이터 (효과 표시용) */
  timelineScene?: TimelineScene
  /** 재생 중 여부 */
  isPlaying?: boolean
  /** 선택된 씬 여부 */
  isSelected?: boolean
  /** 재생 준비 중 여부 */
  isPreparing?: boolean
  /** TTS 부트스트래핑 중 여부 */
  isTtsBootstrapping?: boolean
  /** 드래그 핸들 관련 props */
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  draggedIndex?: number | null
  dragOver?: { index: number; position: 'before' | 'after' } | null
  /** 재생 핸들러 */
  onPlayScene?: () => void
  /** 효과 패널 열기 핸들러 */
  onOpenEffectPanel?: (tab: 'animation' | 'subtitle' | 'sound') => void
}

export const ProStep3SceneCard = memo(function ProStep3SceneCard({
  sceneIndex,
  sceneOrderNumber,
  scriptText,
  videoUrl,
  selectionStartSeconds,
  selectionEndSeconds,
  voiceLabel,
  timelineScene,
  isPlaying = false,
  isSelected = false,
  isPreparing = false,
  isTtsBootstrapping = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedIndex = null,
  dragOver: dragOverProp = null,
  onPlayScene,
  onOpenEffectPanel,
}: ProStep3SceneCardProps) {
  const isDragging = draggedIndex !== null && draggedIndex === sceneIndex
  const isDropTargetBefore = dragOverProp?.index === sceneIndex && dragOverProp?.position === 'before'
  const isDropTargetAfter = dragOverProp?.index === sceneIndex && dragOverProp?.position === 'after'

  // 프레임 썸네일 관련 상태
  const [frameThumbnails, setFrameThumbnails] = useState<string[]>([])
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const thumbnailCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // 효과 드롭다운 관련 상태
  const [openEffectId, setOpenEffectId] = useState<'animation' | 'subtitle' | 'sound' | null>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 선택된 영역의 길이 계산
  const selectionDuration = selectionEndSeconds - selectionStartSeconds

  // 재생 시간 표시 (선택된 영역의 시작~끝 시간)
  const durationLabel = `${formatTime(selectionStartSeconds, false)} ~ ${formatTime(selectionEndSeconds, false)}`

  // 썸네일 생성 (선택된 영역의 첫 프레임)
  useEffect(() => {
    if (!videoUrl || !thumbnailCanvasRef.current || !videoRef.current) {
      setThumbnailUrl(null)
      return
    }

    const video = videoRef.current
    const canvas = thumbnailCanvasRef.current

    const captureThumbnail = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) {
          return
        }

        canvas.width = 160
        canvas.height = 284

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = canvas.width / canvas.height

        let drawWidth = canvas.width
        let drawHeight = canvas.height
        let drawX = 0
        let drawY = 0

        if (videoAspect > canvasAspect) {
          drawHeight = canvas.height
          drawWidth = drawHeight * videoAspect
          drawX = (canvas.width - drawWidth) / 2
        } else {
          drawWidth = canvas.width
          drawHeight = drawWidth / videoAspect
          drawY = (canvas.height - drawHeight) / 2
        }

        ctx.fillStyle = '#111111'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)

        const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
        setThumbnailUrl(thumbnail)
      } catch (error) {
        console.error('썸네일 생성 오류:', error)
        setThumbnailUrl(null)
      }
    }

    const handleLoadedData = () => {
      if (video.readyState >= 2) {
        video.currentTime = selectionStartSeconds > 0 ? selectionStartSeconds : 0.1
      }
    }

    const handleSeeked = () => {
      captureThumbnail()
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('seeked', handleSeeked)

    if (video.readyState >= 2) {
      video.currentTime = selectionStartSeconds > 0 ? selectionStartSeconds : 0.1
    }

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('seeked', handleSeeked)
    }
  }, [videoUrl, selectionStartSeconds])

  // 선택된 영역의 프레임 썸네일 생성 (타임라인용)
  // timeMarkers와 동일한 범위로 생성해야 함
  useEffect(() => {
    if (!videoUrl || !selectionDuration || selectionDuration <= 0) {
      setFrameThumbnails([])
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      return
    }

    let isCancelled = false
    const thumbnails: Record<number, string> = {}

    // timeMarkers와 동일한 범위로 썸네일 생성
    const startSecond = Math.floor(selectionStartSeconds)
    const endSecond = Math.ceil(selectionEndSeconds)

    const captureFrame = (absoluteSecond: number): Promise<void> => {
      return new Promise((resolve) => {
        if (isCancelled) {
          resolve()
          return
        }

        const handleSeeked = () => {
          if (isCancelled) {
            video.removeEventListener('seeked', handleSeeked)
            resolve()
            return
          }

          try {
            if (!video.videoWidth || !video.videoHeight) {
              video.removeEventListener('seeked', handleSeeked)
              resolve()
              return
            }

            canvas.width = 74
            canvas.height = 84

            const ctx = canvas.getContext('2d')
            if (!ctx) {
              video.removeEventListener('seeked', handleSeeked)
              resolve()
              return
            }

            const videoAspect = video.videoWidth / video.videoHeight
            const canvasAspect = canvas.width / canvas.height

            let drawWidth = canvas.width
            let drawHeight = canvas.height
            let drawX = 0
            let drawY = 0

            if (videoAspect > canvasAspect) {
              drawHeight = canvas.height
              drawWidth = drawHeight * videoAspect
              drawX = (canvas.width - drawWidth) / 2
            } else {
              drawWidth = canvas.width
              drawHeight = drawWidth / videoAspect
              drawY = (canvas.height - drawHeight) / 2
            }

            ctx.fillStyle = '#111111'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)

            const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
            thumbnails[absoluteSecond] = thumbnail

            video.removeEventListener('seeked', handleSeeked)
            resolve()
          } catch (error) {
            video.removeEventListener('seeked', handleSeeked)
            if (error instanceof Error && error.name === 'SecurityError') {
              console.warn(`CORS 오류로 인해 ${absoluteSecond}초 프레임을 캡처할 수 없습니다.`)
            } else {
              console.error(`${absoluteSecond}초 프레임 캡처 오류:`, error)
            }
            resolve()
          }
        }

        video.addEventListener('seeked', handleSeeked)
        video.currentTime = absoluteSecond
      })
    }

    const generateThumbnails = async () => {
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        const handleLoadedData = () => {
          video.removeEventListener('loadeddata', handleLoadedData)
          video.removeEventListener('loadedmetadata', handleLoadedData)
          if (!isCancelled && video.videoWidth && video.videoHeight) {
            generateThumbnails()
          }
        }
        video.addEventListener('loadeddata', handleLoadedData)
        video.addEventListener('loadedmetadata', handleLoadedData)
        return
      }

      // timeMarkers와 동일한 범위로 프레임 캡처 (절대 시간 사용)
      for (let i = startSecond; i <= endSecond; i++) {
        if (isCancelled) break
        await captureFrame(i)
      }

      if (!isCancelled) {
        // timeMarkers와 동일한 순서로 썸네일 배열 생성
        const thumbnailArray: string[] = []
        for (let i = startSecond; i <= endSecond; i++) {
          thumbnailArray.push(thumbnails[i] || '')
        }
        setFrameThumbnails(thumbnailArray)
      }
    }

    generateThumbnails()

    return () => {
      isCancelled = true
    }
  }, [videoUrl, selectionStartSeconds, selectionEndSeconds, selectionDuration])

  // 타임라인 시간 마커 생성 (선택된 영역만)
  const FRAME_WIDTH = 74
  const generateTimeMarkers = () => {
    const markers = []
    const startSecond = Math.floor(selectionStartSeconds)
    const endSecond = Math.ceil(selectionEndSeconds)
    
    for (let i = startSecond; i <= endSecond; i++) {
      const minutes = Math.floor(i / 60)
      const seconds = i % 60
      markers.push({
        time: i,
        label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      })
    }
    return markers
  }

  const timeMarkers = generateTimeMarkers()
  const timelineWidthPx = timeMarkers.length * FRAME_WIDTH

  // 효과 적용 여부 확인
  const hasTransition = Boolean(
    (timelineScene?.transition && timelineScene.transition !== 'none') ||
    (timelineScene?.motion != null)
  )
  const hasSubtitle = Boolean(
    timelineScene?.text?.content?.trim() ||
    (scriptText && scriptText.trim().length > 0)
  )
  const hasSound = Boolean(timelineScene?.soundEffect != null && timelineScene.soundEffect !== '')

  const effectItems: Array<{ id: 'animation' | 'subtitle' | 'sound'; label: string; show: boolean; icon: string }> = [
    { id: 'animation', label: '전환', show: hasTransition, icon: ICONS.transition },
    { id: 'subtitle', label: '자막', show: hasSubtitle, icon: ICONS.subtitle },
    { id: 'sound', label: '사운드', show: hasSound, icon: ICONS.sound },
  ]

  const handleEffectMouseEnter = (id: 'animation' | 'subtitle' | 'sound') => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    setOpenEffectId(id)
  }

  const handleEffectMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setOpenEffectId(null)
      leaveTimeoutRef.current = null
    }, 100)
  }

  const getEffectContent = () => {
    if (!timelineScene || !openEffectId) return null

    const transitionName = transitionLabels[timelineScene.transition] || timelineScene.transition || '없음'
    const soundEffectName = timelineScene.soundEffect
      ? (() => {
          const metadata = findSoundEffectMetadataByPath(timelineScene.soundEffect)
          return metadata?.label || timelineScene.soundEffect
        })()
      : '없음'
    const textSettings = timelineScene.text
    const fontFamily = textSettings?.font ? resolveSubtitleFontFamily(textSettings.font) : '기본'
    const fontSize = textSettings?.fontSize || 80
    const color = textSettings?.color || '#ffffff'
    const fontWeight = textSettings?.fontWeight || (textSettings?.style?.bold ? 700 : 400)

    const motionLabels: Record<string, string> = {
      'slide-left': '왼쪽으로',
      'slide-right': '오른쪽으로',
      'slide-up': '위로',
      'slide-down': '아래로',
      'zoom-in': '확대',
      'zoom-out': '축소',
      rotate: '회전',
      fade: '페이드',
    }
    const motionName = timelineScene.motion
      ? (motionLabels[timelineScene.motion.type] ?? timelineScene.motion.type)
      : '없음'

    const labelClass = 'text-[14px] font-semibold text-[#5E8790] mb-1'
    const contentClass = 'text-[12px] text-gray-900'

    switch (openEffectId) {
      case 'animation':
        return (
          <div className="space-y-3">
            <div>
              <div className={labelClass}>전환효과</div>
              <div className={contentClass}>{transitionName}</div>
            </div>
            <div>
              <div className={labelClass}>움직임</div>
              <div className={contentClass}>{motionName}</div>
            </div>
          </div>
        )
      case 'subtitle':
        return (
          <div>
            <div className={labelClass}>자막</div>
            <div className={`space-y-1 ${contentClass}`}>
              <div>폰트: {fontFamily}</div>
              <div>크기: {fontSize}px</div>
              <div>색상: <span className="inline-block w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: color }} /> {color}</div>
              <div>굵기: {fontWeight}</div>
            </div>
          </div>
        )
      case 'sound':
        return (
          <div>
            <div className={labelClass}>사운드</div>
            <div className={contentClass}>{soundEffectName}</div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-2xl border border-white/10 p-6 shadow-(--shadow-card-default) transition-all cursor-pointer ${
        isPlaying
          ? 'bg-[#D2DEDD]/60 border-4 border-[#ffffff]/20 shadow-lg bg-blur'
          : isSelected
            ? 'bg-[#D2DEDD]/60 border-4 border-[#ffffff]/20 shadow-lg bg-blur'
            : 'bg-white/80'
      }`}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (
          target.tagName !== 'BUTTON' &&
          !target.closest('button') &&
          !target.closest('[data-effect-dropdown]')
        ) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {isDropTargetBefore && (
        <div className="h-0.5 bg-brand-teal rounded-full -mt-3 mb-3" aria-hidden />
      )}

      <div className="flex gap-4 items-stretch">
        {/* 좌측: 드래그 핸들 */}
        {onDragStart && (
          <div className="flex items-center shrink-0 self-stretch">
            <div
              className="cursor-move text-text-tertiary shrink-0 touch-none"
              aria-hidden
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <GripVertical className="w-6 h-6" />
            </div>
          </div>
        )}

        {/* 메인 컨텐츠 영역: 썸네일 | 스크립트+타임라인 */}
        <div className="flex-1 min-w-0 flex gap-4 items-start">
          {/* 좌측: 썸네일 영역 */}
          <div className="shrink-0">
            <div className="w-[160px] h-[284px] rounded-lg overflow-hidden bg-[#111111] relative">
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={`Scene ${sceneOrderNumber} thumbnail`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  썸네일 없음
                </div>
              )}
            </div>
            {/* 재생 버튼 */}
            {onPlayScene && (
              <div className="flex items-center justify-center mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayScene()
                  }}
                  disabled={isPreparing || isTtsBootstrapping}
                  className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-(--shadow-card-default)"
                  title={isPreparing || isTtsBootstrapping ? '준비 중...' : isPlaying ? '씬 정지' : '씬 재생'}
                  aria-label={isPreparing || isTtsBootstrapping ? '준비 중' : isPlaying ? '씬 정지' : '씬 재생'}
                >
                  {isPreparing || isTtsBootstrapping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Image src={ICONS.play} alt="" width={16} height={16} className="w-4 h-4" aria-hidden unoptimized />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 우측: 스크립트 + 타임라인 영역 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 상단 영역: SCENE 라벨 + 스크립트 */}
            <div className="flex flex-col">
              {/* SCENE 라벨 + 적용된 보이스 */}
              <div className="flex items-center justify-between mb-4">
                <p
                  className="text-brand-teal tracking-[-0.36px]"
                  style={{
                    fontSize: 'var(--font-size-18)',
                    lineHeight: '25.2px',
                    fontFamily: '"Zeroes Two", sans-serif',
                    fontWeight: 400,
                  }}
                >
                  SCENE {sceneOrderNumber}
                </p>
                {voiceLabel && (
                  <div
                    className="flex items-center gap-1 text-text-tertiary"
                    style={{
                      fontSize: 'var(--font-size-14)',
                      lineHeight: 'var(--line-height-14-140)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    <span>적용된 보이스 | &nbsp;</span>
                    <span
                      style={{
                        fontSize: 'var(--font-size-16)',
                        lineHeight: 'var(--line-height-16-140)',
                        fontWeight: 'var(--font-weight-bold)',
                      }}
                    >
                      {voiceLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* 스크립트 영역 */}
              <div className="mb-6">
                <div className="relative rounded-lg bg-white shadow-(--shadow-card-default) overflow-hidden border-2 border-transparent" style={{ minHeight: '74px', boxSizing: 'border-box' }}>
                  <textarea
                    value={scriptText}
                    readOnly
                    placeholder="스크립트를 입력하세요."
                    rows={2}
                    className="w-full p-3 rounded-lg bg-transparent text-text-tertiary placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none border-0 cursor-default"
                    style={{
                      fontSize: 'var(--font-size-14)',
                      lineHeight: '25.2px',
                      fontWeight: 500,
                      letterSpacing: '-0.14px',
                      minHeight: '74px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 하단: 타임라인 비주얼 (선택된 영역만) */}
            <div className="relative overflow-x-auto w-full">
              <div className="relative shrink-0" style={{ width: `${timelineWidthPx}px`, paddingTop: '18px', paddingBottom: '18px' }}>
                {/* 프레임 박스 */}
                <div className="relative h-[84px] bg-white rounded-2xl border border-gray-300 overflow-hidden">
                  {/* 프레임 패턴 */}
                  <div className="absolute inset-0 flex">
                    {timeMarkers.map((marker, idx) => (
                      <div
                        key={idx}
                        className="shrink-0 relative border-r border-[#a6a6a6] overflow-hidden"
                        style={{ width: '74px', height: '100%' }}
                      >
                        {frameThumbnails[idx] ? (
                          <Image
                            src={frameThumbnails[idx]}
                            alt={`${marker.time}초 프레임`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[#111111] opacity-40" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 숨겨진 비디오와 캔버스 */}
                  {videoUrl && (
                    <>
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="hidden"
                        muted
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <canvas ref={thumbnailCanvasRef} className="hidden" />
                    </>
                  )}
                </div>
              </div>

              {/* 시간 마커 */}
              <div 
                className="relative flex shrink-0"
                style={{ width: `${timelineWidthPx}px` }}
              >
                <div 
                  className="absolute top-0 left-0 h-px bg-[#a6a6a6]"
                  style={{ width: `${timelineWidthPx}px` }}
                />
                
                {timeMarkers.map((marker, idx) => {
                  const isStart = idx === 0
                  const isEnd = idx === timeMarkers.length - 1
                  
                  return (
                    <div
                      key={idx}
                      className="shrink-0 flex flex-col items-center relative"
                      style={{ width: '74px' }}
                    >
                      {/* 세로 틱 */}
                      {(isStart || isEnd) ? (
                        <>
                          <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#a6a6a6] h-[6px] w-px -translate-y-full"
                          />
                          <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#a6a6a6] h-[10px] w-px"
                          />
                        </>
                      ) : (
                        <div 
                          className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#a6a6a6] h-[6px] w-px"
                        />
                      )}
                      
                      {/* 시간 텍스트 */}
                      <span
                        className="font-medium mt-2 text-text-dark"
                        style={{
                          fontSize: '16px',
                          lineHeight: '22.4px',
                          letterSpacing: '-0.32px',
                        }}
                      >
                        {marker.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 재생시간과 효과 아이콘 */}
            <div className="flex items-center justify-between gap-2 pt-6" data-effect-dropdown>
              <span
                className="text-[#5D5D5D] font-medium tabular-nums shrink-0"
                style={{ fontSize: 'var(--font-size-14)', lineHeight: 'var(--line-height-12-140)' }}
              >
                {durationLabel}
              </span>
              <div
                className="relative shrink-0"
                onMouseEnter={() => {
                  if (leaveTimeoutRef.current) {
                    clearTimeout(leaveTimeoutRef.current)
                    leaveTimeoutRef.current = null
                  }
                }}
                onMouseLeave={handleEffectMouseLeave}
              >
                <div className="flex items-center justify-center gap-0 rounded-xl bg-[#ffffff]/10 backdrop-blur-sm border border-[#ffffff]/30 shadow-lg overflow-hidden">
                  {effectItems.filter((item) => item.show).map((item) => (
                    <div key={item.id} className="relative">
                      <button
                        type="button"
                        onMouseEnter={() => handleEffectMouseEnter(item.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenEffectPanel?.(item.id)
                        }}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/60 transition-all text-[#2c2c2c]"
                        title={item.label}
                      >
                        <Image src={item.icon} alt="" width={16} height={16} className="w-5 h-5" aria-hidden unoptimized />
                      </button>
                    </div>
                  ))}
                </div>
                <AnimatePresence>
                  {openEffectId && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute right-0 bottom-full py-4 px-4 rounded-lg bg-white border border-[#88a9ac]/30 shadow-lg z-20 w-80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getEffectContent()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDropTargetAfter && (
        <div className="h-0.5 bg-brand-teal rounded-full mt-3 -mb-3" aria-hidden />
      )}
    </div>
  )
})
