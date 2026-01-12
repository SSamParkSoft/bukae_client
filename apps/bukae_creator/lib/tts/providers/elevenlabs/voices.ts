import type { PublicVoiceInfo } from '@/lib/types/tts'
import type { ElevenLabsVoice } from './types'
import { TTS_LANGUAGE_CODE } from './constants'

/**
 * ElevenLabs 목소리 목록 조회
 */
export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const { getElevenLabsClient } = await import('./client')
  const client = getElevenLabsClient()
  const response = await client.voices.getAll()
  return response.voices || []
}

/**
 * ElevenLabs 한국어 목소리 필터링
 * (일레븐랩스는 다국어를 지원하므로 모든 음성 반환)
 */
export function filterKoreanVoices(voices: ElevenLabsVoice[]): ElevenLabsVoice[] {
  // 일레븐랩스는 다국어를 지원하므로 모든 음성 반환
  // 필요시 language 필드로 필터링 가능
  // 현재는 모든 음성을 반환 (다국어 지원)
  return voices
}

/**
 * ElevenLabs Voice를 PublicVoiceInfo로 변환
 */
export function toPublicVoiceInfo(v: ElevenLabsVoice): PublicVoiceInfo | null {
  if (!v.voice_id || !v.name) return null

  // gender 매핑
  let ssmlGender: 'MALE' | 'FEMALE' | undefined
  if (v.gender) {
    const genderLower = v.gender.toLowerCase()
    if (genderLower.includes('female') || genderLower.includes('여성')) {
      ssmlGender = 'FEMALE'
    } else if (genderLower.includes('male') || genderLower.includes('남성')) {
      ssmlGender = 'MALE'
    }
  }

  return {
    name: `elevenlabs:${v.voice_id}`, // provider 구분을 위한 prefix (직렬화용)
    languageCodes: [TTS_LANGUAGE_CODE],
    ssmlGender,
    provider: 'elevenlabs' as const,
    voiceId: v.voice_id,
    displayName: v.name, // 실제 이름 (UI 표시용)
  }
}
