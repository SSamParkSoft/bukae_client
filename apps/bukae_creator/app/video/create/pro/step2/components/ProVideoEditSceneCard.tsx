'use client'

import { memo } from 'react'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProVideoUpload } from './ProVideoUpload'

export interface ProVideoEditSceneCardProps {
  sceneIndex: number
  scriptText: string
  onScriptChange: (value: string) => void
  onVideoUpload?: () => void
  onAiScriptClick?: () => void
  onAiGuideClick?: () => void
  /** TTS duration (초) - 타임라인 표시용 */
  ttsDuration?: number
  /** 촬영가이드 텍스트 */
  guideText?: string
  onGuideChange?: (value: string) => void
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

  // 타임라인 시간 마커 생성 (1초 단위)
  const generateTimeMarkers = () => {
    const duration = Math.ceil(ttsDuration || 10) // 최소 10초, TTS duration이 있으면 그만큼
    const markers = []
    for (let i = 0; i <= duration; i++) {
      const minutes = Math.floor(i / 60)
      const seconds = i % 60
      markers.push(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }
    return markers
  }

  const timeMarkers = generateTimeMarkers()

  // 격자(선택 영역) 위치 계산 - 현재는 고정값 (나중에 동적으로 변경 가능)
  const FRAME_WIDTH = 74 // 각 프레임 너비 (px)
  const selectionStartSeconds = 3.5 // 격자 시작 시간 (초)
  const selectionWidthSeconds = 5 // 격자 너비 (초)
  const selectionEndSeconds = selectionStartSeconds + selectionWidthSeconds // 격자 끝 시간 (초)
  
  // 격자에 포함되는 시간 마커 인덱스 계산
  const getIsInSelection = (idx: number) => {
    const markerTime = idx // idx는 초 단위
    return markerTime >= Math.floor(selectionStartSeconds) && markerTime <= Math.ceil(selectionEndSeconds)
  }
  
  // 격자의 시작/끝 지점에 큰 틱 표시 여부
  const getIsMajorTick = (idx: number) => {
    const markerTime = idx
    // 격자 시작 지점 (3.5초) → 3초에 큰 틱
    // 격자 끝 지점 (8.5초) → 8초에 큰 틱
    return markerTime === Math.floor(selectionStartSeconds) || markerTime === Math.ceil(selectionEndSeconds)
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
            <ProVideoUpload onUpload={onVideoUpload} />
          </div>

          {/* 우측: 스크립트 + 타임라인 영역 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 상단 영역: SCENE 라벨 + 스크립트/가이드 버튼들 */}
            <div className="flex flex-col">
              {/* SCENE 라벨 */}
              <div className="flex items-center mb-4">
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
              </div>

              {/* 스크립트 영역 */}
              <div className="flex gap-4 mb-6">
                {/* 중앙: 스크립트 영역 */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* 스크립트 텍스트 영역 - 버튼이 textarea 내부에 위치 */}
                  <div className="relative rounded-lg bg-white shadow-[var(--shadow-card-default)] overflow-hidden border-2 border-transparent" style={{ minHeight: '74px', boxSizing: 'border-box' }}>
                    {/* AI 스크립트 버튼 - textarea 내부 왼쪽 상단 */}
                    {onAiScriptClick && (
                      <Button
                        type="button"
                        onClick={onAiScriptClick}
                        className="absolute left-3 top-3 z-10 h-[25px] px-3 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-bold flex items-center gap-4"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16.8px',
                        }}
                      >
                        AI 스크립트
                      </Button>
                    )}
                    {/* 스크립트 텍스트 영역 */}
                    <textarea
                      value={scriptText}
                      onChange={(e) => onScriptChange(e.target.value)}
                      placeholder="스크립트를 입력하세요."
                      rows={2}
                      className="w-full p-3 rounded-lg bg-transparent text-text-tertiary placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none border-0"
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
                  <div className="relative rounded-lg bg-white/10 shadow-[var(--shadow-card-default)] overflow-hidden border-2 border-white" style={{ minHeight: '74px', boxSizing: 'border-box' }}>
                    {/* AI 촬영가이드 버튼 - textarea 내부 왼쪽 상단 */}
                    {onAiGuideClick && (
                      <Button
                        type="button"
                        onClick={onAiGuideClick}
                        className="absolute left-3 top-3 z-10 h-[25px] px-3 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-bold flex items-center gap-4"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16.8px',
                        }}
                      >
                        AI 촬영가이드
                      </Button>
                    )}
                    {/* 촬영가이드 텍스트 영역 */}
                    <textarea
                      value={guideText}
                      onChange={(e) => onGuideChange?.(e.target.value)}
                      placeholder="촬영가이드를 입력하세요."
                      rows={2}
                      className="w-full p-3 rounded-lg bg-transparent text-text-dark placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none border-0"
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
              className="relative"
              onDragStart={(e) => {
                // 타임라인 영역에서는 씬 카드 드래그 방지
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              {/* 격자 편집 타임라인 */}
              <div className="relative h-[84px] bg-white rounded-2xl border border-gray-300 overflow-hidden mb-4">
                {/* 격자 패턴 - 각 74px 너비의 프레임들 */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.ceil(ttsDuration || 10) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="shrink-0 relative border-r border-[#a6a6a6]"
                      style={{ width: '74px', height: '100%' }}
                    >
                      {/* 배경 이미지/비디오 썸네일 영역 (Figma에서는 이미지로 표시) */}
                      <div className="absolute inset-0 bg-[#111111] opacity-40" />
                    </div>
                  ))}
                </div>
                
                {/* 선택 영역 표시 (격자) - 동적으로 계산된 위치 */}
                <div 
                  className="absolute top-0 h-full border-l-2 border-r-2 border-[#2c2c2c] rounded-2xl" 
                  style={{
                    left: `${selectionStartSeconds * FRAME_WIDTH}px`,
                    width: `${selectionWidthSeconds * FRAME_WIDTH}px`,
                  }}
                />
              </div>

              {/* 시간 마커 */}
              <div 
                className="relative flex overflow-x-auto scrollbar-hide"
                onDragStart={(e) => {
                  // 시간 마커 영역에서도 씬 카드 드래그 방지
                  e.stopPropagation()
                  e.preventDefault()
                }}
              >
                {/* 가로 라인 - 영상 프레임 길이만큼 */}
                <div 
                  className="absolute top-0 left-0 h-px bg-[#a6a6a6]"
                  style={{ width: `${(timeMarkers.length - 1) * 74}px` }}
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
