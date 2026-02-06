/**
 * 씬 배열 안전 처리 유틸리티 함수
 * 
 * Fast와 Pro step3에서 공통으로 사용하는 씬 배열 검증 및 정규화 함수들
 */

/**
 * 값이 배열인지 확인하고, 배열이면 그대로 반환하고 아니면 빈 배열 반환
 * 
 * @param value - 검증할 값
 * @returns 배열이면 그대로 반환, 아니면 빈 배열 반환
 */
export function ensureSceneArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[]
  }
  return []
}

/**
 * 씬 배열이 유효한지 확인 (배열이고 길이가 0보다 큰지)
 * 
 * @param scenes - 검증할 씬 배열
 * @returns 유효한 배열이면 true, 아니면 false
 */
export function isValidSceneArray<T>(scenes: unknown): scenes is T[] {
  return Array.isArray(scenes) && scenes.length > 0
}

/**
 * 씬 배열을 안전하게 가져오기 (배열이 아니거나 빈 배열이면 빈 배열 반환)
 * 
 * @param scenes - 씬 배열 또는 undefined/null
 * @returns 안전한 씬 배열
 */
export function getSafeScenes<T>(scenes: unknown): T[] {
  return ensureSceneArray<T>(scenes)
}
