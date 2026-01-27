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
  // Transition이 진행 중이 아닐 때만 Motion 적용 (Transition이 Motion을 덮어쓰지 않도록)
  const isTransitionInProgressForCurrentScene = (() => {
    if (!scene || !scene.transitionDuration) return false
    const nextScene = timeline.scenes[sceneIndex + 1]
    const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (scene.transitionDuration || 0.5)
    if (transitionDuration === 0) return false

    let transitionSceneStartTime = 0
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
      const prevNextScene = timeline.scenes[i + 1]
      const prevIsSameSceneId = prevNextScene && prevScene.sceneId === prevNextScene.sceneId
      const prevTransitionDuration = prevIsSameSceneId ? 0 : (prevScene.transitionDuration || 0.5)
      transitionSceneStartTime += sceneDuration + prevTransitionDuration
    }
    const transitionStartTime = transitionSceneStartTime - transitionDuration
    const relativeTime = tSec - transitionStartTime
    return relativeTime >= 0 && relativeTime <= transitionDuration
  })()

  // Motion 적용: Transition이 진행 중이 아닐 때만 적용
  // Transition이 진행 중이면 Transition이 Motion을 대체함
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
      const elapsed = motionLocalT - motionStartSecInScene
      const motionActive = elapsed >= 0 && elapsed <= motionDurationSec

      if (motionActive) {
        // 원래 위치는 Fabric canvas에서 직접 가져옴 (사용자가 Fabric으로 제어한 위치)
        // 슬라이드 효과는 "원래 위치로 오는" 효과이므로, 원래 위치를 기준으로 계산해야 함
        const position = getFabricImagePosition(
          sceneIndex,
          scene,
          fabricCanvasRef as any,
          fabricScaleRatioRef,
          stageDimensions
        )

        const baseState = {
          x: position.x, // 원래 위치 사용 (Fabric에서 가져온 사용자 설정 위치)
          y: position.y, // 원래 위치 사용
          scaleX: position.scaleX,
          scaleY: position.scaleY,
          rotation: position.rotation,
          alpha: sprite.alpha, // alpha는 현재 값 유지
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

        const motionResult = MotionEvaluator.evaluate(motionLocalT, motionWithSegmentTiming, baseState)

        // Motion 결과를 sprite에 적용
        const spriteBeforeMotion = {
          x: sprite.x,
          y: sprite.y,
          scaleX: sprite.scale.x,
          scaleY: sprite.scale.y,
          rotation: sprite.rotation,
          alpha: sprite.alpha,
        }

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

        // Motion Applied 로그 제거 (불필요한 로그 정리)
        if (process.env.NODE_ENV === 'development' && Math.floor(tSec * 10) % 10 === 0) {
          const motionChanged = {
            x: Math.abs(sprite.x - spriteBeforeMotion.x) > 0.01,
            y: Math.abs(sprite.y - spriteBeforeMotion.y) > 0.01,
            scaleX: Math.abs(sprite.scale.x - spriteBeforeMotion.scaleX) > 0.01,
            scaleY: Math.abs(sprite.scale.y - spriteBeforeMotion.scaleY) > 0.01,
          }

          // Motion이 실제로 변경되었을 때만 상세 로그 출력
          if (motionChanged.x || motionChanged.y || motionChanged.scaleX || motionChanged.scaleY) {
            // Motion Applied 로그 제거됨
          }
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
