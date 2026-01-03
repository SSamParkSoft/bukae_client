import { useEffect, useRef } from 'react'
import { resolveSubtitleFontFamily, loadSubtitleFont, isSubtitleFontId } from '@/lib/subtitle-fonts'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UseFontLoaderParams {
  pixiReady: boolean
  timeline: TimelineData | null
  currentSceneIndex: number
  onFontLoaded: () => void | Promise<void>
}

/**
 * 폰트 로딩 hook
 * 현재 씬의 폰트를 감지하고 로드합니다.
 */
export function useFontLoader({
  pixiReady,
  timeline,
  currentSceneIndex,
  onFontLoaded,
}: UseFontLoaderParams) {
  const lastSubtitleFontKeyRef = useRef<string>('')

  useEffect(() => {
    if (!pixiReady || !timeline || timeline.scenes.length === 0) return

    const scene = timeline.scenes[currentSceneIndex]
    if (!scene) return

    const fontFamily = resolveSubtitleFontFamily(scene.text.font)
    const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
    const key = `${fontFamily}:${fontWeight}`
    if (lastSubtitleFontKeyRef.current === key) return
    lastSubtitleFontKeyRef.current = key

    let cancelled = false
    ;(async () => {
      try {
        // Supabase Storage에서 폰트 로드
        const fontId = scene.text.font?.trim()
        if (fontId && isSubtitleFontId(fontId)) {
          await loadSubtitleFont(fontId)
        }

        // document.fonts가 없는 환경에서는 스킵
        if (typeof document === 'undefined' || !(document as any).fonts?.load) return
        await (document as any).fonts.load(`${fontWeight} 16px ${fontFamily}`)
        if (cancelled) return
        await onFontLoaded()
      } catch {
        // ignore (fallback font로라도 렌더)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pixiReady, timeline, currentSceneIndex, onFontLoaded])
}

