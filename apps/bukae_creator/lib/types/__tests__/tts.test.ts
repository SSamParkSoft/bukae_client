import { test, expect } from 'vitest'
import {
  serializeVoiceInfo,
  deserializeVoiceInfo,
  parseLegacyVoiceTemplate,
  calculateCredits,
} from '../tts'
import type { GoogleVoiceInfo, ElevenLabsVoiceInfo } from '../tts'

const googleVoice: GoogleVoiceInfo = {
  provider: 'google',
  voiceId: 'ko-KR-Chirp3-HD-Achernar',
  displayName: 'Achernar',
  googleVoiceName: 'ko-KR-Chirp3-HD-Achernar',
  languageCodes: ['ko-KR'],
  ssmlGender: 'FEMALE',
}

const elevenLabsVoice: ElevenLabsVoiceInfo = {
  provider: 'elevenlabs',
  voiceId: 'abc123xyz',
  displayName: '한국어 목소리',
  elevenLabsVoiceId: 'abc123xyz',
  languageCodes: ['ko-KR'],
}

// serializeVoiceInfo + deserializeVoiceInfo (왕복 변환)

test('Google voice를 직렬화 후 역직렬화하면 원본과 동일하다', () => {
  const serialized = serializeVoiceInfo(googleVoice)
  const deserialized = deserializeVoiceInfo(serialized)
  expect(deserialized).toEqual(googleVoice)
})

test('ElevenLabs voice를 직렬화 후 역직렬화하면 원본과 동일하다', () => {
  const serialized = serializeVoiceInfo(elevenLabsVoice)
  const deserialized = deserializeVoiceInfo(serialized)
  expect(deserialized).toEqual(elevenLabsVoice)
})

test('직렬화된 문자열은 JSON이다', () => {
  const serialized = serializeVoiceInfo(googleVoice)
  expect(() => JSON.parse(serialized)).not.toThrow()
})

// deserializeVoiceInfo 예외 처리

test('잘못된 JSON이면 null을 반환한다', () => {
  expect(deserializeVoiceInfo('not-json')).toBeNull()
})

test('provider가 없는 JSON이면 null을 반환한다', () => {
  expect(deserializeVoiceInfo(JSON.stringify({ voiceId: 'abc' }))).toBeNull()
})

test('빈 문자열이면 null을 반환한다', () => {
  expect(deserializeVoiceInfo('')).toBeNull()
})

// parseLegacyVoiceTemplate

test('ko-KR 포함 문자열은 Google voice로 파싱된다', () => {
  const result = parseLegacyVoiceTemplate('ko-KR-Chirp3-HD-Achernar')
  expect(result?.provider).toBe('google')
  expect(result?.voiceId).toBe('ko-KR-Chirp3-HD-Achernar')
})

test('Chirp 포함 문자열은 Google voice로 파싱된다', () => {
  const result = parseLegacyVoiceTemplate('Chirp3-Voice')
  expect(result?.provider).toBe('google')
})

test('elevenlabs: prefix 문자열은 ElevenLabs voice로 파싱된다', () => {
  const result = parseLegacyVoiceTemplate('elevenlabs:abc123xyz')
  expect(result?.provider).toBe('elevenlabs')
  expect(result?.voiceId).toBe('abc123xyz')
})

test('알 수 없는 형식이면 null을 반환한다', () => {
  expect(parseLegacyVoiceTemplate('unknown-voice-format')).toBeNull()
})

// calculateCredits

test('Google TTS는 1자 = 1 크레딧', () => {
  expect(calculateCredits('google', 100)).toBe(100)
})

test('ElevenLabs는 1자 = 3 크레딧', () => {
  expect(calculateCredits('elevenlabs', 100)).toBe(300)
})

test('소수점 결과는 올림 처리된다', () => {
  expect(calculateCredits('google', 1)).toBe(1)
  expect(calculateCredits('elevenlabs', 1)).toBe(3)
})
