/**
 * Step 7: 자막 적용
 * ANIMATION.md 표준 파이프라인 7단계
 *
 * - 자막 renderSubtitlePart 호출
 * - Transition 중 자막 크로스페이드 (progress 0.45~0.55 구간)
 * - Fabric.js 편집 모드: progress 기준 selectable 하드컷
 */

import type { PipelineContext, Step5Result as _Step5Result, Step8Result } from './types'
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
 * @param step8Result Step 8 결과 (transition 진행 중 여부 및 progress 확인용)
 */
export function step7ApplySubtitle(
  context: PipelineContext,
  sceneIndex: number,
  partIndex: number | null,
  _scene: TimelineScene,
  _sprite: PIXI.Sprite | null,
  _spriteAfterMotion: { x: number; y: number; scaleX: number; scaleY: number } | null,
  _sceneLocalT: number,
  step8Result?: Step8Result
): void {
  const { options, renderSubtitlePart, textsRef, fabricCanvasRef } = context

  // 자막 렌더링 (현재 씬)
  renderSubtitlePart(sceneIndex, partIndex, {
    skipAnimation: options?.skipAnimation,
    onComplete: () => {
      // 자막 렌더링 완료 후 추가 처리 (필요시)
    },
  })

  // ── Transition 중 자막 크로스페이드 ──────────────────────────────
  if (
    step8Result?.isTransitionInProgress &&
    step8Result.previousRenderedSceneIndex !== null &&
    step8Result.previousRenderedSceneIndex >= 0 &&
    step8Result.transitionProgress >= 0
  ) {
    const progress = step8Result.transitionProgress
    const prevIdx = step8Result.previousRenderedSceneIndex

    const textA = textsRef.current.get(prevIdx)
    const textB = textsRef.current.get(sceneIndex)

    if (textA && !textA.destroyed && textB && !textB.destroyed) {
      // 0.45 ~ 0.55 구간에서만 크로스페이드
      if (progress <= 0.45) {
        textA.alpha = 1
        textB.alpha = 0
      } else if (progress >= 0.55) {
        textA.alpha = 0
        textB.alpha = 1
      } else {
        const crossProgress = (progress - 0.45) / 0.1 // 0→1 in [0.45, 0.55]
        textA.alpha = 1 - crossProgress
        textB.alpha = crossProgress
      }
    }

    // ── Fabric.js 편집 모드 하드컷 (scrubbing oscillation 방지) ──
    // fabricCanvasRef가 있으면 progress 기준으로 selectable 전환
    if (fabricCanvasRef?.current) {
      const canvas = fabricCanvasRef.current
      const cut = progress < 0.5 ? 'A' : 'B'
      // 씬 인덱스 기반으로 Fabric 오브젝트를 구분 (sceneIndex 커스텀 프로퍼티 활용)
      canvas.getObjects().forEach((obj: Record<string, unknown>) => {
        const objSceneIndex = (obj as { sceneIndex?: number }).sceneIndex
        if (objSceneIndex === undefined) return
        if (objSceneIndex === prevIdx) {
          obj.selectable = cut === 'A'
          obj.evented = cut === 'A'
        } else if (objSceneIndex === sceneIndex) {
          obj.selectable = cut === 'B'
          obj.evented = cut === 'B'
        }
      })
    }
  }
}
