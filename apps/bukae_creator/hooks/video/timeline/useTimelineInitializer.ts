import { useEffect } from 'react'
import { getSceneDuration } from '@/utils/timeline'
import { SUBTITLE_DEFAULT_FONT_ID } from '@/lib/subtitle-fonts'
import type { TimelineData, SceneScript } from '@/store/useVideoCreateStore'

interface UseTimelineInitializerParams {
  scenes: SceneScript[]
  selectedImages: string[]
  subtitleFont: string | null
  subtitleColor: string | null
  subtitlePosition: string | null
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData) => void
}

/**
 * 타임라인 초기화 hook
 * scenes에서 timeline을 생성하고, playbackSpeed를 동기화합니다.
 */
export function useTimelineInitializer({
  scenes,
  selectedImages,
  subtitleFont,
  subtitleColor,
  subtitlePosition,
  timeline,
  setTimeline,
}: UseTimelineInitializerParams) {
  // 타임라인 초기화
  useEffect(() => {
    // scenes가 배열이 아니거나 빈 배열이면 종료
    if (!Array.isArray(scenes) || scenes.length === 0) return

    // Pro track 감지: scenes에 videoUrl이 있는지 확인
    const isProTrack = scenes.some(scene => {
      const extended = scene as SceneScript & { videoUrl?: string | null }
      return extended.videoUrl != null
    })

    const nextTimeline: TimelineData = {
      fps: 30,
      resolution: '1080x1920',
      playbackSpeed: timeline?.playbackSpeed ?? 1.0,
      scenes: scenes.map((scene, index) => {
        const existingScene = timeline?.scenes[index]
        const extended = scene as SceneScript & { videoUrl?: string | null }
        
        // Pro track인 경우 videoUrl을 image로 사용 (타임라인 호환성을 위해)
        const imageUrl = isProTrack 
          ? (extended.videoUrl || scene.imageUrl || selectedImages[index] || '')
          : (scene.imageUrl || selectedImages[index] || '')
        
        return {
          sceneId: scene.sceneId,
          duration: existingScene?.duration || getSceneDuration(scene.script),
          transition: existingScene?.transition || 'none',
          transitionDuration: existingScene?.transitionDuration || 0.5,
          image: imageUrl,
          imageFit: existingScene?.imageFit || 'contain', // 기본값을 contain으로 변경하여 이미지 비율을 유지하면서 영역에 맞춤
          motion: existingScene?.motion, // Motion 설정 보존
          text: {
            content: scene.script,
            font: existingScene?.text?.font ?? subtitleFont ?? SUBTITLE_DEFAULT_FONT_ID,
            fontWeight: existingScene?.text?.fontWeight ?? 700,
            color: subtitleColor || existingScene?.text?.color || '#ffffff',
            position: subtitlePosition || existingScene?.text?.position || 'bottom',
            fontSize: existingScene?.text?.fontSize || 80,
            transform: existingScene?.text?.transform,
            style: existingScene?.text?.style,
          },
        }
      }),
    }

    const hasChanged = 
      !timeline ||
      timeline.scenes.length !== nextTimeline.scenes.length ||
      timeline.playbackSpeed !== nextTimeline.playbackSpeed ||
      nextTimeline.scenes.some((scene, index) => {
        const existing = timeline.scenes[index]
        return (
          !existing ||
          scene.sceneId !== existing.sceneId ||
          scene.image !== existing.image ||
          scene.text.content !== existing.text.content
        )
      })

    if (hasChanged) {
      setTimeline(nextTimeline)
    }
  }, [scenes, selectedImages, subtitleFont, subtitleColor, subtitlePosition, setTimeline, timeline])
}

