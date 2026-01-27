/**
 * Step 7: 자막 적용
 * ANIMATION.md 표준 파이프라인 7단계
 */

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

  // Motion과 Transition 동시 적용 확인 (개발 모드)
  // step6에서 Transition 적용 후 Motion을 재적용하므로, 이제는 Motion이 Transition을 덮어쓰지 않음
  // 경고 로직 제거: Transition과 Motion이 동시에 적용되므로 경고 불필요

  // 자막 렌더링
  renderSubtitlePart(sceneIndex, partIndex, {
    skipAnimation: options?.skipAnimation,
    onComplete: () => {
      // 자막 렌더링 완료 후 추가 처리 (필요시)
    },
  })
}
