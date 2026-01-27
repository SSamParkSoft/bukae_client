/**
 * Step 8: 중복 렌더 스킵 (조기 반환 체크)
 * ANIMATION.md 표준 파이프라인 8단계
 * 실제로는 가장 먼저 실행되는 단계
 */

import { calculateTransitionProgress, isTransitionInProgress as calculateIsTransitionInProgress } from '../utils/calculateTransitionTiming'
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

  // 중복 렌더링 방지: segmentChanged만 체크 (TTS 파일 전환 시 즉시 렌더링)
  // 참고: segmentChanged는 실제 TTS 오디오 파일 세그먼트 인덱스 변경을 감지합니다.
  //       하나의 세그먼트 = 하나의 part이므로, segmentChanged가 true이면 part도 변경된 것입니다.
  let segmentChanged = false
  let currentSegmentIndex = 0
  let activeSegmentFromTts: {
    segment: { id: string; sceneIndex?: number; partIndex?: number; durationSec?: number; startSec?: number }
    segmentIndex: number
  } | null = null

  // getActiveSegment가 있으면 segmentChanged 체크, 없으면 timeChanged fallback
  let shouldRender = false
  if (getActiveSegment) {
    const activeSegment = getActiveSegment(tSec)
    if (activeSegment) {
      activeSegmentFromTts = activeSegment
      currentSegmentIndex = activeSegment.segmentIndex
      segmentChanged = currentSegmentIndex !== lastRenderedSegmentIndexRef.current

      // segmentChanged가 true이고 activeSegment에 sceneIndex가 있으면 그것을 우선 사용
      // TTS 파일 전환 시 정확한 씬 인덱스를 보장
      if (segmentChanged && activeSegment.segment.sceneIndex !== undefined) {
        sceneIndex = activeSegment.segment.sceneIndex
      }

      // activeSegment에 partIndex가 있으면 그것을 우선 사용 (씬 분할 그룹)
      // segmentChanged가 true이면 새로운 part로 전환된 것이므로 partIndex도 업데이트
      if (activeSegment.segment.partIndex !== undefined) {
        partIndex = activeSegment.segment.partIndex
      }
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

  // 렌더링 조건: segmentChanged 또는 Transition 진행 중 또는 timeChanged
  if (getActiveSegment) {
    shouldRender = segmentChanged || isTransitionInProgressForRender
  } else {
    // getActiveSegment가 없을 때는 timeChanged를 fallback으로 사용 (초기 로딩 시)
    const timeChanged = Math.abs(tSec - lastRenderedTRef.current) >= TIME_EPSILON
    shouldRender = timeChanged || isTransitionInProgressForRender
  }

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

  // Motion 진행률 계산은 scene과 sceneLocalT가 정의된 후에 수행
  // 여기서는 초기값만 설정 (실제 계산은 나중에)
  let motionProgress = 0 // 나중에 재할당됨

  // 중복 렌더 체크 강화: Transition/Motion 진행 중이 아니고, 상태가 동일하면 스킵
  // Transition 진행 중에는 항상 렌더링해야 하므로 중복 체크에서 제외
  const lastState = lastRenderedStateRef.current
  const isDuplicateRender = !isTransitionInProgress &&
    !isTransitionInProgressForRender && // Transition 진행 중이 아닐 때만 중복 체크
    !options?.forceRender &&
    (!needsRender ||
      (lastState &&
        lastState.sceneIndex === sceneIndex &&
        lastState.partIndex === partIndex &&
        Math.abs(tSec - lastState.t) < TIME_EPSILON_STRICT &&
        Math.abs(transitionProgress - lastState.transitionProgress) < 0.001 &&
        Math.abs(motionProgress - lastState.motionProgress) < 0.001))

  // 디버깅: 중복 렌더링 체크 로그
  // 전환 효과 진행 중일 때는 중복 렌더링이 방지되면 안 되므로 항상 로그 출력
  if (isDuplicateRender) {
    // 전환 효과 진행 중이 아닐 때만 샘플링
    const shouldLog = isTransitionInProgress || Math.floor(tSec * 100) % 100 === 0
    if (shouldLog) {
      console.log('[useTransportRenderer] Duplicate render prevented:', {
        tSec: tSec.toFixed(3),
        sceneIndex,
        lastRenderedSceneIndex: lastRenderedSceneIndexRef.current,
        lastRenderedT: lastRenderedTRef.current.toFixed(3),
        timeDiff: Math.abs(tSec - lastRenderedTRef.current).toFixed(4),
        needsRender,
        shouldRender,
        sceneChanged,
        isTransitionInProgress,
        // 전환 효과 진행 중인데도 중복 렌더링이 방지되면 문제
        warning: isTransitionInProgress ? 'WARNING: Transition in progress but duplicate render prevented!' : undefined,
      })
    }
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
  }
}
