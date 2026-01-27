/**
 * Step 7: 자막 적용
 * ANIMATION.md 표준 파이프라인 7단계
 */

import { MotionEvaluator } from '../../effects/motion/MotionEvaluator'
import type { PipelineContext, Step5Result } from './types'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import * as PIXI from 'pixi.js'

/**
 * 7단계: 자막 적용
 * 
 * @param context 파이프라인 컨텍스트
 * @param sceneIndex 씬 인덱스
 * @param partIndex 파트 인덱스
 * @param scene 씬 데이터
 * @param sprite 스프라이트 (Motion 위치 확인용)
 * @param spriteAfterMotion Motion 적용 후 스프라이트 위치
 * @param sceneLocalT 씬 로컬 시간
 */
export function step7ApplySubtitle(
  context: PipelineContext,
  sceneIndex: number,
  partIndex: number | null,
  scene: TimelineScene,
  sprite: PIXI.Sprite | null,
  spriteAfterMotion: { x: number; y: number; scaleX: number; scaleY: number } | null,
  sceneLocalT: number
): void {
  const { tSec, options, renderSubtitlePart } = context

  // Motion이 적용된 경우 Transition 적용 후 위치 확인 (개발 모드)
  if (process.env.NODE_ENV === 'development' && spriteAfterMotion && sprite && !sprite.destroyed && scene.motion && Math.floor(tSec * 10) % 10 === 0) {
    const motionActive = MotionEvaluator.isActive(sceneLocalT, scene.motion)
    if (motionActive) {
      const spriteAfterTransition = {
        x: sprite.x,
        y: sprite.y,
        scaleX: sprite.scale.x,
        scaleY: sprite.scale.y,
      }
      const positionChanged = {
        x: Math.abs(spriteAfterTransition.x - spriteAfterMotion.x) > 0.01,
        y: Math.abs(spriteAfterTransition.y - spriteAfterMotion.y) > 0.01,
        scaleX: Math.abs(spriteAfterTransition.scaleX - spriteAfterMotion.scaleX) > 0.01,
        scaleY: Math.abs(spriteAfterTransition.scaleY - spriteAfterMotion.scaleY) > 0.01,
      }
      if (positionChanged.x || positionChanged.y || positionChanged.scaleX || positionChanged.scaleY) {
        console.warn('[useTransportRenderer] Motion position OVERWRITTEN by Transition:', {
          tSec: tSec.toFixed(3),
          sceneIndex,
          motionType: scene.motion.type,
          spriteAfterMotion,
          spriteAfterTransition,
          positionChanged,
        })
      }
    }
  }

  // 자막 렌더링
  renderSubtitlePart(sceneIndex, partIndex, {
    skipAnimation: options?.skipAnimation,
    onComplete: () => {
      // 자막 렌더링 완료 후 추가 처리 (필요시)
    },
  })
}
