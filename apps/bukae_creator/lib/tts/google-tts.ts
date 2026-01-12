/**
 * 하위 호환성을 위한 리다이렉트 파일
 * 새로운 경로: @/lib/tts/providers/google
 */
export { getTextToSpeechClient, filterKoreanVoices, toPublicVoiceInfo, TTS_LANGUAGE_CODE } from './providers/google'
export type { GoogleTtsVoice } from './providers/google/types'
