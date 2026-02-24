'use client'

import { useEffect } from 'react'
import type * as PIXI from 'pixi.js'
import type { Canvas } from 'fabric'

function getAppCanvas(app: PIXI.Application | null | undefined): HTMLCanvasElement | null {
  if (!app) return null
  const rendererCanvas = (
    app as PIXI.Application & { renderer?: { canvas?: HTMLCanvasElement | null } }
  ).renderer?.canvas
  if (rendererCanvas) return rendererCanvas
  try {
    return (app.canvas as HTMLCanvasElement | undefined) ?? null
  } catch {
    return null
  }
}

interface UseProEditModeManagerParams {
  appRef: React.RefObject<PIXI.Application | null>
  fabricCanvasRef: React.RefObject<Canvas | null>
  subtitleContainerRef: React.RefObject<PIXI.Container | null>
  useFabricEditing: boolean
  pixiReady: boolean
  fabricReady: boolean
  isPlaying: boolean
}

/**
 * Pro step3 캔버스 표시 제어 (Fast useEditModeManager와 동일한 visibility 패턴)
 * - 편집 모드(useFabricEditing)일 때만 Fabric 표시, 그 외에는 Pixi 표시
 * - 재생 중에는 항상 Pixi 표시, Fabric 숨김
 */
export function useProEditModeManager({
  appRef,
  fabricCanvasRef,
  subtitleContainerRef,
  useFabricEditing,
  pixiReady,
  fabricReady,
  isPlaying,
}: UseProEditModeManagerParams) {
  // Pixi 캔버스는 항상 보이게 유지 (Fabric은 투명 오버레이로만 사용)
  useEffect(() => {
    if (!pixiReady || !appRef.current) return

    const appCanvas = getAppCanvas(appRef.current)
    if (!appCanvas) return

    if (isPlaying) {
      appCanvas.style.opacity = '1'
      appCanvas.style.pointerEvents = 'none'
      const sub = subtitleContainerRef.current
      if (sub) {
        sub.visible = true
        sub.alpha = 1
      }
    } else {
      // 재생 중이 아닐 때는 항상 PixiJS 보이기 (Fabric은 투명하게 오버레이)
      appCanvas.style.opacity = '1'
      appCanvas.style.pointerEvents = useFabricEditing ? 'none' : 'auto'
      const sub = subtitleContainerRef.current
      if (sub) {
        sub.visible = true
        sub.alpha = 1
      }
    }
  }, [useFabricEditing, fabricReady, pixiReady, isPlaying, appRef, subtitleContainerRef])

  // Fabric 캔버스는 항상 투명하게 유지 (리사이즈/드래그만 처리)
  // PixiJS는 항상 보이고, Fabric은 투명 오버레이로만 작동
  useEffect(() => {
    if (!fabricCanvasRef.current) return
    const fabricCanvas = fabricCanvasRef.current

    if (isPlaying) {
      // 재생 중에는 Fabric을 완전히 숨기고 클릭을 통과시킴
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '0'
        fabricCanvas.wrapperEl.style.pointerEvents = 'none'
      }
      if (fabricCanvas.upperCanvasEl) {
        fabricCanvas.upperCanvasEl.style.opacity = '0'
        fabricCanvas.upperCanvasEl.style.pointerEvents = 'none'
      }
      if (fabricCanvas.lowerCanvasEl) {
        fabricCanvas.lowerCanvasEl.style.opacity = '0'
        fabricCanvas.lowerCanvasEl.style.pointerEvents = 'none'
      }
    } else {
      // 비재생 상태에서는 upper-canvas를 항상 활성화해 첫 클릭에서도 선택/핸들 진입 보장
      // - upper-canvas: 컨트롤/선택 hit-test 처리
      // - lower-canvas: 픽셀 렌더는 숨겨서 Pixi만 보이게 유지
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '1'
        fabricCanvas.wrapperEl.style.pointerEvents = 'auto'
      }
      if (fabricCanvas.upperCanvasEl) {
        fabricCanvas.upperCanvasEl.style.opacity = '1'
        fabricCanvas.upperCanvasEl.style.pointerEvents = 'auto'
      }
      if (fabricCanvas.lowerCanvasEl) {
        // 일부 Fabric 버전/상태에서 컨트롤이 lower canvas에 그려질 수 있어 편집 중에는 visible 유지
        fabricCanvas.lowerCanvasEl.style.opacity = '1'
        fabricCanvas.lowerCanvasEl.style.pointerEvents = 'none'
      }
    }
  }, [isPlaying, fabricReady, useFabricEditing, fabricCanvasRef])
}
