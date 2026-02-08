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
  // 렌더 경계와 동일하게 TTS 합만 사용 (gap 없음). 씬 전환 첫 프레임부터 전환 블록 실행되도록
  let sceneStartTime = 0
  for (let i = 0; i < sceneIndex; i++) {
    const prevScene = timeline.scenes[i]
    if (!prevScene) continue

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
    sceneStartTime += sceneDuration
  }

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
  
  // Transition duration을 씬 설정값으로 사용 (타임라인·씬 경계와 일치)
  let transitionDuration = 0
  if (!isSameSceneId) {
    transitionDuration = currentScene.transitionDuration ?? 0.5
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
  
  // Transition duration을 씬 설정값으로 사용 (타임라인·씬 경계와 일치)
  let transitionDuration = 0
  if (!isSameSceneId) {
    transitionDuration = currentScene.transitionDuration ?? 0.5
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

  // 타이밍: 씬 전환 첫 프레임을 놓치지 않도록 시작 쪽 백버퍼 (step6과 동일)
  const TRANSITION_START_BUFFER = 0.02
  return (
    (relativeTime >= -TRANSITION_START_BUFFER && relativeTime <= transitionDuration) ||
    (relativeTime > transitionDuration && relativeTime <= transitionDuration + 0.1)
  )
}
