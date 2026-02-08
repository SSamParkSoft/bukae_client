/**
 * Step 8: 중복 렌더 스킵 (조기 반환 체크)
 * ANIMATION.md 표준 파이프라인 8단계
 * 실제로는 가장 먼저 실행되는 단계
 */

import { getSceneStartTime } from '@/utils/timeline'
import { calculateTransitionProgress, isTransitionInProgress as calculateIsTransitionInProgress } from '../utils/calculateTransitionTiming'
import { calculateMotionProgress } from '../utils/calculateMotionTiming'
import type { PipelineContext, Step8Result, Step1Result } from './types'

/**
 * 8단계: 중복 렌더 스킵 (조기 반환 체크)
 * 
 * @param context 파이프라인 컨텍스트
 * @param step1Result Step 1 결과
 * @returns 중복 렌더 체크 결과
 */
export function step8CheckDuplicateRender(
  context: PipelineContext,
  step1Result: Step1Result
): Step8Result {
  const {
    timeline,
    tSec,
    options,
    getActiveSegment,
    lastRenderedSegmentIndexRef,
    lastRenderedSceneIndexRef,
    lastRenderedTRef,
    lastRenderedStateRef,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    TIME_EPSILON,
  } = context

  let { sceneIndex, partIndex } = step1Result

  // 렌더링 시점 결정: t(시간) 기반으로 통일 (ANIMATION.md 원칙: "시간의 정답은 t 하나")
  // 세그먼트는 참고용으로만 사용 (씬/파트 인덱스 보정용)
  let activeSegmentFromTts: {
    segment: { id: string; sceneIndex?: number; partIndex?: number; durationSec?: number; startSec?: number }
    segmentIndex: number
  } | null = null

  // 세그먼트 정보는 참고용으로만 가져옴 (씬/파트 인덱스 보정용)
  // 단, forceSceneIndex가 지정된 경우에는 세그먼트로 덮어쓰지 않음 (수동 선택된 씬 우선)
  if (getActiveSegment && !options?.forceSceneIndex) {
    const activeSegment = getActiveSegment(tSec)
    if (activeSegment) {
      activeSegmentFromTts = activeSegment

      // 세그먼트의 sceneIndex/partIndex가 있으면 보정 (TTS 파일 전환 시 정확성 보장)
      // 하지만 렌더링 시점 결정은 t 기반으로 함
      // forceSceneIndex가 있으면 세그먼트로 덮어쓰지 않음
      if (activeSegment.segment.sceneIndex !== undefined) {
        sceneIndex = activeSegment.segment.sceneIndex
      }
      if (activeSegment.segment.partIndex !== undefined) {
        partIndex = activeSegment.segment.partIndex
      }
    }
  } else if (getActiveSegment) {
    // forceSceneIndex가 있는 경우에도 세그먼트 정보는 참고용으로 가져옴 (로깅 등)
    const activeSegment = getActiveSegment(tSec)
    if (activeSegment) {
      activeSegmentFromTts = activeSegment
    }
  }

  // Transition 진행 중인지 먼저 확인 (shouldRender 계산 전에)
  // Transition 진행 중에는 매 프레임마다 렌더링되어야 함
  let isTransitionInProgressForRender = false
  if (!options?.skipAnimation) {
    isTransitionInProgressForRender = calculateIsTransitionInProgress({
      timeline,
      tSec,
      sceneIndex,
      ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
    })
  }

  // 렌더링 조건: t(시간) 기반으로 결정
  // ANIMATION.md 원칙: "시간의 정답은 t 하나(Transport)"
  // - 시간이 변경되었거나 (timeChanged)
  // - Transition 진행 중이거나 (매 프레임 렌더링 필요)
  const timeChanged = Math.abs(tSec - lastRenderedTRef.current) >= TIME_EPSILON
  const shouldRender = timeChanged || isTransitionInProgressForRender

  // 씬 전환 처리에 필요한 정보 (렌더링 조건 체크 전에 계산)
  const sceneChanged = sceneIndex !== lastRenderedSceneIndexRef.current
  const previousRenderedSceneIndex = sceneChanged ? lastRenderedSceneIndexRef.current : null
  

  // 전환 효과 진행 중인지 확인 (중복 렌더링 체크 전에 확인)
  // 전환 효과가 진행 중일 때는 매 프레임마다 업데이트해야 하므로 중복 렌더링 체크를 우회
  // 이미 위에서 계산한 isTransitionInProgressForRender를 사용
  const isTransitionInProgress = isTransitionInProgressForRender

  // 렌더링 조건: segmentChanged 또는 sceneChanged 또는 timeChanged
  // 같은 segment 내에서도 씬이 변경될 수 있으므로 sceneChanged도 체크
  const needsRender = shouldRender || sceneChanged

  // 중복 렌더링 방지: 같은 프레임에서 같은 sceneIndex로 렌더링하는 경우 체크
  // TIME_EPSILON을 더 작게 설정하여 더 정확한 중복 감지
  // 단, 전환 효과가 진행 중일 때는 매 프레임마다 업데이트해야 하므로 중복 렌더링 체크를 우회
  const TIME_EPSILON_STRICT = 0.001 // 1ms로 더 엄격하게 설정

  // Transition 진행률 계산 (중복 렌더 스킵 강화용)
  const transitionProgress = !options?.skipAnimation
    ? calculateTransitionProgress({
        timeline,
        tSec,
        sceneIndex,
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
      })
    : 0

  // Motion 진행률 계산 (중복 렌더 체크를 위해 여기서도 계산)
  // step5와 동일한 방식으로 계산하여 일관성 유지
  let motionProgress = 0
  const scene = timeline.scenes[sceneIndex]
  if (scene?.motion && !options?.skipAnimation) {
    const sceneStartTime = getSceneStartTime(timeline, sceneIndex)
    const sceneLocalT = Math.max(0, tSec - sceneStartTime)
    
    // step5와 동일한 calculateMotionProgress 함수 사용
    const { motionProgress: calculatedMotionProgress } = calculateMotionProgress({
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
    })
    motionProgress = calculatedMotionProgress
  }
  
  // Motion 진행 중인지 확인
  // Motion이 활성화되는 순간부터 완료 전까지 진행 중으로 간주
  // motionProgress가 0보다 크고 1보다 작으면 Motion이 진행 중
  // 단, Motion이 있는 경우 씬이 렌더링되는 순간부터 Motion이 시작되므로,
  // Motion이 완료되지 않았으면(motionProgress < 1) 항상 진행 중으로 간주하여 렌더링 보장
  const hasMotion = scene?.motion && !options?.skipAnimation
  // Motion이 있고, 진행률이 0 이상이고 1 미만이면 진행 중
  // motionProgress = 0일 때는 Motion 시작 순간이므로 진행 중으로 간주
  const isMotionInProgress = hasMotion && motionProgress >= 0 && motionProgress < 1

  // 중복 렌더 체크 강화: Transition/Motion 진행 중이 아니고, 상태가 동일하면 스킵
  // Transition 진행 중에는 항상 렌더링해야 하므로 중복 체크에서 제외
  // Motion 진행 중에도 항상 렌더링해야 하므로 중복 체크에서 제외
  const lastState = lastRenderedStateRef.current
  const isDuplicateRender = !isTransitionInProgress &&
    !isTransitionInProgressForRender && // Transition 진행 중이 아닐 때만 중복 체크
    !isMotionInProgress && // Motion 진행 중이 아닐 때만 중복 체크
    !options?.forceRender &&
    (!needsRender ||
      (lastState &&
        lastState.sceneIndex === sceneIndex &&
        lastState.partIndex === partIndex &&
        Math.abs(tSec - lastState.t) < TIME_EPSILON_STRICT &&
        Math.abs(transitionProgress - lastState.transitionProgress) < 0.001 &&
        Math.abs(motionProgress - lastState.motionProgress) < 0.001))

  // 디버깅: 중복 렌더링 체크 로그
  // 전환 효과 진행 중일 때는 중복 렌더링이 방지되면 안 됨
  if (isDuplicateRender) {
    // 중복 렌더링 방지 (로그 제거)
  }

  // needsRender가 true일 때만 상태 업데이트
  if (needsRender) {
    lastRenderedTRef.current = tSec
    // 마지막 렌더링 상태 업데이트 (중복 렌더 스킵 강화용)
    lastRenderedStateRef.current = {
      t: tSec,
      sceneIndex,
      partIndex: partIndex ?? 0,
      transitionProgress,
      motionProgress,
    }
  }

  // activeSegmentFromTts가 이미 계산되어 있으면 재사용 (중복 호출 방지)
  if (activeSegmentFromTts) {
    lastRenderedSegmentIndexRef.current = activeSegmentFromTts.segmentIndex
  } else if (getActiveSegment) {
    // fallback: activeSegmentFromTts가 없을 때만 호출
    const activeSegment = getActiveSegment(tSec)
    if (activeSegment) {
      lastRenderedSegmentIndexRef.current = activeSegment.segmentIndex
    }
  }

  // 중복 렌더링이면 조기 반환 (단, 전환 효과 진행 중이 아닐 때만)
  // 전환 효과 진행 중일 때는 절대 반환하지 않음
  const shouldSkip: boolean = Boolean(isDuplicateRender && !isTransitionInProgress && !isTransitionInProgressForRender)

  return {
    shouldSkip,
    shouldRender,
    needsRender,
    sceneChanged,
    previousRenderedSceneIndex,
    isTransitionInProgress,
    isTransitionInProgressForRender,
    transitionProgress,
    motionProgress,
    activeSegmentFromTts,
    sceneIndex,
    partIndex: partIndex ?? null,
    sceneStartTime: step1Result.sceneStartTime,
  }
}
