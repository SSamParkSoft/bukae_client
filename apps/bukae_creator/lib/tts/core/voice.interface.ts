import type { PublicVoiceInfo, VoiceInfo } from '@/lib/types/tts'

/**
 * 목소리 정보 인터페이스
 * 모든 Provider가 공통으로 사용하는 목소리 정보 타입
 */
export interface VoiceInterface {
  /**
   * PublicVoiceInfo를 VoiceInfo로 변환
   */
  toVoiceInfo(publicVoice: PublicVoiceInfo): VoiceInfo | null

  /**
   * Provider별 목소리 필터링 (선택사항)
   */
  filterVoices?(voices: unknown[]): unknown[]
}
