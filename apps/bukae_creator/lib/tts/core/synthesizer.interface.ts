/**
 * TTS 합성 파라미터
 */
export interface SynthesizeParams {
  voiceId: string
  text?: string
  markup?: string
  mode: 'text' | 'markup'
  speakingRate?: number
  pitch?: number
  [key: string]: unknown // Provider별 추가 파라미터 허용
}

/**
 * TTS 합성 결과
 */
export interface SynthesizeResult {
  audio: Buffer
  charCount?: number
  requestId?: string
  [key: string]: unknown // Provider별 추가 메타데이터 허용
}

/**
 * TTS 합성기 인터페이스
 * 모든 Provider가 구현해야 하는 합성 로직
 */
export interface SynthesizerInterface {
  /**
   * 텍스트 또는 마크업을 음성으로 합성
   */
  synthesize(params: SynthesizeParams): Promise<SynthesizeResult>
}
