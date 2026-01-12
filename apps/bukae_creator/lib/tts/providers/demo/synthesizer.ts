import type { SynthesizeParams, SynthesizeResult } from '@/lib/tts/core/synthesizer.interface'
import type { DemoVoiceInfo, GoogleVoiceInfo } from '@/lib/types/tts'
import { GoogleProvider } from '../google'

/**
 * 데모 목소리 합성 로직
 * 데모 목소리는 Google TTS Chirp3 HD로 변환하여 처리
 */
export async function synthesize(params: SynthesizeParams & { voiceInfo: DemoVoiceInfo }): Promise<SynthesizeResult> {
  const { voiceInfo } = params

  // 데모 목소리를 Google TTS Chirp3 HD 목소리로 변환
  // 성별에 따라 적절한 Chirp3 HD 목소리 선택 (마크업 지원 필요)
  const defaultVoiceName = voiceInfo.ssmlGender === 'FEMALE' 
    ? 'ko-KR-Chirp3-HD-Achernar'  // 여성 Chirp3 HD 목소리
    : 'ko-KR-Chirp3-HD-Achird'     // 남성 Chirp3 HD 목소리

  // Google Provider를 사용하여 합성
  const googleVoiceInfo: GoogleVoiceInfo = {
    provider: 'google',
    voiceId: defaultVoiceName,
    displayName: voiceInfo.displayName, // 원본 데모 이름 유지
    googleVoiceName: defaultVoiceName,
    languageCodes: voiceInfo.languageCodes,
    ssmlGender: voiceInfo.ssmlGender,
  }

  // Google Provider의 synthesize 호출
  return GoogleProvider.synthesize({
    ...params,
    voiceId: defaultVoiceName,
  })
}
