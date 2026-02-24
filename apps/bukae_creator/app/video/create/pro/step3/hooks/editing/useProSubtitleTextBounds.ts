'use client'

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'

export interface ProSubtitleTextBounds {
  width: number
  height: number
}

interface UseProSubtitleTextBoundsParams {
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
}

function toPositiveFinite(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

export function useProSubtitleTextBounds({ textsRef }: UseProSubtitleTextBoundsParams) {
  const getSubtitleTextBounds = useCallback((sceneIndex: number): ProSubtitleTextBounds | null => {
    const textObj = textsRef.current.get(sceneIndex)
    if (!textObj || textObj.destroyed) {
      return null
    }

    const textContent = typeof textObj.text === 'string' ? textObj.text : ''
    if (textContent.length === 0) {
      return null
    }

    // 1) TextMetrics 기반: 워드랩/라인브레이크 포함한 실제 텍스트 크기
    try {
      const metrics = PIXI.CanvasTextMetrics.measureText(textContent, textObj.style as PIXI.TextStyle)
      const maxLineWidth = toPositiveFinite(
        (metrics as PIXI.CanvasTextMetrics & { maxLineWidth?: number }).maxLineWidth,
        0
      )
      const width = toPositiveFinite(maxLineWidth, toPositiveFinite(metrics.width, 0))
      const height = toPositiveFinite(metrics.height, 0)
      if (width > 0 && height > 0) {
        return { width, height }
      }
    } catch {
      // 폴백으로 local bounds 사용
    }

    // 2) local bounds 폴백
    try {
      const localBounds = textObj.getLocalBounds()
      const width = toPositiveFinite(localBounds.width, 0)
      const height = toPositiveFinite(localBounds.height, 0)
      if (width > 0 && height > 0) {
        return { width, height }
      }
    } catch {
      // no-op
    }

    return null
  }, [textsRef])

  return {
    getSubtitleTextBounds,
  }
}
