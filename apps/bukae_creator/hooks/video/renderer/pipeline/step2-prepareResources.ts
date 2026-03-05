/**
 * Step 2: 리소스 준비 (로드/캐시)
 * ANIMATION.md 표준 파이프라인 2단계
 *
 * 이미지 씬: PIXI.Sprite (텍스처) — 기존 동작 유지
 * 영상 씬: videoElementsRef에 HTMLVideoElement가 준비되면 true 반환
 */

import type { PipelineContext, Step2Result } from './types'
import { detectMediaType } from '../utils/detectMediaType'

/**
 * 2단계: 리소스 준비 (로드/캐시)
 *
 * @param context 파이프라인 컨텍스트
 * @param sceneIndex 씬 인덱스
 * @returns 리소스 준비 결과 (shouldContinue=false면 조기 반환 필요)
 */
export function step2PrepareResources(
  context: PipelineContext,
  sceneIndex: number
): Step2Result {
  const { spritesRef, textsRef, sceneLoadingStates, loadScene, videoElementsRef } = context

  const scene = context.timeline.scenes[sceneIndex]

  // ── 영상 씬 처리 ────────────────────────────────────────────────
  if (scene && detectMediaType(scene) === 'video') {
    // videoElementsRef가 없으면 이미지 씬 처럼 처리
    if (videoElementsRef) {
      const videoEl = videoElementsRef.current.get(sceneIndex)
      const sprite = spritesRef.current.get(sceneIndex)

      if (!videoEl || !sprite) {
        // 영상이 아직 로드되지 않음 → loadScene 호출 후 다음 프레임 대기
        const loadingState = sceneLoadingStates.get(sceneIndex)
        if (loadingState !== 'loading' && loadingState !== 'loaded') {
          loadScene(sceneIndex).catch(() => {
            // 씬 로드 실패
          })
        }
        return { shouldContinue: false, sprite: undefined, sceneText: undefined }
      }

      return {
        shouldContinue: true,
        sprite,
        sceneText: textsRef.current.get(sceneIndex),
      }
    }
  }

  // ── 이미지 씬 처리 (기존 동작) ──────────────────────────────────
  const sprite = spritesRef.current.get(sceneIndex)
  const sceneText = textsRef.current.get(sceneIndex)
  const sceneLoaded = sprite !== undefined || sceneText !== undefined

  if (!sceneLoaded) {
    const loadingState = sceneLoadingStates.get(sceneIndex)
    if (loadingState !== 'loading' && loadingState !== 'loaded') {
      loadScene(sceneIndex).catch(() => {
        // 씬 로드 실패
      })
    }
    return { shouldContinue: false, sprite: undefined, sceneText: undefined }
  }

  return { shouldContinue: true, sprite, sceneText }
}
