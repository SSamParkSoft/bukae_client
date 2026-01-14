import type { TtsProviderInterface } from '@/lib/tts/core/provider.interface'
import type { SynthesizeParams, SynthesizeResult } from '@/lib/tts/core/synthesizer.interface'
import type { PublicVoiceInfo, VoiceInfo, GoogleVoiceInfo } from '@/lib/types/tts'
import { getTextToSpeechClient } from './client'
import { filterKoreanVoices, toPublicVoiceInfo } from './voices'
import { synthesize as synthesizeGoogle } from './synthesizer'
import { TTS_LANGUAGE_CODE } from './constants'
import { publicVoiceInfoToVoiceInfo } from '@/lib/types/tts'

/**
 * Google TTS Provider 구현
 */
export const GoogleProvider: TtsProviderInterface = {
  name: 'google',
  displayName: 'Google TTS',

  /**
   * 목소리 목록 조회
   */
  async listVoices(): Promise<PublicVoiceInfo[]> {
    const client = getTextToSpeechClient()
    const [result] = await client.listVoices({ languageCode: TTS_LANGUAGE_CODE })
    const voices = result.voices ?? []
    const filtered = filterKoreanVoices(voices)
      .map(toPublicVoiceInfo)
      .filter(Boolean) as PublicVoiceInfo[]
    return filtered
  },

  /**
   * voiceId로 목소리 정보 조회
   */
  getVoiceInfo(voiceId: string): VoiceInfo | null {
    // Google TTS는 voiceId가 곧 googleVoiceName
    return {
      provider: 'google',
      voiceId: voiceId,
      displayName: voiceId.split('-').pop() || voiceId,
      googleVoiceName: voiceId,
      languageCodes: [TTS_LANGUAGE_CODE],
    } as GoogleVoiceInfo
  },

  /**
   * TTS 합성
   */
  async synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
    // voiceId로 VoiceInfo 생성
    const voiceInfo = this.getVoiceInfo(params.voiceId)
    if (!voiceInfo || voiceInfo.provider !== 'google') {
      throw new Error('유효하지 않은 Google TTS 목소리입니다.')
    }

    return synthesizeGoogle({
      ...params,
      voiceInfo: voiceInfo as GoogleVoiceInfo,
    })
  },

  /**
   * PublicVoiceInfo를 VoiceInfo로 변환
   */
  toVoiceInfo(publicVoice: PublicVoiceInfo): VoiceInfo | null {
    if (publicVoice.provider !== 'google') {
      return null
    }
    return publicVoiceInfoToVoiceInfo(publicVoice)
  },

  /**
   * 목소리 필터링
   */
  filterVoices(voices: unknown[]): unknown[] {
    // Google TTS Voice 타입으로 캐스팅하여 필터링
    return filterKoreanVoices(voices as Parameters<typeof filterKoreanVoices>[0])
  },
}

// 기존 export 유지 (하위 호환성)
export { getTextToSpeechClient } from './client'
export { filterKoreanVoices, toPublicVoiceInfo } from './voices'
export { TTS_LANGUAGE_CODE } from './constants'
export type { GoogleTtsVoice } from './types'
