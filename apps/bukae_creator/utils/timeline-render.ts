/**
 * 타임라인 렌더링 유틸리티
 * renderAt(t) 패턴을 위한 유틸리티 함수들
 */

import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSceneStartTime } from './timeline'
// buildSceneMarkup은 options로 전달받아 사용됨

/** timeline.ts와 동일 (경계 불일치 방지) */
const SCENE_GAP = 0.001

export type CalculateSceneFromTimeOptions = {
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number }>>
  voiceTemplate?: string | null
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey?: (voiceName: string, markup: string) => string
}

/**
 * TTS 캐시 기준으로 씬 sceneIndex의 시작 시간 계산.
 * 세그먼트(오디오) 타임라인과 일치시키기 위해 **TTS duration만** 합산 (transition/gap 미포함).
 * 이렇게 해야 tSec(transport)과 경계가 맞아서 뒤쪽 씬이 자기 구간만큼 움직임을 쓸 수 있음.
 */
export function getSceneStartTimeFromTts(
  timeline: TimelineData,
  sceneIndex: number,
  options: CalculateSceneFromTimeOptions
): number {
  if (!timeline?.scenes?.length || sceneIndex <= 0) return 0
  if (sceneIndex >= timeline.scenes.length) return 0

  const { ttsCacheRef, buildSceneMarkup, makeTtsKey } = options
  if (!ttsCacheRef || !buildSceneMarkup || !makeTtsKey) return getSceneStartTime(timeline, sceneIndex)

  let time = 0
  for (let i = 0; i < sceneIndex; i++) {
    const currentScene = timeline.scenes[i]
    if (!currentScene) continue

    let sceneDuration = 0
    const sceneVoiceTemplate = currentScene.voiceTemplate ?? options.voiceTemplate
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
    if (sceneDuration === 0) {
      sceneDuration = currentScene.duration ?? 0
    }
    time += sceneDuration
  }
  return time
}

/**
 * 타임라인 시간 t에서 씬과 구간 정보 계산
 * @param timeline 타임라인 데이터
 * @param tSec 타임라인 시간 (초)
 * @param ttsCacheRef TTS 캐시 (구간 duration 계산용)
 * @param voiceTemplate 음성 템플릿
 * @param buildSceneMarkup 마크업 생성 함수
 * @param makeTtsKey TTS 키 생성 함수
 * @returns 씬 인덱스, 구간 인덱스, 구간 내 오프셋, 해당 씬의 시작 시간(sceneStartTime)
 */
export function calculateSceneFromTime(
  timeline: TimelineData,
  tSec: number,
  options?: CalculateSceneFromTimeOptions
): {
  sceneIndex: number
  partIndex: number
  offsetInPart: number
  sceneStartTime: number
} {
  // timeline이나 scenes가 없으면 기본값 반환
  if (!timeline || !timeline.scenes || timeline.scenes.length === 0) {
    return { sceneIndex: 0, partIndex: 0, offsetInPart: 0, sceneStartTime: 0 }
  }

  let sceneIndex = -1 // 초기값을 -1로 설정하여 씬을 찾지 못했음을 명시
  let partIndex = 0
  let offsetInPart = 0
  let resolvedSceneStartTime = 0

  const useTtsBoundaries = Boolean(
    options?.ttsCacheRef && options?.buildSceneMarkup && options?.makeTtsKey
  )

  // 모든 씬의 시작 시간과 종료 시간을 미리 계산
  // options가 있으면 boundary.start를 TTS 합산으로 계산 (motion/전환과 동일 소스)
  const sceneBoundaries: Array<{ start: number; end: number; index: number }> = []
  let accumulatedStart = 0

  for (let i = 0; i < timeline.scenes.length; i++) {
    const scene = timeline.scenes[i]
    if (!scene) continue

    const sceneStartTime = useTtsBoundaries
      ? accumulatedStart
      : getSceneStartTime(timeline, i)

    // 씬의 duration 계산: TTS 캐시에서만 계산 (TTS duration이 없으면 렌더링 불가)
    let sceneDuration = 0

    if (options?.ttsCacheRef && options?.buildSceneMarkup && options?.makeTtsKey) {
      const sceneVoiceTemplate = scene.voiceTemplate || options.voiceTemplate
      if (sceneVoiceTemplate) {
        const markups = options.buildSceneMarkup(timeline, i)

        for (const markup of markups) {
          const key = options.makeTtsKey(sceneVoiceTemplate, markup)
          const cached = options.ttsCacheRef.current.get(key)
          if (cached?.durationSec && cached.durationSec > 0) {
            sceneDuration += cached.durationSec
          }
        }
      }
    }

    // TTS duration이 없으면 0으로 설정 (렌더링 불가)
    if (sceneDuration === 0) {
      sceneDuration = scene.duration // fallback (하지만 정확하지 않음)
    }

    // TTS 경계: 세그먼트와 동일하게 [start, start+duration]만 사용 (transition/gap 없음)
    // duration 경계: 기존대로 transition 포함
    const nextScene = timeline.scenes[i + 1]
    const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (scene.transitionDuration || 0.5)
    const isLastScene = i === timeline.scenes.length - 1
    const sceneGap = (isSameSceneId || isLastScene) ? 0 : SCENE_GAP

    const sceneEndTime = useTtsBoundaries
      ? sceneStartTime + sceneDuration
      : sceneStartTime + sceneDuration + transitionDuration - sceneGap
    sceneBoundaries.push({ start: sceneStartTime, end: sceneEndTime, index: i })

    if (useTtsBoundaries) {
      accumulatedStart += sceneDuration
    }
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
      resolvedSceneStartTime = boundary.start
      const scene = timeline.scenes[boundary.index]
      if (!scene) break
      
      // 디버깅: 정확한 씬을 찾았을 때 (로그 최소화 - 씬 전환 시에만)
      // 과도한 로그는 성능 문제를 일으킬 수 있으므로 제거
      
      // 구간 계산 (TTS 캐시 사용)
      if (options?.ttsCacheRef && options?.buildSceneMarkup && options?.makeTtsKey) {
        // 씬별 voiceTemplate만 사용 (전역 voiceTemplate fallback 제거)
        const sceneVoiceTemplate = scene.voiceTemplate
        if (sceneVoiceTemplate) {
          const markups = options.buildSceneMarkup(timeline, boundary.index)
          let partAccumulatedTime = boundary.start
          
          // 디버깅: markups가 여러 개인지 확인 (첫 번째 part에서만)
          if (markups.length > 1 && tSec >= boundary.start && tSec < boundary.start + 0.1) {
            console.log('[calculateSceneFromTime] 여러 part 감지', {
              sceneIndex: boundary.index,
              partCount: markups.length,
              tSec: tSec.toFixed(3),
            })
          }
          
          for (let p = 0; p < markups.length; p++) {
            const markup = markups[p]
            const key = options.makeTtsKey(sceneVoiceTemplate, markup)
            const cached = options.ttsCacheRef.current.get(key)
            const partDuration = cached?.durationSec || 0
            
            const partEndTime = partAccumulatedTime + partDuration
            
            // 음성 파일 전환 지점 감지: tSec가 partEndTime에 정확히 도달하거나 넘어서면 다음 part로 전환
            if (tSec >= partAccumulatedTime && tSec < partEndTime) {
              partIndex = p
              offsetInPart = tSec - partAccumulatedTime
              break
            }
            
            // tSec가 partEndTime과 같거나 크면 다음 part로 전환 (음성 파일 전환 지점)
            // 마지막 part가 아니면 계속 진행하여 다음 part 확인
            if (tSec >= partEndTime) {
              if (p < markups.length - 1) {
                // 다음 part가 있으면 partAccumulatedTime 업데이트하고 continue
                // 다음 반복에서 다음 part를 확인
                partAccumulatedTime = partEndTime
                continue
              } else {
                // 마지막 part인 경우 현재 part에 머물러야 함
                partIndex = p
                offsetInPart = partDuration // 마지막 part의 끝
                break
              }
            }
            
            partAccumulatedTime = partEndTime
          }
          
          // 디버깅: 재생 중 part 전환 확인 (여러 part가 있을 때)
          if (process.env.NODE_ENV === 'development' && markups.length > 1 && options.makeTtsKey && options.ttsCacheRef) {
            // 첫 번째 part의 duration 확인
            const firstPartKey = options.makeTtsKey(sceneVoiceTemplate, markups[0])
            const firstPartDuration = options.ttsCacheRef.current.get(firstPartKey)?.durationSec || 0
            const firstPartEndTime = boundary.start + firstPartDuration
            
            // 첫 번째 part가 끝나고 두 번째 part가 시작되는 순간 감지
            if (tSec >= firstPartEndTime - 0.01 && tSec < firstPartEndTime + 0.1) {
              console.log('[calculateSceneFromTime] 🔄 part 전환 지점 감지', {
                tSec: tSec.toFixed(3),
                sceneIndex: boundary.index,
                firstPartEndTime: firstPartEndTime.toFixed(3),
                계산된partIndex: partIndex,
                partCount: markups.length,
                partDurations: markups.map((m) => {
                  const k = options.makeTtsKey!(sceneVoiceTemplate, m)
                  return options.ttsCacheRef!.current.get(k)?.durationSec || 0
                }),
              })
            }
          }
        }
      }
      
      break
    }
  }
  
  return { sceneIndex, partIndex, offsetInPart, sceneStartTime: resolvedSceneStartTime }
}
