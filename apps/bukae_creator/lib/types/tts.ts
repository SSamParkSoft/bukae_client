// TTS 제공자 타입
export type TtsProvider = 'google' | 'elevenlabs' | 'demo'

// 크레딧 차감 비율 설정
export const CREDIT_MULTIPLIER: Record<TtsProvider, number> = {
  google: 1,        // Google TTS: 1자 = 1 크레딧
  elevenlabs: 3,    // ElevenLabs: 1자 = 3 크레딧 (비싸므로 더 높은 비율)
  demo: 0,          // 데모: 크레딧 차감 없음 (실제 합성 불가)
}

// API 응답용 통합 타입 (모든 파일에서 공유)
export type PublicVoiceInfo = {
  name: string
  languageCodes: string[]
  ssmlGender?: string
  naturalSampleRateHertz?: number
  provider?: 'google' | 'elevenlabs' | 'demo'
  voiceId?: string // 일레븐랩스용 또는 데모용
  displayName?: string // 일레븐랩스 실제 이름 또는 데모 이름
}

// 크레딧 사용 결과
export interface CreditUsageResult {
  success: boolean
  creditsUsed: number
  remainingCredits: number | null // null이면 무제한
  error?: string
}

// 목소리 정보 기본 타입
export interface BaseVoiceInfo {
  provider: TtsProvider
  voiceId: string // 실제 음성 ID
  displayName: string // UI에 표시할 이름
  languageCodes: string[]
  ssmlGender?: 'MALE' | 'FEMALE'
  naturalSampleRateHertz?: number
}

// Google TTS 전용 정보
export interface GoogleVoiceInfo extends BaseVoiceInfo {
  provider: 'google'
  googleVoiceName: string // Google의 전체 voice name (예: ko-KR-Chirp3-HD-Achernar)
}

// ElevenLabs 전용 정보
export interface ElevenLabsVoiceInfo extends BaseVoiceInfo {
  provider: 'elevenlabs'
  elevenLabsVoiceId: string // ElevenLabs의 voice_id
}

// 데모 전용 정보
export interface DemoVoiceInfo extends BaseVoiceInfo {
  provider: 'demo'
  demoFileName: string // 데모 파일명 (예: adam_test.wav)
}

// 통합 타입 (Discriminated Union)
export type VoiceInfo = GoogleVoiceInfo | ElevenLabsVoiceInfo | DemoVoiceInfo

// 타입 가드 함수들
export function isGoogleVoice(voice: VoiceInfo): voice is GoogleVoiceInfo {
  return voice.provider === 'google'
}

export function isElevenLabsVoice(voice: VoiceInfo): voice is ElevenLabsVoiceInfo {
  return voice.provider === 'elevenlabs'
}

export function isDemoVoice(voice: VoiceInfo): voice is DemoVoiceInfo {
  return voice.provider === 'demo'
}

// 크레딧 계산 함수
export function calculateCredits(provider: TtsProvider, charCount: number): number {
  return Math.ceil(charCount * CREDIT_MULTIPLIER[provider])
}

// VoiceInfo를 문자열로 직렬화 (저장용)
export function serializeVoiceInfo(voice: VoiceInfo): string {
  return JSON.stringify({
    provider: voice.provider,
    voiceId: voice.voiceId,
    displayName: voice.displayName,
    languageCodes: voice.languageCodes,
    ssmlGender: voice.ssmlGender,
    naturalSampleRateHertz: voice.naturalSampleRateHertz,
    // provider별 추가 정보
    ...(isGoogleVoice(voice) && { googleVoiceName: voice.googleVoiceName }),
    ...(isElevenLabsVoice(voice) && { elevenLabsVoiceId: voice.elevenLabsVoiceId }),
    ...(isDemoVoice(voice) && { demoFileName: voice.demoFileName }),
  })
}

// 문자열에서 VoiceInfo로 역직렬화
export function deserializeVoiceInfo(serialized: string): VoiceInfo | null {
  try {
    const parsed = JSON.parse(serialized)
    if (parsed.provider === 'google') {
      return {
        provider: 'google',
        voiceId: parsed.voiceId,
        displayName: parsed.displayName,
        googleVoiceName: parsed.googleVoiceName,
        languageCodes: parsed.languageCodes || ['ko-KR'],
        ssmlGender: parsed.ssmlGender,
        naturalSampleRateHertz: parsed.naturalSampleRateHertz,
      } as GoogleVoiceInfo
    } else if (parsed.provider === 'elevenlabs') {
      return {
        provider: 'elevenlabs',
        voiceId: parsed.voiceId,
        displayName: parsed.displayName,
        elevenLabsVoiceId: parsed.elevenLabsVoiceId,
        languageCodes: parsed.languageCodes || ['ko-KR'],
        ssmlGender: parsed.ssmlGender,
      } as ElevenLabsVoiceInfo
    } else if (parsed.provider === 'demo') {
      return {
        provider: 'demo',
        voiceId: parsed.voiceId,
        displayName: parsed.displayName,
        demoFileName: parsed.demoFileName,
        languageCodes: parsed.languageCodes || ['ko-KR'],
        ssmlGender: parsed.ssmlGender,
      } as DemoVoiceInfo
    }
    return null
  } catch {
    return null
  }
}

// 하위 호환성: 기존 문자열 형식에서 VoiceInfo로 변환
export function parseLegacyVoiceTemplate(legacy: string): VoiceInfo | null {
  // 기존 Google TTS 형식 (ko-KR-Chirp3-HD-Achernar)
  if (legacy.includes('ko-KR') || legacy.includes('Chirp')) {
    return {
      provider: 'google',
      voiceId: legacy,
      displayName: legacy.split('-').pop() || legacy,
      googleVoiceName: legacy,
      languageCodes: ['ko-KR'],
    } as GoogleVoiceInfo
  }
  
  // 일레븐랩스 prefix 형식 (elevenlabs:voice_id)
  if (legacy.startsWith('elevenlabs:')) {
    const voiceId = legacy.replace(/^elevenlabs:/, '')
    return {
      provider: 'elevenlabs',
      voiceId: voiceId,
      displayName: voiceId.substring(0, 12) + '...',
      elevenLabsVoiceId: voiceId,
      languageCodes: ['ko-KR'],
    } as ElevenLabsVoiceInfo
  }
  
  return null
}

// PublicVoiceInfo를 VoiceInfo로 변환 (컴포넌트에서 사용)
export function publicVoiceInfoToVoiceInfo(publicVoice: PublicVoiceInfo): VoiceInfo | null {
  if (publicVoice.provider === 'elevenlabs' && publicVoice.voiceId) {
    return {
      provider: 'elevenlabs',
      voiceId: publicVoice.voiceId,
      displayName: publicVoice.displayName || publicVoice.name.replace(/^elevenlabs:/, ''),
      elevenLabsVoiceId: publicVoice.voiceId,
      languageCodes: publicVoice.languageCodes,
      ssmlGender: publicVoice.ssmlGender as 'MALE' | 'FEMALE' | undefined,
    } as ElevenLabsVoiceInfo
  } else if (publicVoice.provider === 'demo') {
    // 데모 목소리 처리
    const voiceName = publicVoice.displayName || publicVoice.voiceId || publicVoice.name.replace(/^demo:/, '')
    // 파일명은 voiceId나 displayName에서 추론 (demo-voices.ts의 구조에 맞춤)
    // 실제 파일명은 {name}_test.wav 형식
    const demoFileName = `${voiceName.toLowerCase()}_test.wav`
    return {
      provider: 'demo',
      voiceId: voiceName,
      displayName: voiceName,
      demoFileName: demoFileName,
      languageCodes: publicVoice.languageCodes,
      ssmlGender: publicVoice.ssmlGender as 'MALE' | 'FEMALE' | undefined,
    } as DemoVoiceInfo
  } else {
    // Google TTS 또는 기본값
    return {
      provider: 'google',
      voiceId: publicVoice.name,
      displayName: publicVoice.name.split('-').pop() || publicVoice.name,
      googleVoiceName: publicVoice.name,
      languageCodes: publicVoice.languageCodes,
      ssmlGender: publicVoice.ssmlGender as 'MALE' | 'FEMALE' | undefined,
    } as GoogleVoiceInfo
  }
}
