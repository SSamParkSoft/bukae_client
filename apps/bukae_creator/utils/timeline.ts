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
 * @param timeline Timeline 객체
 * @returns 전체 duration (초)
 */
export const calculateTotalDuration = (timeline: { scenes: Array<{ sceneId: number; duration: number; transitionDuration?: number }> }): number => {
  return timeline.scenes.reduce((sum, scene, index) => {
    // 마지막 씬에는 transition이 없으므로 제외
    const isLastScene = index === timeline.scenes.length - 1
    if (isLastScene) {
      return sum + scene.duration
    }
    // 같은 sceneId를 가진 씬들 사이에서는 transitionDuration을 0으로 계산
    const nextScene = timeline.scenes[index + 1]
    const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (scene.transitionDuration || 0.5)
    return sum + scene.duration + transitionDuration
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

