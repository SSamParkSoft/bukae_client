/**
 * Motion 시간 계산 유틸리티
 * Motion duration 및 세그먼트 로컬 시간 계산
 */

import type { TimelineData } from '@/store/useVideoCreateStore'

/**
 * Motion 시간 계산 파라미터
 */
export interface CalculateMotionTimingParams {
  /** 타임라인 데이터 */
  timeline: TimelineData
  /** 씬 인덱스 */
  sceneIndex: number
  /** 씬 로컬 시간 (씬 시작부터의 상대 시간) */
  sceneLocalT: number
  /** 씬 시작 시간 (타임라인 기준) */
  sceneStartTime: number
  /** TTS 캐시 ref */
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>
  /** 음성 템플릿 */
  voiceTemplate?: string | null
  /** 씬 마크업 생성 함수 */
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  /** TTS 키 생성 함수 */
  makeTtsKey?: (voiceName: string, markup: string) => string
  /** TTS 세그먼트 활성 세그먼트 조회 함수 */
  getActiveSegment?: (tSec: number) => { segment: { id: string; sceneIndex?: number; partIndex?: number; durationSec?: number; startSec?: number }; segmentIndex: number } | null
  /** 활성 세그먼트 정보 */
  activeSegmentFromTts?: { segment: { id: string; sceneIndex?: number; partIndex?: number; durationSec?: number; startSec?: number }; segmentIndex: number } | null
}

/**
 * Motion duration 계산 결과
 */
export interface MotionDurationResult {
  /** Motion duration (초) */
  motionDurationSec: number
  /** Motion 시작 시간 (씬 내 상대 시간) */
  motionStartSecInScene: number
}

/**
 * Motion 로컬 시간 계산 결과
 */
export interface MotionLocalTimeResult {
  /** Motion 로컬 시간 (세그먼트 시작부터의 상대 시간) */
  motionLocalT: number
}

/**
 * Motion 진행률 계산 결과
 */
export interface MotionProgressResult {
  /** Motion 진행률 (0.0 ~ 1.0) */
  motionProgress: number
}

/**
 * Motion duration 계산
 * 세그먼트 TTS 캐시 기반으로 Motion duration 계산
 * 
 * @param params 계산 파라미터
 * @returns Motion duration 및 시작 시간
 */
export function calculateMotionDuration({
  timeline,
  sceneIndex,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
  getActiveSegment,
  activeSegmentFromTts,
}: Omit<CalculateMotionTimingParams, 'sceneLocalT' | 'sceneStartTime'>): MotionDurationResult {
  const scene = timeline.scenes[sceneIndex]
  let motionDurationSec = 0
  let motionStartSecInScene = scene?.motion?.startSecInScene || 0
  
  if (!scene?.motion) {
    return { motionDurationSec: 0, motionStartSecInScene: 0 }
  }
  
  // 현재 세그먼트의 TTS 캐시 duration 사용
  let segmentDuration = 0
  if (getActiveSegment && activeSegmentFromTts && 'durationSec' in activeSegmentFromTts.segment) {
    // 현재 활성 세그먼트의 duration 사용
    segmentDuration = (activeSegmentFromTts.segment as { durationSec?: number }).durationSec || 0
  }
  
  // 세그먼트 duration이 없으면 씬의 TTS 캐시 duration 사용
  if (segmentDuration === 0 && ttsCacheRef && buildSceneMarkup && makeTtsKey) {
    const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
    if (sceneVoiceTemplate) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      for (const markup of markups) {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached?.durationSec && cached.durationSec > 0) {
          segmentDuration += cached.durationSec
        }
      }
    }
  }
  
  if (segmentDuration === 0) {
    segmentDuration = scene.duration || 0
  }
  
  // 슬라이드 효과는 세그먼트 시작부터 시작
  // Motion의 startSecInScene을 세그먼트 시작 시간(0)으로 설정
  if (getActiveSegment && activeSegmentFromTts) {
    // 세그먼트 시작부터 시작하도록 설정
    motionStartSecInScene = 0
    // 세그먼트의 TTS 캐시 duration 사용
    motionDurationSec = segmentDuration
  } else {
    // 세그먼트 정보가 없으면 기존 로직 사용
    const motionStartTime = scene.motion.startSecInScene || 0
    const availableDuration = Math.max(0, segmentDuration - motionStartTime)
    
    if (scene.motion.durationSec > 0) {
      motionDurationSec = Math.min(scene.motion.durationSec, availableDuration)
    } else {
      motionDurationSec = availableDuration
    }
  }
  
  return { motionDurationSec, motionStartSecInScene }
}

/**
 * Motion 로컬 시간 계산
 * 세그먼트 시작부터의 상대 시간 계산
 * 
 * @param params 계산 파라미터
 * @returns Motion 로컬 시간
 */
export function calculateMotionLocalTime({
  sceneLocalT,
  sceneStartTime,
  getActiveSegment,
  activeSegmentFromTts,
}: Pick<CalculateMotionTimingParams, 'sceneLocalT' | 'sceneStartTime' | 'getActiveSegment' | 'activeSegmentFromTts'>): MotionLocalTimeResult {
  // 슬라이드 효과는 세그먼트 시작부터 시작하므로 세그먼트 로컬 시간 사용
  let motionLocalT = sceneLocalT
  if (getActiveSegment && activeSegmentFromTts && 'startSec' in activeSegmentFromTts.segment) {
    // 세그먼트 시작 시간 계산
    const segmentStartTime = (activeSegmentFromTts.segment as { startSec?: number }).startSec
    if (segmentStartTime !== undefined) {
      // 씬 시작 시간과 세그먼트 시작 시간의 차이를 계산
      const segmentStartInScene = segmentStartTime - sceneStartTime
      // 세그먼트 로컬 시간 사용 (세그먼트 시작부터 0)
      motionLocalT = Math.max(0, sceneLocalT - segmentStartInScene)
    }
  }
  
  return { motionLocalT }
}

/**
 * Motion 진행률 계산
 * 
 * @param params 계산 파라미터
 * @returns Motion 진행률
 */
export function calculateMotionProgress({
  timeline,
  sceneIndex,
  sceneLocalT,
  sceneStartTime,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
  getActiveSegment,
  activeSegmentFromTts,
}: CalculateMotionTimingParams): MotionProgressResult {
  const scene = timeline.scenes[sceneIndex]
  let motionProgress = 0
  
  if (!scene?.motion) {
    return { motionProgress: 0 }
  }
  
  // Motion duration 계산
  const { motionDurationSec, motionStartSecInScene } = calculateMotionDuration({
    timeline,
    sceneIndex,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    getActiveSegment,
    activeSegmentFromTts,
  })
  
  // Motion 로컬 시간 계산
  const { motionLocalT } = calculateMotionLocalTime({
    sceneLocalT,
    sceneStartTime,
    getActiveSegment,
    activeSegmentFromTts,
  })
  
  // Motion 진행률 계산
  if (motionDurationSec > 0) {
    const elapsed = motionLocalT - motionStartSecInScene
    const motionActive = elapsed >= 0 && elapsed <= motionDurationSec
    if (motionActive) {
      motionProgress = Math.min(1, Math.max(0, elapsed / motionDurationSec))
    }
  }
  
  return { motionProgress }
}
