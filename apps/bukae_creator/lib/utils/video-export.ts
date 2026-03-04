import type { TimelineScene, SceneScript } from '@/store/useVideoCreateStore'
import { SUBTITLE_DEFAULT_FONT_ID as _SUBTITLE_DEFAULT_FONT_ID, getFontFileName as _getFontFileName } from '@/lib/subtitle-fonts'

/**
 * 씬 그룹화를 위한 타입
 */
export interface SceneGroupItem {
  scene: TimelineScene
  index: number
  ttsResult?: { durationSec: number } | null
  ttsUrl?: string | null
}

/**
 * 같은 sceneId를 가진 씬들을 그룹화합니다.
 * 
 * @param timelineScenes Timeline 씬 배열
 * @param scenes SceneScript 배열 (splitIndex 확인용)
 * @param ttsResults TTS 결과 배열
 * @param ttsUrls TTS URL 배열
 * @returns 그룹화된 씬 배열
 */
export const groupScenesForExport = (
  timelineScenes: TimelineScene[],
  scenes: SceneScript[],
  ttsResults: Array<{ durationSec: number } | null>,
  ttsUrls: (string | null)[]
): Map<number | string, SceneGroupItem[]> => {
  const sceneGroups = new Map<number | string, SceneGroupItem[]>()
  let tempIdCounter = -1
  
  timelineScenes.forEach((scene, index) => {
    // sceneId가 있으면 사용, 없으면 임시 고유 ID 할당
    const sceneId = scene.sceneId !== undefined ? scene.sceneId : `temp_${tempIdCounter--}`
    
    if (!sceneGroups.has(sceneId)) {
      sceneGroups.set(sceneId, [])
    }
    sceneGroups.get(sceneId)!.push({
      scene,
      index,
      ttsResult: ttsResults[index],
      ttsUrl: ttsUrls[index],
    })
  })

  // 각 그룹 내에서 splitIndex 순서로 정렬
  // splitIndex가 없으면 원본 배열 순서(index)로 정렬
  sceneGroups.forEach(group => {
    group.sort((a, b) => {
      const aSplitIndex = scenes[a.index]?.splitIndex
      const bSplitIndex = scenes[b.index]?.splitIndex
      
      // splitIndex가 둘 다 있으면 splitIndex로 정렬
      if (aSplitIndex !== undefined && bSplitIndex !== undefined) {
        return aSplitIndex - bSplitIndex
      }
      // splitIndex가 하나만 있으면 있는 것이 앞으로
      if (aSplitIndex !== undefined) return -1
      if (bSplitIndex !== undefined) return 1
      // 둘 다 없으면 원본 순서 유지
      return a.index - b.index
    })
  })

  return sceneGroups
}

/**
 * 전환 효과 타입을 API 형식으로 변환합니다.
 * 
 * @param transitionType 전환 효과 타입
 * @param transitionDuration 전환 지속 시간
 * @returns API 형식의 transition 객체
 */
export const createTransitionMap = (
  transitionType: string,
  transitionDuration: number = 0.5
): Record<string, any> => {
  const normalizedType = (transitionType || 'none').trim().toLowerCase()

  // slide-left, slide-right, slide-up, slide-down 처리
  if (normalizedType.startsWith('slide-')) {
    const direction = normalizedType.replace('slide-', '')
    return {
      type: 'slide',
      duration: transitionDuration,
      direction: direction, // 'left', 'right', 'up', 'down'
      easing: 'easeInOut',
    }
  }
  
  // zoom-in, zoom-out 처리
  if (normalizedType.startsWith('zoom-')) {
    const zoomType = normalizedType.replace('zoom-', '')
    return {
      type: 'zoom',
      duration: transitionDuration,
      scale: zoomType === 'in' ? 1.2 : 0.8,
      easing: 'easeInOut',
    }
  }
  
  // 기본 전환 효과
  const transitionMap: Record<string, any> = {
    fade: { type: 'fade', duration: transitionDuration, direction: 'left', easing: 'easeInOut' },
    slide: { type: 'slide', duration: transitionDuration, direction: 'left', easing: 'easeInOut' },
    zoom: { type: 'zoom', duration: transitionDuration, scale: 1.2, easing: 'easeInOut' },
    rotate: { type: 'rotate', duration: transitionDuration, easing: 'easeInOut' },
    blur: { type: 'blur', duration: transitionDuration, easing: 'easeInOut' },
    glitch: { type: 'glitch', duration: transitionDuration, easing: 'easeInOut' },
    ripple: { type: 'ripple', duration: transitionDuration, easing: 'easeInOut' },
    circle: { type: 'circle', duration: transitionDuration, easing: 'easeInOut' },
    none: { type: 'none', duration: 0 },
  }
  
  return transitionMap[normalizedType] || transitionMap.none
}

/**
 * 전환/움직임 중 실제로 내보낼 효과 타입과 지속 시간을 계산합니다.
 * 정책상 한 씬에는 둘 중 하나만 활성화되지만, 안전하게 transition -> motion 순으로 fallback 합니다.
 */
export const resolveSceneEffect = (
  scene: Pick<TimelineScene, 'transition' | 'transitionDuration' | 'motion'> | null | undefined
): { effectType: string; effectDuration: number } => {
  const rawTransitionType =
    typeof scene?.transition === 'string' ? scene.transition.trim().toLowerCase() : ''
  const transitionType = rawTransitionType.length > 0 ? rawTransitionType : 'none'
  const transitionDuration =
    typeof scene?.transitionDuration === 'number' && scene.transitionDuration > 0
      ? scene.transitionDuration
      : 0.5

  if (transitionType !== 'none') {
    return {
      effectType: transitionType,
      effectDuration: transitionDuration,
    }
  }

  const motion = scene?.motion
  const motionType = motion?.type
  if (!motionType) {
    return {
      effectType: 'none',
      effectDuration: 0,
    }
  }

  const motionDuration =
    typeof motion.durationSec === 'number' && motion.durationSec > 0
      ? motion.durationSec
      : 0.5

  return {
    effectType: motionType,
    effectDuration: motionDuration,
  }
}
