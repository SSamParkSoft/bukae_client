/**
 * 전환효과 시간 계산 유틸리티
 * Transport의 시간 t를 기준으로 전환효과 상태를 결정적으로 계산합니다.
 */

import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSceneStartTime } from '@/utils/timeline'
import type { TransitionEffect } from '../types/effects'

/**
 * 전환효과 타이밍 정보
 */
export interface TransitionTiming {
  sceneIndex: number
  startTime: number // 타임라인 기준 시작 시간 (초)
  duration: number // 전환효과 지속 시간 (초)
  transitionType: TransitionEffect
  endTime: number // 타임라인 기준 종료 시간 (초)
}

/**
 * 전환효과 상태
 */
export interface TransitionState {
  progress: number // 0.0 ~ 1.0
  isActive: boolean // 전환효과가 진행 중인지 여부
}

/**
 * 타임라인 시간 t에서 전환효과 진행도 계산
 * @param t 타임라인 시간 (초)
 * @param transitionTiming 전환효과 타이밍 정보
 * @returns 전환효과 상태 (진행도, 활성 여부)
 */
export function calculateTransitionState(
  t: number,
  transitionTiming: TransitionTiming
): TransitionState {
  const { startTime, endTime } = transitionTiming

  if (t < startTime) {
    // 전환효과 시작 전
    return { progress: 0, isActive: false }
  }

  if (t >= endTime) {
    // 전환효과 종료 후
    return { progress: 1, isActive: false }
  }

  // 전환효과 진행 중
  const progress = (t - startTime) / transitionTiming.duration
  return { progress: Math.max(0, Math.min(1, progress)), isActive: true }
}

/**
 * 타임라인에서 모든 씬의 전환효과 정보 추출
 * @param timeline 타임라인 데이터
 * @returns 전환효과 타이밍 정보 배열
 */
export function buildTransitionTimeline(
  timeline: TimelineData
): TransitionTiming[] {
  const transitions: TransitionTiming[] = []

  if (!timeline || !timeline.scenes) {
    return transitions
  }

  for (let i = 0; i < timeline.scenes.length; i++) {
    const scene = timeline.scenes[i]
    if (!scene) continue

    const transitionType = (scene.transition || 'none').toLowerCase() as TransitionEffect

    // 'none' 전환효과는 제외
    if (transitionType === 'none') {
      continue
    }

    // 씬 시작 시간 계산
    const sceneStartTime = getSceneStartTime(timeline, i)

    // 같은 sceneId를 가진 씬들 사이에서는 transitionDuration을 0으로 설정
    const nextScene = timeline.scenes[i + 1]
    const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (scene.transitionDuration || 0.5)

    // transitionDuration이 0이면 전환효과 없음
    if (transitionDuration <= 0) {
      continue
    }

    const startTime = sceneStartTime
    const endTime = startTime + transitionDuration

    transitions.push({
      sceneIndex: i,
      startTime,
      duration: transitionDuration,
      transitionType,
      endTime,
    })
  }

  return transitions
}

/**
 * 특정 씬의 전환효과 타이밍 정보 반환
 * @param timeline 타임라인 데이터
 * @param sceneIndex 씬 인덱스
 * @returns 전환효과 타이밍 정보 (없으면 null)
 */
export function getTransitionTimingForScene(
  timeline: TimelineData,
  sceneIndex: number
): TransitionTiming | null {
  if (!timeline || !timeline.scenes || sceneIndex < 0 || sceneIndex >= timeline.scenes.length) {
    return null
  }

  const scene = timeline.scenes[sceneIndex]
  if (!scene) {
    return null
  }

  const transitionType = (scene.transition || 'none').toLowerCase() as TransitionEffect

  // 씬 시작 시간 계산
  const sceneStartTime = getSceneStartTime(timeline, sceneIndex)

  // 'none' 전환효과일 때도 씬의 전체 duration을 사용하는 TransitionTiming 반환
  if (transitionType === 'none') {
    // 씬의 전체 duration 사용
    const sceneDuration = scene.duration || 0
    if (sceneDuration <= 0) {
      return null
    }

    return {
      sceneIndex,
      startTime: sceneStartTime,
      duration: sceneDuration,
      transitionType: 'none' as TransitionEffect,
      endTime: sceneStartTime + sceneDuration,
    }
  }

  // 같은 sceneId를 가진 씬들 사이에서는 transitionDuration을 0으로 설정
  const nextScene = timeline.scenes[sceneIndex + 1]
  const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
  const transitionDuration = isSameSceneId ? 0 : (scene.transitionDuration || 0.5)

  // transitionDuration이 0이면 전환효과 없음
  if (transitionDuration <= 0) {
    return null
  }

  const startTime = sceneStartTime
  const endTime = startTime + transitionDuration

  return {
    sceneIndex,
    startTime,
    duration: transitionDuration,
    transitionType,
    endTime,
  }
}
