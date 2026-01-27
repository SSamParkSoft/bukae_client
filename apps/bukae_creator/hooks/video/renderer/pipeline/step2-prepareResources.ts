/**
 * Step 2: 리소스 준비 (로드/캐시)
 * ANIMATION.md 표준 파이프라인 2단계
 */

import type { PipelineContext, Step2Result } from './types'

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
  const { spritesRef, textsRef, sceneLoadingStates, loadScene } = context

  // 씬이 로드되었는지 확인
  const sprite = spritesRef.current.get(sceneIndex)
  const sceneText = textsRef.current.get(sceneIndex)
  const sceneLoaded = sprite !== undefined || sceneText !== undefined

  // 씬이 로드되지 않았으면 사전 로드
  if (!sceneLoaded) {
    const loadingState = sceneLoadingStates.get(sceneIndex)
    if (loadingState !== 'loading' && loadingState !== 'loaded') {
      // 비동기로 로드 시작 (await하지 않음)
      loadScene(sceneIndex).catch(() => {
        // 씬 로드 실패 (로그 제거)
      })
    }
    return {
      shouldContinue: false,
      sprite: undefined,
      sceneText: undefined,
    }
  }

  return {
    shouldContinue: true,
    sprite,
    sceneText,
  }
}
