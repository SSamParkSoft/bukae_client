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
 * - 텍스트 편집 모드(useFabricEditing)일 때만 Fabric 표시, 그 외에는 Pixi 표시
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
  // Pixi 캔버스 및 자막 레이어 표시 제어
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
      return
    }

    if (useFabricEditing && fabricReady) {
      appCanvas.style.opacity = '0'
      appCanvas.style.pointerEvents = 'none'
      const sub = subtitleContainerRef.current
      if (sub) {
        sub.visible = false
        sub.alpha = 0
      }
    } else {
      appCanvas.style.opacity = '1'
      appCanvas.style.pointerEvents = 'auto'
      const sub = subtitleContainerRef.current
      if (sub) {
        sub.visible = true
        sub.alpha = 1
      }
    }
  }, [useFabricEditing, fabricReady, pixiReady, isPlaying, appRef, subtitleContainerRef])

  // Fabric 캔버스 표시 제어
  useEffect(() => {
    if (!fabricCanvasRef.current) return
    const fabricCanvas = fabricCanvasRef.current

    if (isPlaying) {
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '0'
        fabricCanvas.wrapperEl.style.pointerEvents = 'none'
      }
    } else {
      if (fabricCanvas.wrapperEl) {
        fabricCanvas.wrapperEl.style.opacity = '1'
        fabricCanvas.wrapperEl.style.pointerEvents = 'auto'
      }
    }
  }, [isPlaying, fabricReady, useFabricEditing, fabricCanvasRef])
}
