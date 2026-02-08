'use client'

import { memo } from 'react'

export interface ProVideoTimelineGridProps {
  /** 프레임 높이(px) - 예: 84 */
  frameHeight: number
  /** 격자(선택 영역) 시작 X 위치(px) */
  selectionLeft: number
  /** 격자(선택 영역) 너비(px) */
  selectionWidth: number
  /** 프레임 위/아래로 얼마나 튀어나올지(px) */
  extendY?: number
}

/**
 * 타임라인 격자(선택 강조선) 컴포넌트.
 * 프레임 상단/하단을 따라 가로선이 생기고,
 * 좌우에는 프레임 위·아래로 살짝 튀어나오는 세로선이 생긴다.
 */
export const ProVideoTimelineGrid = memo(function ProVideoTimelineGrid({
  frameHeight,
  selectionLeft,
  selectionWidth,
  extendY = 18,
}: ProVideoTimelineGridProps) {
  const selectionRight = selectionLeft + selectionWidth
  // 격자 컨테이너가 프레임 박스와 같은 위치에 있으므로, frameTop은 0으로 설정
  const frameTop = 0

  return (
    <>
      {/* 상단 가로선 (프레임 상단 border 위치에 딱 맞게) */}
      <div
        className="pointer-events-none absolute border-t-2 border-[#111111]"
        style={{
          left: `${selectionLeft}px`,
          width: `${selectionWidth}px`,
          top: `${frameTop}px`,
        }}
      />
      {/* 하단 가로선 (프레임 하단 border 위치에 딱 맞게) */}
      <div
        className="pointer-events-none absolute border-b-2 border-[#111111]"
        style={{
          left: `${selectionLeft}px`,
          width: `${selectionWidth}px`,
          top: `${frameTop + frameHeight}px`,
        }}
      />
      {/* 좌측 세로선 (프레임 기준 위/아래 비율 맞게 살짝씩 확장) */}
      <div
        className="pointer-events-none absolute border-l-2 border-[#111111]"
        style={{
          left: `${selectionLeft}px`,
          top: `${-extendY}px`, // extendY만큼 위로 확장
          height: `${frameHeight + extendY * 2}px`,
        }}
      />
      {/* 우측 세로선 */}
      <div
        className="pointer-events-none absolute border-l-2 border-[#111111]"
        style={{
          left: `${selectionRight}px`,
          top: `${-extendY}px`, // extendY만큼 위로 확장
          height: `${frameHeight + extendY * 2}px`,
        }}
      />
    </>
  )
}
)
