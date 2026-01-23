import { useState, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import * as PIXI from 'pixi.js'

interface UseCanvasSizeParams {
  appRef: MutableRefObject<PIXI.Application | null>
  pixiContainerRef: MutableRefObject<HTMLDivElement | null>
  stageDimensions: { width: number; height: number }
}

/**
 * Canvas 크기 관리 hook
 * Canvas 크기 계산 및 조정 로직을 담당합니다.
 */
export function useCanvasSize({
  appRef,
  pixiContainerRef,
  stageDimensions,
}: UseCanvasSizeParams) {
  const [canvasSize, setCanvasSize] = useState<{ width: string; height: string }>({ 
    width: '100%', 
    height: '100%' 
  })

  // Canvas 크기 재계산
  const recalculateCanvasSize = useCallback(() => {
    if (!appRef.current || !pixiContainerRef.current) return

    const container = pixiContainerRef.current
    const containerRect = container.getBoundingClientRect()
    const containerWidth = containerRect.width
    const containerHeight = containerRect.height

    // 9:16 비율 유지
    const aspectRatio = 9 / 16
    let displayWidth = containerWidth
    let displayHeight = containerWidth / aspectRatio

    // 높이가 컨테이너를 넘으면 높이 기준으로 조정
    if (displayHeight > containerHeight) {
      displayHeight = containerHeight
      displayWidth = containerHeight * aspectRatio
    }

    setCanvasSize({ width: `${displayWidth}px`, height: `${displayHeight}px` })
  }, [appRef, pixiContainerRef])

  return {
    canvasSize,
    setCanvasSize,
    recalculateCanvasSize,
  }
}

