/**
 * 시간(초)을 MM:SS 형식으로 포맷합니다.
 * @param seconds 초 단위 시간
 * @returns MM:SS 형식 문자열
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 대본 길이 기반 자동 duration을 계산합니다 (대략 초당 8글자, 1~5초 범위).
 * @param script 대본 텍스트
 * @returns 계산된 duration (초)
 */
export const getSceneDuration = (script: string): number => {
  if (!script) return 2.5
  const length = script.replace(/\s+/g, '').length
  const raw = length / 8
  return Math.max(1, Math.min(5, raw))
}

