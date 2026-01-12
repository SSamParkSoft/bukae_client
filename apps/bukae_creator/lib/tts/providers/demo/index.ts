import type { TtsProviderInterface } from '@/lib/tts/core/provider.interface'
import type { SynthesizeParams, SynthesizeResult } from '@/lib/tts/core/synthesizer.interface'
import type { PublicVoiceInfo, VoiceInfo, DemoVoiceInfo } from '@/lib/types/tts'
import { getDemoVoicesAsPublicVoiceInfo, getDemoFilePathFromVoiceInfo } from './voices'
import { synthesize as synthesizeDemo } from './synthesizer'
import { publicVoiceInfoToVoiceInfo } from '@/lib/types/tts'

/**
 * Demo Provider 구현
 * 데모 목소리는 Google TTS로 변환하여 처리
 */
export const DemoProvider: TtsProviderInterface = {
  name: 'demo',
  displayName: 'Demo Voices',

  /**
   * 목소리 목록 조회
   */
  async listVoices(): Promise<PublicVoiceInfo[]> {
    return getDemoVoicesAsPublicVoiceInfo()
  },

  /**
   * voiceId로 목소리 정보 조회
   */
  getVoiceInfo(voiceId: string): VoiceInfo | null {
    const voices = getDemoVoicesAsPublicVoiceInfo()
    const voice = voices.find(v => v.voiceId === voiceId || v.displayName === voiceId)
    if (!voice) return null

    return publicVoiceInfoToVoiceInfo(voice)
  },

  /**
   * TTS 합성
   */
  async synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
    // voiceId로 VoiceInfo 생성
    const voiceInfo = this.getVoiceInfo(params.voiceId)
    if (!voiceInfo || voiceInfo.provider !== 'demo') {
      throw new Error('유효하지 않은 데모 목소리입니다.')
    }

    return synthesizeDemo({
      ...params,
      voiceInfo: voiceInfo as DemoVoiceInfo,
    })
  },

  /**
   * PublicVoiceInfo를 VoiceInfo로 변환
   */
  toVoiceInfo(publicVoice: PublicVoiceInfo): VoiceInfo | null {
    if (publicVoice.provider !== 'demo') {
      return null
    }
    return publicVoiceInfoToVoiceInfo(publicVoice)
  },
}

// 기존 export 유지 (하위 호환성)
export { getDemoVoicesAsPublicVoiceInfo, getDemoFilePathFromVoiceInfo } from './voices'
export type { DemoVoice } from './types'
