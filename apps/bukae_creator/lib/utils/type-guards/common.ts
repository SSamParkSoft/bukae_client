/**
 * 공통 타입 가드 함수
 * 런타임에서 타입을 검증하는 함수들을 정의합니다.
 */

/**
 * 값이 null이 아니고 undefined가 아닌지 확인
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * 값이 문자열인지 확인
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 값이 숫자인지 확인
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * 값이 객체인지 확인 (null 제외)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 값이 배열인지 확인
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value)
}

/**
 * 값이 빈 문자열이 아닌지 확인
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

/**
 * 값이 양수인지 확인
 */
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0
}

/**
 * 값이 유효한 URL인지 확인
 */
export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

