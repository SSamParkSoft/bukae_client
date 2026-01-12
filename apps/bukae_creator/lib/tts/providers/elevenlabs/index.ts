import type { TtsProviderInterface } from '@/lib/tts/core/provider.interface'
import type { SynthesizeParams, SynthesizeResult } from '@/lib/tts/core/synthesizer.interface'
import type { PublicVoiceInfo, VoiceInfo, ElevenLabsVoiceInfo } from '@/lib/types/tts'
import { getElevenLabsClient } from './client'
import { listVoices, filterKoreanVoices, toPublicVoiceInfo } from './voices'
import { synthesize as synthesizeElevenLabs } from './synthesizer'
import { publicVoiceInfoToVoiceInfo } from '@/lib/types/tts'

/**
 * ElevenLabs Provider 구현
 */
export const ElevenLabsProvider: TtsProviderInterface = {
  name: 'elevenlabs',
  displayName: 'ElevenLabs',

  /**
   * 목소리 목록 조회
   */
  async listVoices(): Promise<PublicVoiceInfo[]> {
    const voices = await listVoices()
    const filtered = filterKoreanVoices(voices)
      .map(toPublicVoiceInfo)
      .filter(Boolean) as PublicVoiceInfo[]
    return filtered
  },

  /**
   * voiceId로 목소리 정보 조회
   */
  getVoiceInfo(voiceId: string): VoiceInfo | null {
    // ElevenLabs는 voiceId가 곧 elevenLabsVoiceId
    return {
      provider: 'elevenlabs',
      voiceId: voiceId,
      displayName: voiceId.substring(0, 12) + '...',
      elevenLabsVoiceId: voiceId,
      languageCodes: ['ko-KR'],
    } as ElevenLabsVoiceInfo
  },

  /**
   * TTS 합성
   */
  async synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
    // voiceId로 VoiceInfo 생성
    const voiceInfo = this.getVoiceInfo(params.voiceId)
    if (!voiceInfo || voiceInfo.provider !== 'elevenlabs') {
      throw new Error('유효하지 않은 ElevenLabs 목소리입니다.')
    }

    return synthesizeElevenLabs({
      ...params,
      voiceInfo: voiceInfo as ElevenLabsVoiceInfo,
    })
  },

  /**
   * PublicVoiceInfo를 VoiceInfo로 변환
   */
  toVoiceInfo(publicVoice: PublicVoiceInfo): VoiceInfo | null {
    if (publicVoice.provider !== 'elevenlabs') {
      return null
    }
    return publicVoiceInfoToVoiceInfo(publicVoice)
  },
}

// 기존 export 유지 (하위 호환성)
export { getElevenLabsClient } from './client'
export { listVoices as listElevenLabsVoices, filterKoreanVoices, toPublicVoiceInfo } from './voices'
export { synthesize as synthesizeSpeech } from './synthesizer'
export type { ElevenLabsVoice } from './types'
