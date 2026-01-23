import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import * as PIXI from 'pixi.js'

interface UseGridManagerParams {
  showGrid: boolean
  pixiReady: boolean
  appRef: MutableRefObject<PIXI.Application | null>
  stageDimensions: { width: number; height: number }
  canvasSize: { width: string; height: string }
  pixiContainerRef: MutableRefObject<HTMLDivElement | null>
  timelineScenesLength?: number
}

/**
 * 격자 관리 hook
 * 격자 그리기, 표시/숨김, 오버레이 크기 계산을 담당합니다.
 */
export function useGridManager({
  showGrid,
  pixiReady,
  appRef,
  stageDimensions,
  canvasSize,
  pixiContainerRef,
  timelineScenesLength,
}: UseGridManagerParams) {
  const gridGraphicsRef = useRef<PIXI.Graphics | null>(null)

  // 격자 그리기 함수
  const drawGrid = useCallback(() => {
    if (!appRef.current) return

    // 기존 격자 제거
    if (gridGraphicsRef.current && gridGraphicsRef.current.parent) {
      gridGraphicsRef.current.parent.removeChild(gridGraphicsRef.current)
      gridGraphicsRef.current.destroy()
      gridGraphicsRef.current = null
    }

    if (!showGrid) return

    const { width, height } = stageDimensions
    const gridGraphics = new PIXI.Graphics()
    
    // 격자 색상 설정
    const lineColor = 0xffffff
    const lineAlpha = 0.6
    const lineWidth = 2
    const areaAlpha = 0.1

    // 이미지 영역: 상단 15%부터 시작, 높이 70% (하단 15% 여백)
    const imageAreaY = height * 0.15
    const imageAreaHeight = height * 0.7
    
    // 자막 영역: 하단에서 약 8% 위에 위치, 높이 7%
    const textAreaY = height * 0.92
    const textAreaHeight = height * 0.07
    const textAreaWidth = width * 0.75
    const textAreaX = width * 0.5 - textAreaWidth / 2

    // 이미지 영역 배경 (반투명)
    gridGraphics.fill({ color: 0x00ff00, alpha: areaAlpha }) // 초록색 반투명
    gridGraphics.rect(0, imageAreaY, width, imageAreaHeight)

    // 이미지 영역 테두리
    gridGraphics.setStrokeStyle({ color: 0x00ff00, width: lineWidth, alpha: lineAlpha }) // 초록색
    gridGraphics.rect(0, imageAreaY, width, imageAreaHeight)

    // 자막 영역 배경 (반투명)
    gridGraphics.fill({ color: 0x0000ff, alpha: areaAlpha }) // 파란색 반투명
    gridGraphics.rect(textAreaX, textAreaY - textAreaHeight / 2, textAreaWidth, textAreaHeight)

    // 자막 영역 테두리
    gridGraphics.setStrokeStyle({ color: 0x0000ff, width: lineWidth, alpha: lineAlpha }) // 파란색
    gridGraphics.rect(textAreaX, textAreaY - textAreaHeight / 2, textAreaWidth, textAreaHeight)

    // 3x3 격자선 (Rule of Thirds) - 흰색
    gridGraphics.setStrokeStyle({ color: lineColor, width: 1, alpha: lineAlpha * 0.5 })
    // 수직선 2개 (1/3, 2/3 위치)
    gridGraphics.moveTo(width / 3, 0)
    gridGraphics.lineTo(width / 3, height)
    gridGraphics.moveTo(width * 2 / 3, 0)
    gridGraphics.lineTo(width * 2 / 3, height)
    // 수평선 2개 (1/3, 2/3 위치)
    gridGraphics.moveTo(0, height / 3)
    gridGraphics.lineTo(width, height / 3)
    gridGraphics.moveTo(0, height * 2 / 3)
    gridGraphics.lineTo(width, height * 2 / 3)

    // 중앙선 (가로, 세로)
    gridGraphics.moveTo(0, height / 2)
    gridGraphics.lineTo(width, height / 2)
    gridGraphics.moveTo(width / 2, 0)
    gridGraphics.lineTo(width / 2, height)

    // 격자를 stage에 직접 추가하여 항상 최상위에 표시
    appRef.current.stage.addChild(gridGraphics)
    gridGraphicsRef.current = gridGraphics
  }, [showGrid, stageDimensions, appRef])

  // 격자 표시/숨김
  useEffect(() => {
    if (!pixiReady || !appRef.current) return
    drawGrid()
    // 격자 표시 시 canvas 크기에 맞춰 오버레이도 업데이트되도록 강제 리렌더링
    if (showGrid) {
      requestAnimationFrame(() => {
        if (appRef.current) {
          // 렌더링은 PixiJS ticker가 처리
        }
      })
    }
    // drawGrid가 이미 appRef를 dependency로 포함하고 있음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGrid, pixiReady, drawGrid])

  // Canvas 실제 크기 계산 (container div와 동기화용)
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    if (!pixiReady || !appRef.current || !pixiContainerRef.current) {
      return
    }

    const updateCanvasSize = () => {
      if (!appRef.current || !pixiContainerRef.current) {
        return
      }
      const canvas = appRef.current.canvas
      const canvasRect = canvas.getBoundingClientRect()
      const actualWidth = canvasRect.width > 0 ? canvasRect.width : (parseFloat(canvas.style.width) || parseFloat(canvasSize.width.replace('px', '')) || 0)
      const actualHeight = canvasRect.height > 0 ? canvasRect.height : (parseFloat(canvasSize.height.replace('px', '')) || parseFloat(canvasSize.height.replace('px', '')) || 0)
      
      if (actualWidth <= 0 || actualHeight <= 0) {
        return
      }
      
      setCanvasDisplaySize({ width: actualWidth, height: actualHeight })
    }

    // 초기 크기 계산
    requestAnimationFrame(updateCanvasSize)

    // ResizeObserver로 크기 변경 감지
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateCanvasSize)
    })

    const container = pixiContainerRef.current
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize, pixiReady])

  // 격자 오버레이 크기 계산 (canvas 실제 크기 사용)
  const gridOverlaySize = useMemo(() => {
    if (!showGrid || !canvasDisplaySize) return null
    return canvasDisplaySize
  }, [showGrid, canvasDisplaySize])

  // loadAllScenes 후 격자 다시 그리기
  useEffect(() => {
    if (!pixiReady || !showGrid) return
    // loadAllScenes가 완료된 후 격자를 다시 그리기 위해 약간의 지연
    const timer = setTimeout(() => {
      drawGrid()
    }, 100)
    return () => clearTimeout(timer)
  }, [pixiReady, timelineScenesLength, showGrid, drawGrid])

  return {
    gridGraphicsRef,
    gridOverlaySize,
    canvasDisplaySize,
    drawGrid,
  }
}

