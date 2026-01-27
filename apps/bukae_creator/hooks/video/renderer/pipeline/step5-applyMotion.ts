/**
 * Step 5: Motion 적용
 * ANIMATION.md 표준 파이프라인 5단계
 */

import { getSceneStartTime } from '@/utils/timeline'
import { MotionEvaluator } from '../../effects/motion/MotionEvaluator'
import { calculateMotionProgress, calculateMotionDuration, calculateMotionLocalTime } from '../utils/calculateMotionTiming'
import { getFabricImagePosition } from '../utils/getFabricPosition'
import type { PipelineContext, Step5Result, Step8Result } from './types'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import * as PIXI from 'pixi.js'

/**
 * Motion 적용 헬퍼 함수 (Transition 이후 재적용용)
 * Transition이 적용한 위치를 기준으로 Motion을 추가 적용
 */
export function applyMotionToSprite(
  context: PipelineContext,
  sceneIndex: number,
  scene: TimelineScene,
  sprite: PIXI.Sprite | null,
  step8Result: Step8Result,
  useCurrentPositionAsBase: boolean = false
): void {
  if (!sprite || sprite.destroyed || !scene.motion) {
    return
  }

  const {
    timeline,
    tSec,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    getActiveSegment,
    stageDimensions,
    fabricCanvasRef,
    fabricScaleRatioRef,
  } = context

  // 씬 로컬 시간 계산
  const sceneStartTime = getSceneStartTime(timeline, sceneIndex)
  const sceneLocalT = Math.max(0, tSec - sceneStartTime)

  // Motion duration 및 로컬 시간 계산
  const { motionDurationSec, motionStartSecInScene } = calculateMotionDuration({
    timeline,
    sceneIndex,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    getActiveSegment,
    activeSegmentFromTts: step8Result.activeSegmentFromTts,
  })

  const { motionLocalT } = calculateMotionLocalTime({
    sceneLocalT,
    sceneStartTime,
    getActiveSegment,
    activeSegmentFromTts: step8Result.activeSegmentFromTts,
  })

  if (motionDurationSec > 0) {
    // Transition이 적용한 위치를 기준으로 Motion을 추가 적용
    // baseState의 scale은 항상 현재 sprite의 실제 scale을 사용해야 함
    // resetBaseState에서 원본 텍스처 크기를 기준으로 계산한 scale과 일치해야 Motion이 올바르게 작동함
    const basePosition = useCurrentPositionAsBase
      ? {
          x: sprite.x,
          y: sprite.y,
          scaleX: sprite.scale.x,
          scaleY: sprite.scale.y,
          rotation: sprite.rotation,
        }
      : getFabricImagePosition(
          sceneIndex,
          scene,
          fabricCanvasRef as any,
          fabricScaleRatioRef,
          stageDimensions
        )

    // baseState 계산: Transition이 적용한 현재 위치를 기준으로 Motion 추가 적용
    // 중요: sprite.scale.x/y는 resetBaseState 또는 Transition에서 설정된 현재 값을 사용
    // Motion은 이 값을 기준으로 상대적인 변화를 적용함
    const baseState = {
      x: basePosition.x,
      y: basePosition.y,
      scaleX: sprite.scale.x, // 현재 sprite의 실제 scale 사용 (resetBaseState 또는 Transition에서 설정된 값)
      scaleY: sprite.scale.y, // 현재 sprite의 실제 scale 사용 (resetBaseState 또는 Transition에서 설정된 값)
      rotation: basePosition.rotation,
      alpha: sprite.alpha, // 현재 alpha 값 사용
    }

    const maxDimension = Math.max(stageDimensions.width, stageDimensions.height)
    const slideDistance = scene.motion.params?.distance ?? maxDimension * 0.8

    const motionWithSegmentTiming: typeof scene.motion = {
      ...scene.motion,
      startSecInScene: motionStartSecInScene,
      durationSec: motionDurationSec,
      params: {
        ...scene.motion.params,
        distance: slideDistance,
      },
    }

      // Motion이 활성 상태인지 확인 (MotionEvaluator.isActive 사용)
      // motionLocalT는 세그먼트 기준 로컬 시간이므로, MotionEvaluator에 그대로 전달
      const motionActive = MotionEvaluator.isActive(motionLocalT, motionWithSegmentTiming)
      
      // Motion 결과 계산 (활성 상태가 아니어도 계산은 수행하되, isActive로 필터링)
      const motionResult = MotionEvaluator.evaluate(motionLocalT, motionWithSegmentTiming, baseState)


    if (motionActive) {
      // Motion 결과를 sprite에 적용 (Transition이 적용한 위치에 추가 적용)
      if (motionResult.x !== undefined) {
        sprite.x = motionResult.x
      }
      if (motionResult.y !== undefined) {
        sprite.y = motionResult.y
      }
      if (motionResult.scaleX !== undefined) {
        sprite.scale.x = motionResult.scaleX
      }
      if (motionResult.scaleY !== undefined) {
        sprite.scale.y = motionResult.scaleY
      }
      if (motionResult.rotation !== undefined) {
        sprite.rotation = motionResult.rotation
      }
      if (motionResult.alpha !== undefined) {
        sprite.alpha = motionResult.alpha
      }
    }
  } else {
    // Motion이 없을 때 원본 색상으로 표시
    if (sprite && !sprite.destroyed) {
      sprite.tint = 0xFFFFFF // 흰색 (원본 색상)
    }
  }
}

/**
 * 5단계: Motion 적용
 * 
 * @param context 파이프라인 컨텍스트
 * @param sceneIndex 씬 인덱스
 * @param scene 씬 데이터
 * @param sprite 스프라이트
 * @param step8Result Step 8 결과 (Transition 진행 중 여부 확인용)
 * @returns Motion 적용 결과
 */
export function step5ApplyMotion(
  context: PipelineContext,
  sceneIndex: number,
  scene: TimelineScene,
  sprite: PIXI.Sprite | null,
  step8Result: Step8Result
): Step5Result {
  const {
    timeline,
    tSec,
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    getActiveSegment,
    stageDimensions,
    fabricCanvasRef,
    fabricScaleRatioRef,
  } = context

  // 씬 로컬 시간 계산 (Motion 평가에 필요)
  const sceneStartTime = getSceneStartTime(timeline, sceneIndex)
  const sceneLocalT = Math.max(0, tSec - sceneStartTime)

  // Motion 진행률 계산 (중복 렌더 스킵 강화용)
  let motionProgress = 0
  if (scene.motion && sprite) {
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
      activeSegmentFromTts: step8Result.activeSegmentFromTts,
    })
    motionProgress = calculatedMotionProgress
  }

  // Transition이 진행 중인지 확인 (Motion 적용 전에 확인)
  // Motion은 이미지(sprite)에만 적용, t 기반 평가
  // Transition 진행 중일 때는 step6에서 Transition 적용 후 Motion을 재적용하므로,
  // step5에서는 Transition 진행 중이 아닐 때만 Motion 적용
  const isTransitionInProgressForCurrentScene = step8Result.isTransitionInProgress || step8Result.isTransitionInProgressForRender

  // Motion 적용: Transition 진행 중이 아닐 때만 적용
  // Transition 진행 중일 때는 step6에서 Transition 적용 후 Motion을 재적용
  let spriteAfterMotion: { x: number; y: number; scaleX: number; scaleY: number } | null = null


  if (sprite && !sprite.destroyed && scene.motion && !isTransitionInProgressForCurrentScene) {
    // Motion duration 및 로컬 시간 계산
    const { motionDurationSec, motionStartSecInScene } = calculateMotionDuration({
      timeline,
      sceneIndex,
      ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
      getActiveSegment,
      activeSegmentFromTts: step8Result.activeSegmentFromTts,
    })

    const { motionLocalT } = calculateMotionLocalTime({
      sceneLocalT,
      sceneStartTime,
      getActiveSegment,
      activeSegmentFromTts: step8Result.activeSegmentFromTts,
    })

    // Motion이 활성화된 경우에만 적용
    if (motionDurationSec > 0) {
      // 원래 위치는 Fabric canvas에서 직접 가져옴 (사용자가 Fabric으로 제어한 위치)
      // 슬라이드 효과는 "원래 위치로 오는" 효과이므로, 원래 위치를 기준으로 계산해야 함
      const position = getFabricImagePosition(
        sceneIndex,
        scene,
        fabricCanvasRef as any,
        fabricScaleRatioRef,
        stageDimensions
      )

      // baseState의 scale은 resetBaseState에서 설정한 실제 sprite scale을 사용해야 함
      // resetBaseState에서 원본 텍스처 크기를 기준으로 계산한 scale과 일치해야 Motion이 올바르게 작동함
      // 중요: sprite.scale.x/y는 resetBaseState에서 이미 Fabric 위치에 맞게 설정되었으므로,
      // Motion은 이 값을 기준으로 상대적인 변화를 적용함
      const baseState = {
        x: position.x, // 원래 위치 사용 (Fabric에서 가져온 사용자 설정 위치)
        y: position.y, // 원래 위치 사용
        scaleX: sprite.scale.x, // resetBaseState에서 설정한 실제 sprite scale 사용 (Fabric 기준)
        scaleY: sprite.scale.y, // resetBaseState에서 설정한 실제 sprite scale 사용 (Fabric 기준)
        rotation: position.rotation,
        alpha: sprite.alpha, // alpha는 현재 값 유지 (resetBaseState에서 1로 설정됨)
      }

      // 세그먼트 시작부터 시작하도록 MotionConfig 수정
      // startSecInScene을 세그먼트 시작 시간(0)으로 설정하고 durationSec을 세그먼트 TTS 캐시 duration으로 설정
      // 슬라이드 효과가 많이 멀리서 오도록 distance를 화면 크기에 비례하여 설정
      const maxDimension = Math.max(stageDimensions.width, stageDimensions.height)
      const slideDistance = scene.motion.params?.distance ?? maxDimension * 0.8 // 기본값: 화면 크기의 80%

      const motionWithSegmentTiming: typeof scene.motion = {
        ...scene.motion,
        startSecInScene: motionStartSecInScene, // 세그먼트 시작 시간(0)
        durationSec: motionDurationSec, // 세그먼트 TTS 캐시 duration
        params: {
          ...scene.motion.params,
          distance: slideDistance, // 화면 크기에 비례한 거리 사용
        },
      }

      // MotionEvaluator.evaluate는 motionLocalT를 받아서 내부에서 motion.startSecInScene을 빼서 계산함
      // motionLocalT는 이미 세그먼트 기준 로컬 시간이고, motion.startSecInScene은 0으로 설정했으므로
      // MotionEvaluator 내부에서 elapsed = motionLocalT - 0 = motionLocalT가 됨
      // 따라서 motionLocalT를 그대로 전달하면 됨
      
      // Motion이 활성 상태인지 확인 (MotionEvaluator.isActive 사용)
      // motionLocalT는 세그먼트 기준 로컬 시간이므로, MotionEvaluator에 그대로 전달
      const motionActive = MotionEvaluator.isActive(motionLocalT, motionWithSegmentTiming)
      
      // Motion 결과 계산 (활성 상태가 아니어도 계산은 수행하되, isActive로 필터링)
      const motionResult = MotionEvaluator.evaluate(motionLocalT, motionWithSegmentTiming, baseState)


      if (motionActive) {
        // Motion 결과를 sprite에 적용
        if (motionResult.x !== undefined) {
          sprite.x = motionResult.x
        }
        if (motionResult.y !== undefined) {
          sprite.y = motionResult.y
        }
        if (motionResult.scaleX !== undefined) {
          sprite.scale.x = motionResult.scaleX
        }
        if (motionResult.scaleY !== undefined) {
          sprite.scale.y = motionResult.scaleY
        }
        if (motionResult.rotation !== undefined) {
          sprite.rotation = motionResult.rotation
        }
        if (motionResult.alpha !== undefined) {
          sprite.alpha = motionResult.alpha
        }
      }
    }

    // Motion 적용 후 sprite 위치 저장 (Transition이 덮어쓰는지 확인용)
    spriteAfterMotion = {
      x: sprite.x,
      y: sprite.y,
      scaleX: sprite.scale.x,
      scaleY: sprite.scale.y,
    }
  }

  return {
    motionProgress,
    spriteAfterMotion,
    sceneLocalT,
    sceneStartTime,
  }
}
