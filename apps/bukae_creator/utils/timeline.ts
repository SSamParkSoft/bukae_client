/**
 * 시간(초)을 MM:SS 형식으로 포맷합니다.
 * @param seconds 초 단위 시간
 * @returns MM:SS 형식 문자열
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 대본 길이 기반 자동 duration을 계산합니다 (대략 초당 8글자, 최소 1초).
 * 실제 TTS duration이 계산되면 재생 버튼 클릭 시 Timeline이 업데이트됩니다.
 * @param script 대본 텍스트
 * @returns 계산된 duration (초)
 */
export const getSceneDuration = (script: string): number => {
  if (!script) return 2.5
  const length = script.replace(/\s+/g, '').length
  const raw = length / 8
  return Math.max(1, raw) // 최대 제한 제거, 최소 1초만 유지
}

/**
 * 특정 씬의 시작 시간을 계산합니다.
 * @param timeline Timeline 객체
 * @param sceneIndex 씬 인덱스
 * @returns 씬의 시작 시간 (초)
 */
export const getSceneStartTime = (timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number }> }, sceneIndex: number): number => {
  if (!timeline) return 0
  let time = 0
  for (let i = 0; i < sceneIndex; i++) {
    const currentScene = timeline.scenes[i]
    const nextScene = timeline.scenes[i + 1]
    // 같은 sceneId를 가진 씬들 사이에서는 transitionDuration을 0으로 계산
    const isSameSceneId = nextScene && currentScene.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (currentScene.transitionDuration || 0.5)
    time += currentScene.duration + transitionDuration
  }
  return time
}

/**
 * 타임라인의 전체 duration을 계산합니다.
 * Transition duration은 제외하고 TTS duration만 합산합니다.
 * (Transition은 TTS 재생과 동시에 일어나므로 별도 시간이 추가되지 않음)
 * @param timeline Timeline 객체
 * @param options TTS 캐시를 사용하여 더 정확한 duration 계산 (선택사항)
 * @returns 전체 duration (초) - TTS duration 합계만
 */
export const calculateTotalDuration = (
  timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number; voiceTemplate?: string | null; text?: { content?: string } }> },
  options?: {
    ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number }>>,
    voiceTemplate?: string | null,
    buildSceneMarkup?: (timeline: any, sceneIndex: number) => string[],
    makeTtsKey?: (voiceName: string, markup: string) => string,
  }
): number => {
  // TTS 캐시를 사용하여 더 정확한 duration 계산
  if (options?.ttsCacheRef && options?.buildSceneMarkup && options?.makeTtsKey) {
    let totalDuration = 0
    for (let i = 0; i < timeline.scenes.length; i++) {
      const scene = timeline.scenes[i]
      const sceneVoiceTemplate = scene.voiceTemplate || options.voiceTemplate
      
      if (sceneVoiceTemplate) {
        const markups = options.buildSceneMarkup(timeline, i)
        let sceneDuration = 0
        let hasCachedDuration = false
        
        // 각 구간의 실제 TTS duration 합산
        for (const markup of markups) {
          const key = options.makeTtsKey(sceneVoiceTemplate, markup)
          const cached = options.ttsCacheRef.current.get(key)
          if (cached?.durationSec && cached.durationSec > 0) {
            sceneDuration += cached.durationSec
            hasCachedDuration = true
          }
        }
        
        // 캐시된 duration이 있으면 사용, 없으면 scene.duration 사용
        // 씬 분할 시 각 분할된 씬의 duration은 이미 getSceneDuration으로 계산되어 있으므로 그대로 사용
        if (hasCachedDuration) {
          totalDuration += sceneDuration
        } else {
          // TTS 캐시가 없을 때는 scene.duration 사용
          // 씬 분할 시 각 분할된 씬의 duration은 splitSceneBySentences에서
          // 각 문장에 대해 getSceneDuration(sentence)로 계산되므로
          // 분할된 씬들의 duration 합이 자동으로 반영됨
          totalDuration += scene.duration
        }
      } else {
        // voiceTemplate이 없으면 scene.duration 사용
        totalDuration += scene.duration
      }
    }
    return totalDuration
  }
  
  // 기본 계산: timeline의 duration 속성 합산
  // 씬 분할 시 각 분할된 씬의 duration은 이미 계산되어 있으므로
  // 모든 씬의 duration을 합산하면 분할된 씬들의 duration 합이 자동으로 반영됨
  return timeline.scenes.reduce((sum, scene) => {
    // TTS duration만 합산 (transition duration 제외)
    return sum + scene.duration 
  }, 0)
}

/**
 * 특정 시간에 해당하는 씬 인덱스를 계산합니다.
 * @param timeline Timeline 객체
 * @param targetTime 목표 시간 (초)
 * @returns 씬 인덱스
 */
export const calculateSceneIndexFromTime = (timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number }> }, targetTime: number): number => {
  let accumulated = 0
  let sceneIndex = 0
  for (let i = 0; i < timeline.scenes.length; i++) {
    const scene = timeline.scenes[i]
    const isLastScene = i === timeline.scenes.length - 1
    if (isLastScene) {
      accumulated += scene.duration
    } else {
      // 같은 sceneId를 가진 씬들 사이에서는 transitionDuration을 0으로 계산
      const nextScene = timeline.scenes[i + 1]
      const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
      const transitionDuration = isSameSceneId ? 0 : (scene.transitionDuration || 0.5)
      accumulated += scene.duration + transitionDuration
    }
    if (targetTime <= accumulated) {
      sceneIndex = i
      break
    }
  }
  return sceneIndex
}

