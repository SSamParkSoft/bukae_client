/**
 * 타임라인 렌더링 유틸리티
 * renderAt(t) 패턴을 위한 유틸리티 함수들
 */

import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSceneStartTime } from './timeline'
// buildSceneMarkup은 options로 전달받아 사용됨

/**
 * 타임라인 시간 t에서 씬과 구간 정보 계산
 * @param timeline 타임라인 데이터
 * @param tSec 타임라인 시간 (초)
 * @param ttsCacheRef TTS 캐시 (구간 duration 계산용)
 * @param voiceTemplate 음성 템플릿
 * @param buildSceneMarkup 마크업 생성 함수
 * @param makeTtsKey TTS 키 생성 함수
 * @returns 씬 인덱스, 구간 인덱스, 구간 내 오프셋
 */
export function calculateSceneFromTime(
  timeline: TimelineData,
  tSec: number,
  options?: {
    ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number }>>,
    voiceTemplate?: string | null,
    buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[],
    makeTtsKey?: (voiceName: string, markup: string) => string,
  }
): {
  sceneIndex: number
  partIndex: number
  offsetInPart: number
} {
  // timeline이나 scenes가 없으면 기본값 반환
  if (!timeline || !timeline.scenes || timeline.scenes.length === 0) {
    return { sceneIndex: 0, partIndex: 0, offsetInPart: 0 }
  }

  let sceneIndex = -1 // 초기값을 -1로 설정하여 씬을 찾지 못했음을 명시
  let partIndex = 0
  let offsetInPart = 0

  // 모든 씬의 시작 시간과 종료 시간을 미리 계산
  // 중요: 씬의 종료 시간은 sceneStartTime + sceneDuration + transitionDuration입니다
  // transitionDuration은 다음 씬과의 전환 시간이므로 현재 씬의 범위에 포함됩니다
  const sceneBoundaries: Array<{ start: number; end: number; index: number }> = []
  
  for (let i = 0; i < timeline.scenes.length; i++) {
    const scene = timeline.scenes[i]
    if (!scene) continue
    
    const sceneStartTime = getSceneStartTime(timeline, i)
    
    // 씬의 duration 계산 (TTS 캐시 사용 가능하면 사용)
    let sceneDuration = scene.duration
    
    if (options?.ttsCacheRef && options?.buildSceneMarkup && options?.makeTtsKey) {
      const sceneVoiceTemplate = scene.voiceTemplate || options.voiceTemplate
      if (sceneVoiceTemplate) {
        const markups = options.buildSceneMarkup(timeline, i)
        let calculatedDuration = 0
        let hasCachedDuration = false
        
        for (const markup of markups) {
          const key = options.makeTtsKey(sceneVoiceTemplate, markup)
          const cached = options.ttsCacheRef.current.get(key)
          if (cached?.durationSec && cached.durationSec > 0) {
            calculatedDuration += cached.durationSec
            hasCachedDuration = true
          }
        }
        
        if (hasCachedDuration) {
          sceneDuration = calculatedDuration
        }
      }
    }
    
    // transitionDuration 계산: 다음 씬과의 전환 시간
    // 같은 sceneId를 가진 씬들 사이에서는 transitionDuration을 0으로 계산
    const nextScene = timeline.scenes[i + 1]
    const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (scene.transitionDuration || 0.5)
    
    // 씬의 종료 시간 = 시작 시간 + duration + transitionDuration
    // transitionDuration은 현재 씬의 범위에 포함됩니다 (다음 씬으로 전환하는 시간)
    const sceneEndTime = sceneStartTime + sceneDuration + transitionDuration
    sceneBoundaries.push({ start: sceneStartTime, end: sceneEndTime, index: i })
  }

  // 정확한 씬 찾기: tSec가 포함되는 씬을 찾음
  // 중요: 마지막 씬이 아닌 경우, 씬의 종료 시간(transitionDuration 포함)은 다음 씬의 시작 시간과 같습니다
  // 따라서 tSec가 정확히 boundary.end와 같으면 다음 씬에 속합니다
  for (const boundary of sceneBoundaries) {
    const isLastScene = boundary.index === timeline.scenes.length - 1
    // 마지막 씬: [start, end] 포함
    // 일반 씬: [start, end) - end는 제외 (다음 씬의 시작 시간)
    const isInScene = isLastScene 
      ? (tSec >= boundary.start && tSec <= boundary.end)
      : (tSec >= boundary.start && tSec < boundary.end)
    
    if (isInScene) {
      sceneIndex = boundary.index
      const scene = timeline.scenes[boundary.index]
      if (!scene) break
      
      // 디버깅: 정확한 씬을 찾았을 때 (로그 최소화 - 씬 전환 시에만)
      // 과도한 로그는 성능 문제를 일으킬 수 있으므로 제거
      
      // 구간 계산 (TTS 캐시 사용)
      if (options?.ttsCacheRef && options?.buildSceneMarkup && options?.makeTtsKey) {
        const sceneVoiceTemplate = scene.voiceTemplate || options.voiceTemplate
        if (sceneVoiceTemplate) {
          const markups = options.buildSceneMarkup(timeline, boundary.index)
          let partAccumulatedTime = boundary.start
          
          for (let p = 0; p < markups.length; p++) {
            const markup = markups[p]
            const key = options.makeTtsKey(sceneVoiceTemplate, markup)
            const cached = options.ttsCacheRef.current.get(key)
            const partDuration = cached?.durationSec || 0
            
            const partEndTime = partAccumulatedTime + partDuration
            
            if (tSec >= partAccumulatedTime && tSec < partEndTime) {
              partIndex = p
              offsetInPart = tSec - partAccumulatedTime
              break
            }
            
            partAccumulatedTime = partEndTime
          }
        }
      }
      
      break
    }
  }
  
  // 씬을 찾지 못한 경우: 기본값 반환
  if (sceneIndex === -1) {
    if (timeline.scenes.length > 0) {
      // tSec가 0보다 작으면 첫 번째 씬, 그 외에는 마지막 씬
      sceneIndex = tSec < 0 ? 0 : timeline.scenes.length - 1
    } else {
      sceneIndex = 0
    }
  }
  
  return { sceneIndex, partIndex, offsetInPart }
}
