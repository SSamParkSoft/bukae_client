/**
 * 자막 분할 유틸리티 함수
 * ||| 구분자를 기준으로 자막을 분할하고, 분할 여부를 확인하는 함수들을 제공합니다.
 */

/**
 * ||| 구분자를 기준으로 자막을 분할합니다.
 * @param text - 분할할 자막 텍스트
 * @returns 분할된 자막 배열 (빈 문자열 제외)
 * 
 * @example
 * splitSubtitleByDelimiter("안녕하세요|||반갑습니다|||좋은 하루 되세요")
 * // ["안녕하세요", "반갑습니다", "좋은 하루 되세요"]
 */
export function splitSubtitleByDelimiter(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return []
  }
  
  return text
    .split(/\s*\|\|\|\s*/)
    .map(part => part.trim())
    .filter(part => part.length > 0)
}

/**
 * 자막이 ||| 구분자로 분할되어 있는지 확인합니다.
 * @param text - 확인할 자막 텍스트
 * @returns 분할 여부 (true: 분할됨, false: 분할되지 않음)
 * 
 * @example
 * hasSubtitleSegments("안녕하세요|||반갑습니다") // true
 * hasSubtitleSegments("안녕하세요") // false
 */
export function hasSubtitleSegments(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false
  }
  
  return /\|\|\|/.test(text)
}

/**
 * 자막의 구간 개수를 반환합니다.
 * @param text - 확인할 자막 텍스트
 * @returns 구간 개수 (분할되지 않았으면 1)
 * 
 * @example
 * getSubtitleSegmentCount("안녕하세요|||반갑습니다|||좋은 하루") // 3
 * getSubtitleSegmentCount("안녕하세요") // 1
 */
export function getSubtitleSegmentCount(text: string): number {
  const segments = splitSubtitleByDelimiter(text)
  return segments.length > 0 ? segments.length : 1
}

