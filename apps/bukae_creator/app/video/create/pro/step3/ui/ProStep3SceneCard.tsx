'use client'

import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { GripVertical, Pause, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { formatTime } from '@/utils/timeline'
import { getEffectiveSourceDuration } from '../utils/proPlaybackUtils'
import { transitionLabels } from '@/lib/data/transitions'
import { findSoundEffectMetadataByPath } from '@/lib/data/sound-effects'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import { ProVideoTimelineGrid } from '../../step2/components/ProVideoTimelineGrid'
import { ProVideoUpload } from '../../step2/components/ProVideoUpload'

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
  /** 격자 선택 영역 시작 시간 (초) - 초기값 */
  selectionStartSeconds: number
  /** 격자 선택 영역 끝 시간 (초) */
  selectionEndSeconds: number
  /** 원본 영상 길이(초). 원본<TTS일 때 확장 타임라인 계산에 사용 */
  originalVideoDurationSeconds?: number
  /** TTS duration (초) - 타임라인 표시용 */
  ttsDuration?: number
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
  /** 격자 선택 영역 변경 콜백 */
  onSelectionChange?: (startSeconds: number, endSeconds: number) => void
  /** 원본 영상 길이 로드 시 스토어 반영 (TTS보다 짧을 때 이어붙여 격자 배경 길이 계산용) */
  onOriginalVideoDurationLoaded?: (seconds: number) => void
  /** 드래그 핸들 관련 props */
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  draggedIndex?: number | null
  dragOver?: { index: number; position: 'before' | 'after' } | null
  /** 재생 핸들러 */
  onPlayScene?: () => void
  /** 카드 클릭 시 씬 선택 (현재 씬로 설정) */
  onSelect?: () => void
  /** 효과 패널 열기 핸들러 */
  onOpenEffectPanel?: (tab: 'animation' | 'subtitle' | 'sound') => void
}

export const ProStep3SceneCard = memo(function ProStep3SceneCard({
  sceneIndex,
  sceneOrderNumber,
  scriptText,
  videoUrl,
  selectionStartSeconds: initialSelectionStartSeconds,
  selectionEndSeconds: initialSelectionEndSeconds,
  originalVideoDurationSeconds,
  ttsDuration = 0,
  voiceLabel,
  timelineScene,
  isPlaying = false,
  isSelected = false,
  isPreparing = false,
  isTtsBootstrapping = false,
  onSelectionChange,
  onOriginalVideoDurationLoaded,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  draggedIndex = null,
  dragOver: dragOverProp = null,
  onPlayScene,
  onSelect,
  onOpenEffectPanel,
}: ProStep3SceneCardProps) {
  const isDropTargetBefore = dragOverProp?.index === sceneIndex && dragOverProp?.position === 'before'
  const isDropTargetAfter = dragOverProp?.index === sceneIndex && dragOverProp?.position === 'after'

  // 프레임 썸네일 관련 상태
  const [frameThumbnails, setFrameThumbnails] = useState<string[]>([])
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  /** 같은 videoUrl에 대해 duration 보고/확장 선택은 한 번만 수행 (무한 루프 방지) */
  const reportedDurationForUrlRef = useRef<string | null>(null)

  // 격자(선택 영역) 드래그 관련 상태
  // Step2에서 가져온 값을 확실히 반영하기 위해 props를 직접 사용
  // useState의 초기값을 props로 설정하고, props 변경 시 동기화
  const [selectionStartSeconds, setSelectionStartSeconds] = useState(initialSelectionStartSeconds ?? 0)
  const [selectionEndSeconds, setSelectionEndSeconds] = useState(initialSelectionEndSeconds ?? ((initialSelectionStartSeconds ?? 0) + (ttsDuration || 10)))
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartSelectionLeft, setDragStartSelectionLeft] = useState(0)
  const timelineContainerRef = useRef<HTMLDivElement | null>(null)
  const prevInitialSelectionStartRef = useRef<number | undefined>(initialSelectionStartSeconds)
  const prevInitialSelectionEndRef = useRef<number | undefined>(initialSelectionEndSeconds)

  // 효과 드롭다운 관련 상태
  const [openEffectId, setOpenEffectId] = useState<'animation' | 'subtitle' | 'sound' | null>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 타임라인/프레임바 스케일 (1보다 작으면 전체적으로 축소)
  const TIMELINE_SCALE = 0.85
  const FRAME_WIDTH = Math.round(74 * TIMELINE_SCALE)
  const FRAME_HEIGHT = Math.round(84 * TIMELINE_SCALE)
  const TIMELINE_PADDING = Math.round(18 * TIMELINE_SCALE)

  // initialSelectionStartSeconds가 외부에서 변경될 때만 동기화 (드래그 중이 아닐 때만)
  useEffect(() => {
    if (isDraggingSelection) return // 드래그 중이면 업데이트하지 않음
    
    const currentValue = initialSelectionStartSeconds
    
    // 값이 없으면 무시
    if (currentValue === undefined || currentValue === null) {
      return
    }
    
    // 내부 state와 props가 다르면 동기화 (비동기로 처리)
    if (Math.abs(selectionStartSeconds - currentValue) > 0.01) {
      prevInitialSelectionStartRef.current = currentValue
      const timeoutId = setTimeout(() => {
        setSelectionStartSeconds(currentValue)
      }, 0)
      return () => clearTimeout(timeoutId)
    } else {
      // 값이 같으면 ref만 업데이트
      prevInitialSelectionStartRef.current = currentValue
    }
  }, [initialSelectionStartSeconds, isDraggingSelection, selectionStartSeconds])

  // initialSelectionEndSeconds가 외부에서 변경될 때만 동기화 (드래그 중이 아닐 때만)
  useEffect(() => {
    if (isDraggingSelection) return // 드래그 중이면 업데이트하지 않음
    
    const currentValue = initialSelectionEndSeconds
    
    // 값이 없으면 무시
    if (currentValue === undefined || currentValue === null) {
      return
    }
    
    // 내부 state와 props가 다르면 동기화 (비동기로 처리)
    if (Math.abs(selectionEndSeconds - currentValue) > 0.01) {
      prevInitialSelectionEndRef.current = currentValue
      const timeoutId = setTimeout(() => {
        setSelectionEndSeconds(currentValue)
      }, 0)
      return () => clearTimeout(timeoutId)
    } else {
      // 값이 같으면 ref만 업데이트
      prevInitialSelectionEndRef.current = currentValue
    }
  }, [initialSelectionEndSeconds, isDraggingSelection, selectionEndSeconds])

  const resolveTimelineDuration = useCallback(() => {
    const tts = Math.floor(ttsDuration || 10)
    const original =
      typeof originalVideoDurationSeconds === 'number' &&
      Number.isFinite(originalVideoDurationSeconds) &&
      originalVideoDurationSeconds > 0
        ? originalVideoDurationSeconds
        : videoDuration !== null && videoDuration > 0
          ? videoDuration
          : 0

    if (original > 0 && original < tts) {
      return Math.floor(getEffectiveSourceDuration(tts, original))
    }

    if (original > 0) {
      return Math.floor(original)
    }

    return tts
  }, [originalVideoDurationSeconds, ttsDuration, videoDuration])

  const timelineDuration = resolveTimelineDuration()

  const generateTimeMarkers = () => {
    const markers = []
    for (let i = 0; i <= timelineDuration; i++) {
      const minutes = Math.floor(i / 60)
      const seconds = i % 60
      markers.push(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }
    return markers
  }

  const timeMarkers = generateTimeMarkers()

  // TTS duration이 변경되면 격자 위치 조정
  useEffect(() => {
    if (isDraggingSelection) return // 드래그 중이면 업데이트하지 않음

    const actualVideoEndPx = timelineDuration * FRAME_WIDTH
    const selectionWidthPx = (ttsDuration || 10) * FRAME_WIDTH
    const maxSelectionStartPx = Math.max(0, actualVideoEndPx - selectionWidthPx)
    const maxStart = maxSelectionStartPx / FRAME_WIDTH

    // selectionStartSeconds가 범위를 벗어나면 조정 (비동기로 처리)
    if (selectionStartSeconds > maxStart) {
      const timeoutId = setTimeout(() => {
        setSelectionStartSeconds(maxStart)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [timelineDuration, ttsDuration, selectionStartSeconds, isDraggingSelection, FRAME_WIDTH])

  // videoUrl이 없을 때 videoDuration 초기화 (별도 useEffect로 분리)
  useEffect(() => {
    if (!videoUrl) {
      // cleanup 함수에서만 setState 호출하여 린터 경고 방지
      return () => {
        setVideoDuration(null)
      }
    }
  }, [videoUrl])

  // 영상의 실제 duration 가져오기 (같은 videoUrl에 대해 한 번만 보고하여 무한 루프 방지)
  useEffect(() => {
    if (!videoUrl) {
      reportedDurationForUrlRef.current = null
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    const handleLoadedMetadata = () => {
      if (!video.duration || !isFinite(video.duration)) return
      const original = video.duration
      if (reportedDurationForUrlRef.current === videoUrl) return
      reportedDurationForUrlRef.current = videoUrl

      setVideoDuration(original)
      onOriginalVideoDurationLoaded?.(original)
      const tts = ttsDuration ?? 10
      if (original < tts && onSelectionChange) {
        const span = (initialSelectionEndSeconds ?? 0) - (initialSelectionStartSeconds ?? 0)
        if (span <= original + 0.1) {
          const effective = getEffectiveSourceDuration(tts, original)
          const start = initialSelectionStartSeconds ?? 0
          onSelectionChange(start, start + Math.min(tts, effective))
        }
      }
    }

    if (video.readyState >= 1) {
      handleLoadedMetadata()
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoUrl, onOriginalVideoDurationLoaded, onSelectionChange, ttsDuration, initialSelectionStartSeconds, initialSelectionEndSeconds])

  // 격자(선택 영역) 위치 계산 - Step2에서 설정한 selectionStartSeconds와 selectionEndSeconds 사용
  // 드래그 중이면 내부 state를 사용하고, 그렇지 않으면 props를 직접 사용
  const displaySelectionStartSeconds = isDraggingSelection ? selectionStartSeconds : (initialSelectionStartSeconds ?? 0)
  const displaySelectionEndSeconds = isDraggingSelection ? selectionEndSeconds : (initialSelectionEndSeconds ?? ((initialSelectionStartSeconds ?? 0) + (ttsDuration || 10)))
  
  // 격자 편집 가능한 "소스" 끝 지점 (확장 시 확장 소스 길이, 아니면 원본 길이)
  const actualVideoEndSeconds = timelineDuration
  
  // 타임라인 표시용 픽셀 계산
  // 실제 영상 길이를 픽셀로 변환 (예: 6.5초 = 6.5 * FRAME_WIDTH)
  // 이렇게 하면 격자의 끝지점이 실제 영상의 끝에 정확히 맞춰집니다
  const actualVideoEndPx = actualVideoEndSeconds * FRAME_WIDTH
  
  // Step2에서 설정한 selectionEndSeconds를 사용하여 격자 너비 계산
  const selectionWidthSeconds = displaySelectionEndSeconds - displaySelectionStartSeconds // 실제 선택 영역 너비
  
  // 선택 영역의 픽셀 단위 크기 (먼저 계산)
  const selectionWidthPx = selectionWidthSeconds * FRAME_WIDTH
  
  // 격자의 시작점과 끝점을 실제 영상 범위 내로 클램핑
  // Step2에서 설정한 selectionStartSeconds와 selectionEndSeconds를 사용하되, 영상 범위를 벗어나지 않도록 클램핑
  // actualVideoEndSeconds는 실제 영상 길이를 사용하므로 정확한 끝지점 반영 가능
  const maxSelectionStartSeconds = Math.max(0, actualVideoEndSeconds - selectionWidthSeconds)
  const finalClampedSelectionStartSeconds = Math.max(0, Math.min(displaySelectionStartSeconds, maxSelectionStartSeconds))
  // selectionEndSeconds를 실제 영상 길이 내로 클램핑 (타임라인 마커가 아닌 실제 영상 길이 기준)
  const finalClampedSelectionEndSeconds = Math.min(Math.max(displaySelectionEndSeconds, finalClampedSelectionStartSeconds), actualVideoEndSeconds)
  
  // 선택 영역의 픽셀 단위 위치
  const selectionLeftPx = finalClampedSelectionStartSeconds * FRAME_WIDTH

  // videoUrl이나 ttsDuration이 없을 때 썸네일 초기화 (별도 useEffect로 분리)
  useEffect(() => {
    if (!videoUrl || !ttsDuration) {
      return () => {
        setFrameThumbnails([])
      }
    }
  }, [videoUrl, ttsDuration])

  // 전체 영상의 프레임 썸네일 생성 (타임라인용)
  useEffect(() => {
    if (!videoUrl || !ttsDuration) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      return
    }

    // 비디오가 로드되지 않았으면 대기
    if (videoDuration === null) {
      return
    }

    let isCancelled = false

    const tts = Math.floor(ttsDuration || 10)
    const originalDurationSec = videoDuration !== null && videoDuration > 0 ? Math.floor(videoDuration) : 0
    const isExtended = originalDurationSec > 0 && originalDurationSec < tts
    const duration = isExtended
      ? Math.floor(getEffectiveSourceDuration(tts, originalDurationSec))
      : originalDurationSec > 0
        ? originalDurationSec
        : tts

    const thumbnails: string[] = []

    const captureFrame = (timelineSecond: number): Promise<void> => {
      const seekSec = isExtended ? timelineSecond % originalDurationSec : timelineSecond
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

            // 캔버스 크기를 프레임 박스 크기에 맞춤
            canvas.width = FRAME_WIDTH
            canvas.height = FRAME_HEIGHT

            const ctx = canvas.getContext('2d')
            if (!ctx) {
              video.removeEventListener('seeked', handleSeeked)
              resolve()
              return
            }

            // 비디오 프레임을 캔버스에 그리기 (비율 유지하며 중앙 정렬)
            const videoAspect = video.videoWidth / video.videoHeight
            const canvasAspect = canvas.width / canvas.height

            let drawWidth = canvas.width
            let drawHeight = canvas.height
            let drawX = 0
            let drawY = 0

            if (videoAspect > canvasAspect) {
              // 비디오가 더 넓음 - 높이에 맞춤
              drawHeight = canvas.height
              drawWidth = drawHeight * videoAspect
              drawX = (canvas.width - drawWidth) / 2
            } else {
              // 비디오가 더 높음 - 너비에 맞춤
              drawWidth = canvas.width
              drawHeight = drawWidth / videoAspect
              drawY = (canvas.height - drawHeight) / 2
            }

            // 배경을 검은색으로 채우기
            ctx.fillStyle = '#111111'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // 비디오 프레임 그리기
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight)

            // 캔버스를 이미지 URL로 변환
            const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
            thumbnails[timelineSecond] = thumbnail

            video.removeEventListener('seeked', handleSeeked)
            resolve()
          } catch (error) {
            video.removeEventListener('seeked', handleSeeked)
            if (error instanceof Error && error.name === 'SecurityError') {
              console.warn(`CORS 오류로 인해 ${timelineSecond}초 프레임을 캡처할 수 없습니다.`)
            } else {
              console.error(`${timelineSecond}초 프레임 캡처 오류:`, error)
            }
            resolve() // 에러가 나도 계속 진행
          }
        }

        video.addEventListener('seeked', handleSeeked)
        video.currentTime = seekSec
      })
    }

    const generateThumbnails = async () => {
      // 비디오 메타데이터가 완전히 로드될 때까지 대기
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

      // 타임라인 마커는 timelineDuration + 1개이므로, 썸네일도 같은 개수 생성
      // duration은 timelineDuration과 같으므로, duration + 1개를 생성해야 함
      // 각 초마다 프레임 캡처 (0초부터 duration초까지, 총 duration + 1개)
      for (let i = 0; i <= duration; i++) {
        if (isCancelled) break
        await captureFrame(i)
      }

      // 썸네일 배열 설정 (취소되지 않았을 때만)
      if (!isCancelled) {
        const thumbnailArray: string[] = []
        for (let i = 0; i <= duration; i++) {
          thumbnailArray[i] = thumbnails[i] || ''
        }
        setFrameThumbnails(thumbnailArray)
      }
    }

    generateThumbnails()

    // cleanup 함수: 컴포넌트 언마운트 또는 의존성 변경 시 취소
    return () => {
      isCancelled = true
    }
  }, [videoUrl, ttsDuration, videoDuration, FRAME_WIDTH, FRAME_HEIGHT])

  // 격자 드래그 핸들러
  const handleSelectionMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 드래그 시작할 때 props 값을 내부 state로 초기화
    const startValue = initialSelectionStartSeconds ?? 0
    const endValue = initialSelectionEndSeconds ?? (startValue + (ttsDuration || 10))
    setSelectionStartSeconds(startValue)
    setSelectionEndSeconds(endValue)
    setIsDraggingSelection(true)
    setDragStartX(e.clientX)
    // 현재 표시되는 selection 위치를 기준으로 드래그 시작 위치 설정
    const currentStart = initialSelectionStartSeconds ?? 0
    const currentEnd = initialSelectionEndSeconds ?? (currentStart + (ttsDuration || 10))
    const currentWidthSeconds = currentEnd - currentStart
    // 실제 격자 편집 범위는 확장 타임라인 길이 기준
    const actualVideoEndSeconds = timelineDuration
    const actualVideoEndPx = actualVideoEndSeconds * FRAME_WIDTH
    const currentWidthPx = currentWidthSeconds * FRAME_WIDTH
    const maxSelectionLeftPx = Math.max(0, actualVideoEndPx - currentWidthPx)
    const clampedStart = Math.max(0, Math.min(currentStart, maxSelectionLeftPx / FRAME_WIDTH))
    const clampedStartPx = clampedStart * FRAME_WIDTH
    setDragStartSelectionLeft(clampedStartPx)
  }

  const handleSelectionMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSelection || !timelineContainerRef.current) return
    
    e.preventDefault()
    const deltaX = e.clientX - dragStartX
    // 마우스를 정확히 따라가도록 1:1 비율 사용
    
    // 실제 격자 편집 범위는 확장 타임라인 길이 기준
    const actualVideoEndSeconds = timelineDuration
    const actualVideoEndPx = actualVideoEndSeconds * FRAME_WIDTH
    const maxSelectionLeftPx = Math.max(0, actualVideoEndPx - selectionWidthPx)
    
    // 끝에 도달했으면 더 이상 오른쪽으로 이동하지 않도록 고정
    const newSelectionLeftPx = Math.max(0, Math.min(
      dragStartSelectionLeft + deltaX,
      maxSelectionLeftPx
    ))
    
    // 끝에 정확히 도달했는지 확인 (부동소수점 오차 고려)
    const isAtEnd = Math.abs(newSelectionLeftPx - maxSelectionLeftPx) < 0.1
    const finalSelectionLeftPx = isAtEnd ? maxSelectionLeftPx : newSelectionLeftPx
    
    const newSelectionStartSeconds = finalSelectionLeftPx / FRAME_WIDTH
    // 드래그할 때는 격자 너비를 유지하면서 이동하므로 selectionEndSeconds도 함께 업데이트
    const currentSelectionWidth = selectionEndSeconds - selectionStartSeconds
    const newSelectionEndSeconds = newSelectionStartSeconds + currentSelectionWidth
    setSelectionStartSeconds(newSelectionStartSeconds)
    setSelectionEndSeconds(newSelectionEndSeconds)
  }

  const handleSelectionMouseUp = () => {
    // 드래그가 끝날 때 최종 값을 저장
    if (onSelectionChange && isDraggingSelection) {
      // 실제 격자 편집 범위는 확장 타임라인 길이 기준
      const actualVideoEndSeconds = timelineDuration
      const actualVideoEndPx = actualVideoEndSeconds * FRAME_WIDTH
      const currentWidthSeconds = selectionEndSeconds - selectionStartSeconds
      const currentWidthPx = currentWidthSeconds * FRAME_WIDTH
      const maxSelectionLeftPx = Math.max(0, actualVideoEndPx - currentWidthPx)
      const currentStart = selectionStartSeconds
      const clampedStart = Math.max(0, Math.min(currentStart, maxSelectionLeftPx / FRAME_WIDTH))
      const clampedEnd = Math.min(clampedStart + currentWidthSeconds, actualVideoEndSeconds)
      
      onSelectionChange(clampedStart, clampedEnd)
    }
    setIsDraggingSelection(false)
  }

  // 전역 마우스 이벤트로 드래그 처리
  useEffect(() => {
    if (!isDraggingSelection) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineContainerRef.current) return
      
      const deltaX = e.clientX - dragStartX
      // 마우스를 정확히 따라가도록 1:1 비율 사용
      
      // 마지막 프레임 썸네일의 끝까지 갈 수 있도록 제한
      // 실제 격자 편집 범위는 확장 타임라인 길이 기준
      const actualVideoEndSeconds = timelineDuration
      const actualVideoEndPx = actualVideoEndSeconds * FRAME_WIDTH
      const currentSelectionWidthSeconds = selectionEndSeconds - selectionStartSeconds
      const currentSelectionWidthPx = currentSelectionWidthSeconds * FRAME_WIDTH
      const maxSelectionLeftPx = Math.max(0, actualVideoEndPx - currentSelectionWidthPx)
      
      // 끝에 도달했으면 더 이상 오른쪽으로 이동하지 않도록 고정
      const newSelectionLeftPx = Math.max(0, Math.min(
        dragStartSelectionLeft + deltaX,
        maxSelectionLeftPx
      ))
      
      // 끝에 정확히 도달했는지 확인 (부동소수점 오차 고려)
      const isAtEnd = Math.abs(newSelectionLeftPx - maxSelectionLeftPx) < 0.1
      const finalSelectionLeftPx = isAtEnd ? maxSelectionLeftPx : newSelectionLeftPx
      
      const newSelectionStartSeconds = finalSelectionLeftPx / FRAME_WIDTH
      // 드래그할 때는 격자 너비를 유지하면서 이동하므로 selectionEndSeconds도 함께 업데이트
      const currentSelectionWidth = selectionEndSeconds - selectionStartSeconds
      const newSelectionEndSeconds = newSelectionStartSeconds + currentSelectionWidth
      setSelectionStartSeconds(newSelectionStartSeconds)
      setSelectionEndSeconds(newSelectionEndSeconds)
    }

    const handleMouseUp = () => {
      // 드래그가 끝날 때 최종 값을 저장
      if (onSelectionChange) {
        // 실제 격자 편집 범위는 확장 타임라인 길이 기준
        const actualVideoEndSeconds = timelineDuration
        const actualVideoEndPx = actualVideoEndSeconds * FRAME_WIDTH
        const currentWidthSeconds = selectionEndSeconds - selectionStartSeconds
        const currentWidthPx = currentWidthSeconds * FRAME_WIDTH
        const maxSelectionLeftPx = Math.max(0, actualVideoEndPx - currentWidthPx)
        const currentStart = selectionStartSeconds
        const clampedStart = Math.max(0, Math.min(currentStart, maxSelectionLeftPx / FRAME_WIDTH))
        const clampedEnd = Math.min(clampedStart + currentWidthSeconds, actualVideoEndSeconds)
        
        onSelectionChange(clampedStart, clampedEnd)
      }
      setIsDraggingSelection(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingSelection, dragStartX, dragStartSelectionLeft, timelineDuration, FRAME_WIDTH, selectionStartSeconds, selectionEndSeconds, onSelectionChange])
  
  // 격자에 포함되는 시간 마커 인덱스 계산
  const getIsInSelection = (idx: number) => {
    const markerTime = idx // idx는 초 단위
    // 격자 범위 내에 있는지 확인
    return markerTime >= Math.floor(finalClampedSelectionStartSeconds) && markerTime < finalClampedSelectionEndSeconds
  }
  
  // 격자의 시작/끝 지점에 큰 틱 표시 여부
  const getIsMajorTick = (idx: number) => {
    const markerTime = idx
    // 격자 시작/끝 지점에 큰 틱
    const endMarkerTime = Math.floor(finalClampedSelectionEndSeconds)
    return markerTime === Math.floor(finalClampedSelectionStartSeconds) || markerTime === endMarkerTime
  }

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
          onSelect?.()
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

        {/* 메인 컨텐츠 영역: 영상 업로드 | 스크립트+타임라인 */}
        <div className="flex-1 min-w-0 flex gap-4 items-start">
          {/* 좌측: 영상 업로드 영역 */}
          <div className="shrink-0">
            <ProVideoUpload 
              videoUrl={videoUrl}
              selectionStartSeconds={finalClampedSelectionStartSeconds}
              selectionEndSeconds={finalClampedSelectionEndSeconds}
            />
            {/* 재생 버튼 */}
            {onPlayScene && (
              <div className="flex items-center justify-start mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayScene()
                  }}
                  disabled={isPreparing || isTtsBootstrapping}
                  className="w-8 h-8 rounded-2xl bg-white border-2 border-black flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-(--shadow-card-default)"
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
              <div className="mb-2">
                <div className="relative rounded-lg bg-white shadow-(--shadow-card-default) overflow-hidden border-2 border-transparent" style={{ minHeight: `${FRAME_HEIGHT}px`, boxSizing: 'border-box' }}>
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
                      minHeight: `${FRAME_HEIGHT}px`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 하단: 타임라인 비주얼 */}
            <div 
              ref={timelineContainerRef}
              className="relative overflow-x-auto w-full"
              style={{ 
                WebkitOverflowScrolling: 'touch',
              }}
              onDragStart={(e) => {
                // 타임라인 영역에서는 씬 카드 드래그 방지
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              {/* 격자 편집 타임라인 - padding으로 격자가 튀어나올 공간 확보 */}
              {/* 실제 영상 길이만큼 표시 영역 확장 (예: 6.5초면 6.5 * FRAME_WIDTH) */}
              <div className="relative shrink-0" style={{ width: `${actualVideoEndPx + FRAME_WIDTH / 2}px`, paddingTop: `${TIMELINE_PADDING}px`, paddingBottom: `${TIMELINE_PADDING}px`, paddingLeft: `${FRAME_WIDTH / 2}px` }}>
                {/* 실제 영상 프레임 박스 (클리핑 영역) */}
                <div className="relative bg-white rounded-2xl border border-gray-300 overflow-hidden" style={{ height: `${FRAME_HEIGHT}px` }}>
                  {/* 격자 패턴 - 각 FRAME_WIDTH 너비의 프레임들 */}
                  <div className="absolute inset-0 flex" style={{ left: '0px' }}>
                    {Array.from({ length: timeMarkers.length }).map((_, idx) => (
                      <div
                        key={idx}
                        className="shrink-0 relative border-r border-[#a6a6a6] overflow-hidden"
                        style={{ width: `${FRAME_WIDTH}px`, height: '100%' }}
                      >
                        {/* 비디오 프레임 썸네일 또는 배경 */}
                        {frameThumbnails[idx] ? (
                          <Image
                            src={frameThumbnails[idx]}
                            alt={`${idx}초 프레임`}
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
                  
                  {/* 격자 기준 왼쪽 어두운 오버레이 */}
                  {selectionLeftPx > 0 && (
                    <div
                      className="absolute top-0 left-0 bg-black/50"
                      style={{
                        width: `${selectionLeftPx}px`,
                        height: '100%',
                      }}
                    />
                  )}
                  
                  {/* 격자 기준 오른쪽 어두운 오버레이 */}
                  {selectionLeftPx + selectionWidthPx < actualVideoEndPx && (
                    <div
                      className="absolute top-0 right-0 bg-black/50"
                      style={{
                        width: `${actualVideoEndPx - (selectionLeftPx + selectionWidthPx)}px`,
                        height: '100%',
                      }}
                    />
                  )}
                  
                  {/* 숨겨진 비디오와 캔버스 - 프레임 썸네일 생성용 */}
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
                    </>
                  )}
                </div>

                {/* 격자(선택 강조선) - 프레임 박스 밖에 배치하여 위아래로 튀어나오게 */}
                <div
                  onMouseDown={handleSelectionMouseDown}
                  onMouseMove={handleSelectionMouseMove}
                  onMouseUp={handleSelectionMouseUp}
                  className="cursor-move"
                  style={{
                    position: 'absolute',
                    left: `${FRAME_WIDTH / 2 + selectionLeftPx}px`,
                    width: `${selectionWidthPx}px`,
                    top: `${TIMELINE_PADDING}px`,
                    height: `calc(100% - ${TIMELINE_PADDING}px)`,
                    zIndex: 10,
                    pointerEvents: 'auto', // 격자 내부 전체가 클릭 가능하도록
                  }}
                >
                  <ProVideoTimelineGrid
                    frameHeight={FRAME_HEIGHT}
                    selectionLeft={0}
                    selectionWidth={selectionWidthPx}
                    extendY={TIMELINE_PADDING}
                  />
                </div>
              </div>

              {/* 시간 마커 */}
              <div 
                className="relative flex shrink-0"
                style={{ width: `${actualVideoEndPx}px` }}
                onDragStart={(e) => {
                  // 시간 마커 영역에서도 씬 카드 드래그 방지
                  e.stopPropagation()
                  e.preventDefault()
                }}
              >
                {/* 가로 라인 - 실제 영상 길이만큼 (예: 6.5초면 6.5 * FRAME_WIDTH) */}
                <div 
                  className="absolute top-0 left-0 h-px bg-[#a6a6a6]"
                  style={{ width: `${actualVideoEndPx}px` }}
                />
                
                {timeMarkers.map((marker, idx) => {
                  const isInSelection = getIsInSelection(idx)
                  const isMajorTick = getIsMajorTick(idx)
                  
                  return (
                    <div
                      key={idx}
                      className="shrink-0 flex flex-col items-center relative"
                      style={{ width: `${FRAME_WIDTH}px` }}
                    >
                      {/* 세로 틱 */}
                      {isMajorTick ? (
                        <>
                          {/* 큰 틱 - 위로 */}
                          <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#a6a6a6] h-[6px] w-px -translate-y-full"
                          />
                          {/* 큰 틱 - 아래로 */}
                          <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#a6a6a6] h-[10px] w-px"
                          />
                        </>
                      ) : (
                        /* 작은 틱 - 모든 마커에 고정으로 표시 */
                        <div 
                          className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#a6a6a6] h-[6px] w-px"
                        />
                      )}
                      
                      {/* 시간 텍스트 */}
                      <span
                        className={`font-medium mt-1.5 ${
                          isInSelection ? 'text-text-dark' : 'text-text-tertiary'
                        }`}
                        style={{
                          fontSize: '14px',
                          lineHeight: '19.6px',
                          letterSpacing: '-0.28px',
                        }}
                      >
                        {marker}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 재생시간과 효과 아이콘 */}
            <div className="flex items-center justify-between gap-2 pt-4" data-effect-dropdown>
              <span
                className="text-[#5D5D5D] font-medium tabular-nums shrink-0"
                style={{ fontSize: 'var(--font-size-14)', lineHeight: 'var(--line-height-12-140)' }}
              >
                {formatTime(finalClampedSelectionStartSeconds, false)} ~ {formatTime(finalClampedSelectionEndSeconds, false)}
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
