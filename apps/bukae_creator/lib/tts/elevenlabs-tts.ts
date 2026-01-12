/**
 * 하위 호환성을 위한 리다이렉트 파일
 * 새로운 경로: @/lib/tts/providers/elevenlabs
 */
export { getElevenLabsClient, listElevenLabsVoices, filterKoreanVoices, toPublicVoiceInfo, synthesizeSpeech } from './providers/elevenlabs'
export type { ElevenLabsVoice } from './providers/elevenlabs/types'
