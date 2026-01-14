/**
 * TTS Core 공통 유틸리티 함수
 */

/**
 * 마크업을 텍스트로 변환 (SSML 태그 제거)
 * ElevenLabs 등 마크업을 지원하지 않는 Provider용
 */
export function markupToText(markup: string): string {
  return markup
    .replace(/<speak[^>]*>/gi, '')
    .replace(/<\/speak>/gi, '')
    .replace(/<break[^>]*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * CSV 환경 변수 파싱
 */
export function parseCsvEnv(name: string): string[] {
  const raw = process.env[name]
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
