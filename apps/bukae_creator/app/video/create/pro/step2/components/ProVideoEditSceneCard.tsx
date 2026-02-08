'use client'

import { memo, useState, useEffect, useRef } from 'react'
import { GripVertical } from 'lucide-react'
import Image from 'next/image'
import { ProVideoUpload } from './ProVideoUpload'
import { ProVideoTimelineGrid } from './ProVideoTimelineGrid'

export interface ProVideoEditSceneCardProps {
  sceneIndex: number
  scriptText: string
  onScriptChange: (value: string) => void
  onVideoUpload?: (file: File) => Promise<void>
  onAiScriptClick?: () => void
  onAiGuideClick?: () => void
  /** TTS duration (초) - 타임라인 표시용 */
  ttsDuration?: number
  /** 촬영가이드 텍스트 */
  guideText?: string
  onGuideChange?: (value: string) => void
  /** 적용된 보이스 라벨 */
  voiceLabel?: string
  /** 업로드된 영상 URL */
  videoUrl?: string | null
  /** 업로드 중 여부 */
  isUploading?: boolean
  /** 격자 선택 영역 시작 시간 (초) - 초기값 */
  initialSelectionStartSeconds?: number
  /** 격자 선택 영역 변경 콜백 */
  onSelectionChange?: (startSeconds: number, endSeconds: number) => void
  /** 드래그 핸들 관련 props */
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  draggedIndex?: number | null
  dragOver?: { index: number; position: 'before' | 'after' } | null
}

export const ProVideoEditSceneCard = memo(function ProVideoEditSceneCard({
  sceneIndex,
  scriptText,
  onScriptChange,
  onVideoUpload,
  onAiScriptClick,
  onAiGuideClick,
  ttsDuration = 0,
  guideText = '',
  onGuideChange,
  voiceLabel,
  videoUrl,
  isUploading = false,
  initialSelectionStartSeconds = 0,
  onSelectionChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedIndex = null,
  dragOver: dragOverProp = null,
}: ProVideoEditSceneCardProps) {
  const isDragging = draggedIndex !== null && draggedIndex === sceneIndex - 1
  const isDropTargetBefore = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'before'
  const isDropTargetAfter = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'after'

  // 프레임 썸네일 관련 상태
  const [frameThumbnails, setFrameThumbnails] = useState<string[]>([])
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // 격자(선택 영역) 드래그 관련 상태
  // initialSelectionStartSeconds를 기본값으로 사용하되, 사용자가 드래그할 때만 내부 상태 업데이트
  const [selectionStartSeconds, setSelectionStartSeconds] = useState(() => initialSelectionStartSeconds ?? 0)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartSelectionLeft, setDragStartSelectionLeft] = useState(0)
  const timelineContainerRef = useRef<HTMLDivElement | null>(null)
  const prevInitialSelectionRef = useRef<number | undefined>(initialSelectionStartSeconds)

  // initialSelectionStartSeconds가 외부에서 변경될 때만 동기화 (드래그 중이 아닐 때만)
  useEffect(() => {
    if (isDraggingSelection) return // 드래그 중이면 업데이트하지 않음
    
    const prevValue = prevInitialSelectionRef.current
    const currentValue = initialSelectionStartSeconds
    
    // 값이 없거나 변경되지 않았으면 무시
    if (currentValue === undefined || currentValue === null) {
      return
    }
    
    // 이전 값과 현재 값이 같으면 무시 (ref만 업데이트)
    if (prevValue !== undefined && Math.abs((prevValue ?? 0) - currentValue) < 0.01) {
      prevInitialSelectionRef.current = currentValue
      return
    }
    
    // 내부 상태와 외부 prop이 다를 때만 동기화
    const currentDiff = Math.abs(selectionStartSeconds - currentValue)
    if (currentDiff > 0.01) {
      prevInitialSelectionRef.current = currentValue
      // 외부 prop 변경 시 내부 상태 동기화는 필요하므로 비동기로 처리
      const timeoutId = setTimeout(() => {
        setSelectionStartSeconds(currentValue)
      }, 0)
      return () => clearTimeout(timeoutId)
    } else {
      // 값이 이미 동일하면 ref만 업데이트
      prevInitialSelectionRef.current = currentValue
    }
  }, [initialSelectionStartSeconds, selectionStartSeconds, isDraggingSelection])

  // TTS duration이 변경되면 격자 위치 조정
  useEffect(() => {
    if (isDraggingSelection) return // 드래그 중이면 업데이트하지 않음
    
    // 실제 영상 길이 기준으로 제한
    // timelineDuration을 계산하여 정확한 끝지점 구하기
    const timelineDuration = videoDuration !== null && videoDuration > 0 
      ? Math.floor(videoDuration) 
      : Math.floor(ttsDuration || 10)
    const timeMarkersCount = timelineDuration + 1
    const actualVideoEndPx = timeMarkersCount * 74 // FRAME_WIDTH = 74
    const selectionWidthPx = (ttsDuration || 10) * 74
    const maxSelectionStartPx = Math.max(0, actualVideoEndPx - selectionWidthPx)
    const maxStart = maxSelectionStartPx / 74
    
    // selectionStartSeconds가 범위를 벗어나면 조정 (비동기로 처리)
    if (selectionStartSeconds > maxStart) {
      // setTimeout을 사용하여 비동기적으로 처리
      const timeoutId = setTimeout(() => {
        setSelectionStartSeconds(maxStart)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [ttsDuration, videoDuration, selectionStartSeconds, isDraggingSelection])

  // videoUrl이 없을 때 videoDuration 즉시 초기화 (stale UI 방지)
  useEffect(() => {
    if (!videoUrl) {
      // prop이 없을 때 파생 state를 즉시 초기화 (stale UI 방지)
      // eslint-disable-next-line -- intentional: sync derived state from prop
      setVideoDuration(null)
    }
  }, [videoUrl])

  // 영상의 실제 duration 가져오기
  useEffect(() => {
    if (!videoUrl) {
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    const handleLoadedMetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        console.log(`[비디오 길이] 정확한 duration: ${video.duration}초 (${video.duration.toFixed(3)}초)`)
        setVideoDuration(video.duration)
      }
    }

    // 이미 로드된 경우 즉시 처리
    if (video.readyState >= 1) {
      handleLoadedMetadata()
    } else {
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoUrl])

  // videoUrl이나 ttsDuration이 없을 때 썸네일 즉시 초기화 (stale UI 방지)
  useEffect(() => {
    if (!videoUrl || !ttsDuration) {
      // prop이 없을 때 파생 state를 즉시 초기화 (stale UI 방지)
      // eslint-disable-next-line -- intentional: sync derived state from prop
      setFrameThumbnails([])
    }
  }, [videoUrl, ttsDuration])

  // 영상에서 1초마다 프레임 썸네일 생성
  useEffect(() => {
    // videoUrl이나 ttsDuration이 없으면 종료
    if (!videoUrl || !ttsDuration) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      return
    }

    // 비디오가 로드되지 않았으면 대기
    // videoDuration이 null이면 아직 비디오 메타데이터가 로드되지 않은 상태
    if (videoDuration === null) {
      return
    }

    let isCancelled = false

    // 실제 영상 길이만 사용 (타임라인과 일치시키기 위해)
    // 비디오가 정확히 6초면 6초까지만 썸네일 생성 (0~6초 = 7개)
    // Math.floor를 사용하여 실제 비디오 길이의 초 단위까지만 생성
    const duration = videoDuration !== null && videoDuration > 0
      ? Math.floor(videoDuration)
      : Math.floor(ttsDuration || 10)
    
    const thumbnails: string[] = []

    const captureFrame = (second: number): Promise<void> => {
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

            // 캔버스 크기를 프레임 박스 크기에 맞춤 (74x84)
            canvas.width = 74
            canvas.height = 84

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
            thumbnails[second] = thumbnail

            video.removeEventListener('seeked', handleSeeked)
            resolve()
          } catch (error) {
            video.removeEventListener('seeked', handleSeeked)
            if (error instanceof Error && error.name === 'SecurityError') {
              console.warn(`CORS 오류로 인해 ${second}초 프레임을 캡처할 수 없습니다.`)
            } else {
              console.error(`${second}초 프레임 캡처 오류:`, error)
            }
            resolve() // 에러가 나도 계속 진행
          }
        }

        video.addEventListener('seeked', handleSeeked)
        video.currentTime = second
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
      const frameCount = duration + 1

      console.log(`[썸네일 생성 시작] duration: ${duration}, frameCount: ${frameCount}, videoWidth: ${video.videoWidth}, videoHeight: ${video.videoHeight}`)

      // 각 초마다 프레임 캡처 (0초부터 duration초까지, 총 duration + 1개)
      for (let i = 0; i <= duration; i++) {
        if (isCancelled) break
        await captureFrame(i)
        console.log(`[프레임 캡처 완료] ${i}초`)
      }

      // 썸네일 배열 설정 (취소되지 않았을 때만)
      if (!isCancelled) {
        const thumbnailArray: string[] = []
        for (let i = 0; i <= duration; i++) {
          thumbnailArray[i] = thumbnails[i] || ''
        }
        console.log(`[썸네일 설정 완료] 총 ${thumbnailArray.length}개, 실제 생성된 썸네일: ${thumbnailArray.filter(t => t).length}개`)
        setFrameThumbnails(thumbnailArray)
      }
    }

    generateThumbnails()

    // cleanup 함수: 컴포넌트 언마운트 또는 의존성 변경 시 취소
    return () => {
      isCancelled = true
    }
  }, [videoUrl, ttsDuration, videoDuration])

  // 타임라인 시간 마커 생성 (1초 단위)
  // 실제 영상 길이를 우선 사용하고, 영상이 없으면 TTS duration 사용
  // 격자가 실제 영상 길이 내에서만 움직이도록 타임라인도 실제 영상 길이만큼만 표시
  // Math.floor를 사용하여 실제 비디오 길이의 초 단위까지만 표시
  const getTimelineDuration = () => {
    if (videoDuration !== null && videoDuration > 0) {
      // 실제 영상 길이 사용 (초 단위로 내림)
      return Math.floor(videoDuration)
    }
    // 영상이 없으면 TTS duration 사용 (초 단위로 내림)
    return Math.floor(ttsDuration || 10)
  }

  const timelineDuration = getTimelineDuration()

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

  // 격자(선택 영역) 위치 계산 - TTS duration에 맞게 조정
  const FRAME_WIDTH = 74 // 각 프레임 너비 (px)
  const selectionWidthSeconds = ttsDuration || 10 // 격자 너비 = TTS duration
  
  // 선택 영역의 픽셀 단위 크기 (먼저 계산)
  const selectionWidthPx = selectionWidthSeconds * FRAME_WIDTH
  
  // 실제 영상의 마지막 지점 계산
  // timeMarkers.length = timelineDuration + 1 (0부터 timelineDuration까지)
  // 마지막 프레임 썸네일의 인덱스는 timelineDuration (예: 6초면 인덱스 6)
  // 마지막 프레임 썸네일의 끝은 timeMarkers.length * FRAME_WIDTH (예: 7 * 74 = 518px)
  // 격자의 오른쪽 끝이 마지막 프레임 썸네일의 끝에 닿을 수 있도록 해야 함
  const actualVideoEndPx = timeMarkers.length * FRAME_WIDTH // 마지막 프레임 썸네일의 끝 (픽셀)
  const actualVideoEndSeconds = actualVideoEndPx / FRAME_WIDTH // 마지막 프레임 썸네일의 끝 (초 단위)
  
  // 격자의 오른쪽 끝이 마지막 프레임 썸네일의 끝에 닿을 수 있도록 허용
  // 격자의 시작점은 (마지막 프레임 끝 - 격자 너비)까지만 가능
  const maxSelectionStartPx = Math.max(0, actualVideoEndPx - selectionWidthPx)
  const maxSelectionStartSeconds = maxSelectionStartPx / FRAME_WIDTH
  const clampedSelectionStartSeconds = Math.max(0, Math.min(selectionStartSeconds, maxSelectionStartSeconds))
  const clampedSelectionEndSeconds = Math.min(clampedSelectionStartSeconds + selectionWidthSeconds, actualVideoEndSeconds)
  
  // 선택 영역의 픽셀 단위 위치
  const selectionLeftPx = clampedSelectionStartSeconds * FRAME_WIDTH

  // 선택 영역이 실제로 변경될 때만 콜백 호출 (무한 루프 방지)
  // store에서 오는 initialSelectionStartSeconds와 비교하여 실제로 사용자가 변경한 경우에만 호출
  const prevSelectionRef = useRef<{ start: number; end: number } | null>(null)
  
  useEffect(() => {
    if (!onSelectionChange) return
    
    // initialSelectionStartSeconds와 비교하여 실제로 사용자가 변경한 경우에만 호출
    const initialStart = initialSelectionStartSeconds ?? 0
    const initialEnd = initialStart + (ttsDuration || 10)
    
    // 이전 값과 비교하여 실제로 변경된 경우에만 호출
    const prev = prevSelectionRef.current
    const hasChanged = prev === null ||
      Math.abs(prev.start - clampedSelectionStartSeconds) > 0.01 ||
      Math.abs(prev.end - clampedSelectionEndSeconds) > 0.01
    
    // store의 초기값과 다를 때만 호출 (사용자가 실제로 변경한 경우)
    // 또는 드래그 중일 때만 호출
    const differsFromInitial = Math.abs(clampedSelectionStartSeconds - initialStart) > 0.01 ||
      Math.abs(clampedSelectionEndSeconds - initialEnd) > 0.01
    
    if (hasChanged && (differsFromInitial || isDraggingSelection)) {
      prevSelectionRef.current = {
        start: clampedSelectionStartSeconds,
        end: clampedSelectionEndSeconds,
      }
      // 드래그 중이거나 초기값과 다를 때만 호출
      if (differsFromInitial || isDraggingSelection) {
        onSelectionChange(clampedSelectionStartSeconds, clampedSelectionEndSeconds)
      }
    } else if (hasChanged) {
      // 값이 변경되었지만 초기값과 같고 드래그 중이 아니면 ref만 업데이트
      prevSelectionRef.current = {
        start: clampedSelectionStartSeconds,
        end: clampedSelectionEndSeconds,
      }
    }
  }, [clampedSelectionStartSeconds, clampedSelectionEndSeconds, onSelectionChange, initialSelectionStartSeconds, ttsDuration, isDraggingSelection])

  // 격자 드래그 핸들러
  const handleSelectionMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingSelection(true)
    setDragStartX(e.clientX)
    setDragStartSelectionLeft(selectionLeftPx)
  }

  const handleSelectionMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSelection || !timelineContainerRef.current) return
    
    e.preventDefault()
    const deltaX = e.clientX - dragStartX
    // 마우스를 정확히 따라가도록 1:1 비율 사용
    
    // 마지막 프레임 썸네일의 끝까지 갈 수 있도록 제한
    const actualVideoEndPx = timeMarkers.length * FRAME_WIDTH
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
    setSelectionStartSeconds(newSelectionStartSeconds)
  }

  const handleSelectionMouseUp = () => {
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
      // timelineDuration을 계산하여 timeMarkers.length를 구함
      const timelineDuration = Math.floor(videoDuration !== null && videoDuration > 0 ? videoDuration : (ttsDuration || 10))
      const timeMarkersCount = timelineDuration + 1 // 0부터 timelineDuration까지
      const actualVideoEndPx = timeMarkersCount * FRAME_WIDTH
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
      setSelectionStartSeconds(newSelectionStartSeconds)
    }

    const handleMouseUp = () => {
      setIsDraggingSelection(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingSelection, dragStartX, dragStartSelectionLeft, timeMarkers, selectionWidthPx, videoDuration, ttsDuration])
  
  // 격자에 포함되는 시간 마커 인덱스 계산
  const getIsInSelection = (idx: number) => {
    const markerTime = idx // idx는 초 단위
    // 격자 범위 내에 있는지 확인
    return markerTime >= Math.floor(clampedSelectionStartSeconds) && markerTime < clampedSelectionEndSeconds
  }
  
  // 격자의 시작/끝 지점에 큰 틱 표시 여부
  const getIsMajorTick = (idx: number) => {
    const markerTime = idx
    // 격자 시작/끝 지점에 큰 틱
    const endMarkerTime = Math.floor(clampedSelectionEndSeconds)
    return markerTime === Math.floor(clampedSelectionStartSeconds) || markerTime === endMarkerTime
  }

  return (
    <div
      // 카드 자체는 드래그 시작 지점이 아니고, 드래그 핸들만 드래그 가능
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-2xl border border-white/10 p-6 shadow-(--shadow-card-default) transition-all ${
        isDragging ? 'opacity-50' : 'bg-white/80'
      }`}
    >
      {isDropTargetBefore && (
        <div className="h-0.5 bg-brand-teal rounded-full -mt-3 mb-3" aria-hidden />
      )}

      <div className="flex gap-4 items-stretch">
        {/* 좌측: 드래그 핸들 - 중앙 정렬 (여기서만 씬 카드 드래그 시작) */}
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
              onUpload={onVideoUpload} 
              isLoading={isUploading}
              videoUrl={videoUrl}
              selectionStartSeconds={clampedSelectionStartSeconds}
              selectionEndSeconds={clampedSelectionEndSeconds}
            />
          </div>

          {/* 우측: 스크립트 + 타임라인 영역 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 상단 영역: SCENE 라벨 + 스크립트/가이드 버튼들 */}
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
                  SCENE {sceneIndex}
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
              <div className="flex gap-4 mb-6">
                {/* 중앙: 스크립트 영역 */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* 스크립트 텍스트 영역 - 버튼이 textarea 내부에 위치 */}
                  <div className="relative rounded-lg bg-white shadow-(--shadow-card-default) overflow-hidden border-2 border-transparent" style={{ minHeight: '74px', boxSizing: 'border-box' }}>
                    {/* AI 스크립트 표시 - textarea 내부 왼쪽 상단 */}
                    {onAiScriptClick && (
                      <div
                        className="absolute left-3 top-3 z-10 h-[25px] px-3 bg-brand-teal text-white rounded-2xl font-bold flex items-center gap-4 pointer-events-none"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16.8px',
                        }}
                      >
                        AI 스크립트
                      </div>
                    )}
                    {/* 스크립트 텍스트 영역 */}
                    <textarea
                      value={scriptText}
                      onChange={(e) => onScriptChange(e.target.value)}
                      placeholder="스크립트를 입력하세요."
                      rows={2}
                      readOnly
                      className="w-full p-3 rounded-lg bg-transparent text-text-tertiary placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none border-0 cursor-default"
                      style={{
                        fontSize: 'var(--font-size-14)',
                        lineHeight: '25.2px',
                        fontWeight: 500,
                        letterSpacing: '-0.14px',
                        paddingLeft: onAiScriptClick ? 'calc(12px + 73px + 16px)' : '12px', // left-3(12px) + 버튼너비(73px) + 간격(16px)
                        paddingTop: onAiScriptClick ? '12px' : '12px', // 버튼과 같은 높이에서 시작
                        minHeight: '74px',
                      }}
                    />
                  </div>
                </div>

                {/* 우측: 촬영가이드 영역 */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* 촬영가이드 텍스트 영역 - 버튼이 textarea 내부에 위치 */}
                  <div className="relative rounded-lg bg-white/30 shadow-(--shadow-card-default) overflow-hidden border-2 border-white backdrop-blur-sm" style={{ minHeight: '74px', boxSizing: 'border-box' }}>
                    {/* AI 촬영가이드 표시 - textarea 내부 왼쪽 상단 */}
                    {onAiGuideClick && (
                      <div
                        className="absolute left-3 top-3 z-10 h-[25px] px-3 bg-brand-teal text-white rounded-2xl font-bold flex items-center gap-4 pointer-events-none"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16.8px',
                        }}
                      >
                        AI 촬영가이드
                      </div>
                    )}
                    {/* 촬영가이드 텍스트 영역 */}
                    <textarea
                      value={guideText}
                      onChange={(e) => onGuideChange?.(e.target.value)}
                      placeholder="촬영가이드를 입력하세요."
                      rows={2}
                      readOnly
                      className="w-full p-3 rounded-lg bg-transparent text-text-dark placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none border-0 cursor-default"
                      style={{
                        fontSize: 'var(--font-size-14)',
                        lineHeight: '25.2px',
                        fontWeight: 500,
                        letterSpacing: '-0.14px',
                        paddingLeft: onAiGuideClick ? 'calc(12px + 83px + 16px)' : '12px', // left-3(12px) + 버튼너비(83px) + 간격(16px)
                        paddingTop: onAiGuideClick ? '12px' : '12px', // 버튼과 같은 높이에서 시작
                        minHeight: '74px',
                      }}
                    />
                  </div>
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
              <div className="relative shrink-0" style={{ width: `${timeMarkers.length * 74}px`, paddingTop: '18px', paddingBottom: '18px' }}>
                {/* 실제 영상 프레임 박스 (클리핑 영역) */}
                <div className="relative h-[84px] bg-white rounded-2xl border border-gray-300 overflow-hidden">
                  {/* 격자 패턴 - 각 74px 너비의 프레임들 */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: timeMarkers.length }).map((_, idx) => (
                      <div
                        key={idx}
                        className="shrink-0 relative border-r border-[#a6a6a6] overflow-hidden"
                        style={{ width: '74px', height: '100%' }}
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
                {/* 격자 내부 전체를 드래그 가능하게 하기 위해 컨테이너 div를 확장 */}
                <div
                  onMouseDown={handleSelectionMouseDown}
                  onMouseMove={handleSelectionMouseMove}
                  onMouseUp={handleSelectionMouseUp}
                  className="cursor-move"
                  style={{
                    position: 'absolute',
                    left: `${selectionLeftPx}px`,
                    width: `${selectionWidthPx}px`,
                    top: '18px', // 프레임 박스와 같은 위치 (paddingTop 아래)
                    height: 'calc(100% - 18px)', // paddingTop을 제외한 높이
                    zIndex: 10,
                    pointerEvents: 'auto', // 격자 내부 전체가 클릭 가능하도록
                  }}
                >
                  <ProVideoTimelineGrid
                    frameHeight={84}
                    selectionLeft={0}
                    selectionWidth={selectionWidthPx}
                    extendY={18}
                  />
                </div>
              </div>

              {/* 시간 마커 */}
              <div 
                className="relative flex shrink-0"
                style={{ width: `${timeMarkers.length * 74}px` }}
                onDragStart={(e) => {
                  // 시간 마커 영역에서도 씬 카드 드래그 방지
                  e.stopPropagation()
                  e.preventDefault()
                }}
              >
                {/* 가로 라인 - 영상 프레임 전체 길이만큼 */}
                <div 
                  className="absolute top-0 left-0 h-px bg-[#a6a6a6]"
                  style={{ width: `${timeMarkers.length * 74}px` }}
                />
                
                {timeMarkers.map((marker, idx) => {
                  const isInSelection = getIsInSelection(idx)
                  const isMajorTick = getIsMajorTick(idx)
                  
                  return (
                    <div
                      key={idx}
                      className="shrink-0 flex flex-col items-center relative"
                      style={{ width: '74px' }}
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
                        className={`font-medium mt-2 ${
                          isInSelection ? 'text-text-dark' : 'text-text-tertiary'
                        }`}
                        style={{
                          fontSize: '16px',
                          lineHeight: '22.4px',
                          letterSpacing: '-0.32px',
                        }}
                      >
                        {marker}
                      </span>
                    </div>
                  )
                })}
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
