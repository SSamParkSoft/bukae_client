/**
 * Transition 시간 계산 유틸리티
 * Transition 시작 시간 및 진행률 계산
 */

import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSceneStartTime } from '@/utils/timeline'

/**
 * Transition 시간 계산 파라미터
 */
export interface CalculateTransitionTimingParams {
  /** 타임라인 데이터 */
  timeline: TimelineData
  /** 시간 (초) */
  tSec: number
  /** 씬 인덱스 */
  sceneIndex: number
  /** TTS 캐시 ref */
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>
  /** 음성 템플릿 */
  voiceTemplate?: string | null
  /** 씬 마크업 생성 함수 */
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  /** TTS 키 생성 함수 */
  makeTtsKey?: (voiceName: string, markup: string) => string
}

/**
 * Transition 시작 시간 계산
 * 
 * @param params 계산 파라미터
 * @returns Transition 시작 시간 (초)
 */
export function calculateTransitionStartTime({
  timeline,
  sceneIndex,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: Omit<CalculateTransitionTimingParams, 'tSec'>): number {
  const currentScene = timeline.scenes[sceneIndex]
  if (!currentScene) {
    return 0
  }

  const nextScene = timeline.scenes[sceneIndex + 1]
  const isSameSceneId = nextScene && currentScene.sceneId === nextScene.sceneId
  const transitionDuration = isSameSceneId ? 0 : (currentScene.transitionDuration || 0.5)

  if (transitionDuration <= 0) {
    return 0
  }

  // Transition 시작 시간 = 씬 시작 시간 (씬 시작 시점에 Transition 시작)
  // Transition은 씬 시작 시점에 시작되므로, 이전 씬들의 TTS 캐시 duration만 합산
  // Transition duration은 포함하지 않음 (Transition은 씬 시작과 동시에 시작되므로)
  const SCENE_GAP = 0.001 // 1ms 간격 (부동소수점 오차 방지)
  
  let sceneStartTime = 0
  for (let i = 0; i < sceneIndex; i++) {
    const prevScene = timeline.scenes[i]
    if (!prevScene) continue
    
    // 이전 씬의 TTS 캐시 duration 계산
    let sceneDuration = 0
    if (ttsCacheRef && buildSceneMarkup && makeTtsKey) {
      const sceneVoiceTemplate = prevScene.voiceTemplate || voiceTemplate
      if (sceneVoiceTemplate) {
        const markups = buildSceneMarkup(timeline, i)
        for (const markup of markups) {
          const key = makeTtsKey(sceneVoiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          if (cached?.durationSec && cached.durationSec > 0) {
            sceneDuration += cached.durationSec
          }
        }
      }
    }
    
    if (sceneDuration === 0) {
      sceneDuration = prevScene.duration || 0
    }
    
    // 씬 사이 간격 확인 (같은 sceneId를 가진 씬들 사이에는 간격 없음)
    const prevNextScene = timeline.scenes[i + 1]
    const prevIsSameSceneId = prevNextScene && prevScene.sceneId === prevNextScene.sceneId
    const sceneGap = prevIsSameSceneId ? 0 : SCENE_GAP
    
    // 씬 시작 시간 = 이전 씬들의 TTS 캐시 duration만 합산
    // Transition duration은 포함하지 않음 (Transition은 씬 시작 시점에 시작되므로)
    sceneStartTime += sceneDuration + sceneGap
  }

  // Transition 시작 시간 = 씬 시작 시간 (씬 시작 시점에 Transition 시작)
  return sceneStartTime
}

/**
 * 현재 씬의 TTS 캐시 duration 계산
 * 
 * @param params 계산 파라미터
 * @returns 씬의 TTS 캐시 duration (초)
 */
function calculateSceneTtsDuration({
  timeline,
  sceneIndex,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: Omit<CalculateTransitionTimingParams, 'tSec'>): number {
  const currentScene = timeline.scenes[sceneIndex]
  if (!currentScene) {
    return 0
  }

  let sceneDuration = 0
  if (ttsCacheRef && buildSceneMarkup && makeTtsKey) {
    const sceneVoiceTemplate = currentScene.voiceTemplate || voiceTemplate
    if (sceneVoiceTemplate) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      for (const markup of markups) {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached?.durationSec && cached.durationSec > 0) {
          sceneDuration += cached.durationSec
        }
      }
    }
  }

  if (sceneDuration === 0) {
    sceneDuration = currentScene.duration || 0
  }

  return sceneDuration
}

/**
 * Transition 진행률 계산
 * 
 * @param params 계산 파라미터
 * @returns Transition 진행률 (0.0 ~ 1.0)
 */
export function calculateTransitionProgress({
  timeline,
  tSec,
  sceneIndex,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: CalculateTransitionTimingParams): number {
  const currentScene = timeline.scenes[sceneIndex]
  if (!currentScene) {
    return 0
  }

  const nextScene = timeline.scenes[sceneIndex + 1]
  const isSameSceneId = nextScene && currentScene.sceneId === nextScene.sceneId
  
  // Transition duration을 1초로 고정 (움직임효과만 TTS 캐시 duration 사용)
  let transitionDuration = 0
  if (!isSameSceneId) {
    transitionDuration = 1.0 // 1초로 고정
  }

  if (transitionDuration <= 0) {
    return 0
  }

  const transitionStartTime = calculateTransitionStartTime({
    timeline,
    sceneIndex,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
  })

  const relativeTime = Math.max(0, tSec - transitionStartTime)
  return Math.min(1, relativeTime / transitionDuration)
}

/**
 * Transition 진행 중 여부 확인
 * 
 * @param params 계산 파라미터
 * @returns Transition 진행 중 여부
 */
export function isTransitionInProgress({
  timeline,
  tSec,
  sceneIndex,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: CalculateTransitionTimingParams): boolean {
  const currentScene = timeline.scenes[sceneIndex]
  if (!currentScene) {
    return false
  }

  const nextScene = timeline.scenes[sceneIndex + 1]
  const isSameSceneId = nextScene && currentScene.sceneId === nextScene.sceneId
  
  // Transition duration을 1초로 고정 (움직임효과만 TTS 캐시 duration 사용)
  let transitionDuration = 0
  if (!isSameSceneId) {
    transitionDuration = 1.0 // 1초로 고정
  }

  if (transitionDuration <= 0) {
    return false
  }

  const transitionStartTime = calculateTransitionStartTime({
    timeline,
    sceneIndex,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
  })

  const relativeTime = tSec - transitionStartTime
  
  // Transition이 진행 중이거나 방금 끝난 경우도 포함 (최종 상태 렌더링을 위해)
  return (relativeTime >= 0 && relativeTime <= transitionDuration) || 
    (relativeTime > transitionDuration && relativeTime <= transitionDuration + 0.1)
}
