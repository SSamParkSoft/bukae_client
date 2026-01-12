import type { PublicVoiceInfo, VoiceInfo, TtsProvider } from '@/lib/types/tts'
import type { SynthesizerInterface, SynthesizeParams, SynthesizeResult } from './synthesizer.interface'
import type { VoiceInterface } from './voice.interface'

/**
 * TTS Provider 인터페이스
 * 모든 TTS Provider가 구현해야 하는 기본 인터페이스
 */
export interface TtsProviderInterface extends SynthesizerInterface, VoiceInterface {
  /**
   * Provider 이름 (고유 식별자)
   */
  readonly name: TtsProvider

  /**
   * Provider 표시 이름 (UI용)
   */
  readonly displayName: string

  /**
   * 목소리 목록 조회
   */
  listVoices(): Promise<PublicVoiceInfo[]>

  /**
   * voiceId로 목소리 정보 조회
   */
  getVoiceInfo(voiceId: string): VoiceInfo | null
}
