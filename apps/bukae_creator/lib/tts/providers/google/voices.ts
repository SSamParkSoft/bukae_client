import type { PublicVoiceInfo } from '@/lib/types/tts'
import type { GoogleTtsVoice } from './types'
import { TTS_LANGUAGE_CODE } from './constants'
import { parseCsvEnv } from '@/lib/tts/core/utils'

/**
 * Google TTS 한국어 목소리 필터링
 * (기존 filterChirpKoreanVoices에서 이름 변경)
 */
export function filterKoreanVoices(voices: GoogleTtsVoice[]): GoogleTtsVoice[] {
  const allowedExact = parseCsvEnv('TTS_ALLOWED_VOICES') // exact voice.name allowlist
  const allowedPrefix = process.env.TTS_ALLOWED_VOICE_NAME_PREFIX?.trim()
  const allowedContains =
    parseCsvEnv('TTS_ALLOWED_VOICE_NAME_CONTAINS').length > 0
      ? parseCsvEnv('TTS_ALLOWED_VOICE_NAME_CONTAINS')
      : ['Chirp3', 'Chirp'] // 기본값: Chirp3 우선, 없으면 Chirp 계열

  const isAllowedByRule = (voiceName: string) => {
    if (allowedExact.length > 0) {
      return allowedExact.includes(voiceName)
    }
    if (allowedPrefix && voiceName.startsWith(allowedPrefix)) return true
    return allowedContains.some((needle) => voiceName.includes(needle))
  }

  const filtered = voices.filter((v) => {
    const name = v.name ?? ''
    const languageCodes = v.languageCodes ?? []
    if (!name) return false
    if (!languageCodes.includes(TTS_LANGUAGE_CODE)) return false
    // ko-KR 고정(언어 코드가 포함되어도, 이름이 아예 다른 언어인 경우 방지)
    if (!name.startsWith(`${TTS_LANGUAGE_CODE}-`) && !name.startsWith(`${TTS_LANGUAGE_CODE}_`)) {
      // 일부 naming이 다를 수 있어 startsWith 강제 대신, ko-KR 언어코드 포함만으로도 통과
      // 단, 안전을 위해 최소한 ko-KR을 포함하지 않으면 제외
      if (!name.includes(TTS_LANGUAGE_CODE)) return false
    }
    return isAllowedByRule(name)
  })

  return filtered.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
}

/**
 * Google TTS Voice를 PublicVoiceInfo로 변환
 */
export function toPublicVoiceInfo(v: GoogleTtsVoice): PublicVoiceInfo | null {
  if (!v.name) return null
  return {
    name: v.name,
    languageCodes: (v.languageCodes ?? []).filter(Boolean) as string[],
    ssmlGender: v.ssmlGender ? String(v.ssmlGender) : undefined,
    naturalSampleRateHertz: v.naturalSampleRateHertz ?? undefined,
    provider: 'google',
  }
}
