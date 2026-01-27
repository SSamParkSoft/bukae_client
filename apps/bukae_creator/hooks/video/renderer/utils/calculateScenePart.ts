/**
 * 씬/파트 계산 유틸리티
 * 시간 `t`에서 씬 인덱스와 파트 인덱스 계산
 */

import { calculateSceneFromTime } from '@/utils/timeline-render'
import { getSceneStartTime } from '@/utils/timeline'
import type { TimelineData } from '@/store/useVideoCreateStore'

/**
 * 씬/파트 계산 결과
 */
export interface ScenePartResult {
  /** 씬 인덱스 */
  sceneIndex: number
  /** 파트 인덱스 */
  partIndex: number
}

/**
 * 씬/파트 계산 파라미터
 */
export interface CalculateScenePartParams {
  /** 타임라인 데이터 */
  timeline: TimelineData
  /** 시간 (초) */
  tSec: number
  /** 강제 씬 인덱스 (지정하면 tSec 계산 대신 이 씬을 직접 사용) */
  forceSceneIndex?: number
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
 * 시간 `t`에서 씬 인덱스와 파트 인덱스 계산
 * 
 * @param params 계산 파라미터
 * @returns 씬 인덱스와 파트 인덱스
 */
export function calculateScenePartFromTime({
  timeline,
  tSec,
  forceSceneIndex,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
}: CalculateScenePartParams): ScenePartResult {
  let sceneIndex: number
  let partIndex: number = 0 // 초기값 설정

  if (forceSceneIndex !== undefined) {
    // 강제 씬 인덱스가 지정되면 직접 사용 (씬/그룹 재생 시 해당 씬에 고정)
    sceneIndex = forceSceneIndex
    
    // partIndex와 offsetInPart는 해당 씬 범위 내에서만 직접 계산 (calculateSceneFromTime 사용 안 함)
    const sceneStartTime = getSceneStartTime(timeline, sceneIndex)
    const scene = timeline.scenes[sceneIndex]
    
    if (!scene) {
      // 씬이 없으면 기본값 반환
      partIndex = 0
    } else {
      // 시간을 해당 씬의 시작 시간 기준으로 상대 시간 계산
      const relativeTime = Math.max(0, tSec - sceneStartTime)
      
      // 해당 씬의 partIndex 직접 계산
      // 초기값 설정 (항상 할당되도록 보장)
      partIndex = 0
      
      if (ttsCacheRef && buildSceneMarkup && makeTtsKey) {
        const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
        if (sceneVoiceTemplate) {
          const markups = buildSceneMarkup(timeline, sceneIndex)
          if (markups.length > 0) {
            let partAccumulatedTime = 0
            
            // 각 part를 순회하며 해당하는 part 찾기
            for (let p = 0; p < markups.length; p++) {
              const markup = markups[p]
              if (!markup) continue
              
              const key = makeTtsKey(sceneVoiceTemplate, markup)
              const cached = ttsCacheRef.current.get(key)
              const partDuration = cached?.durationSec || 0
              const partEndTime = partAccumulatedTime + partDuration
              
              // relativeTime이 이 part 범위에 있으면
              if (relativeTime >= partAccumulatedTime && relativeTime < partEndTime) {
                partIndex = p
                break
              }
              
              // 마지막 part이고 relativeTime이 partEndTime 이상이면 마지막 part 사용
              if (p === markups.length - 1 && relativeTime >= partEndTime) {
                partIndex = p
                break
              }
              
              partAccumulatedTime = partEndTime
            }
          }
        }
      }
    }
  } else {
    // 일반적인 경우: tSec 기반으로 씬 계산
    const calculated = calculateSceneFromTime(
      timeline,
      tSec,
      {
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
      }
    )
    sceneIndex = calculated.sceneIndex
    partIndex = calculated.partIndex
  }

  return {
    sceneIndex,
    partIndex,
  }
}
