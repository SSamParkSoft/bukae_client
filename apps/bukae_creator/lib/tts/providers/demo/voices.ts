import type { PublicVoiceInfo } from '@/lib/types/tts'
import type { DemoVoice } from './types'

// 남성 목소리
const maleVoices: DemoVoice[] = [
  { name: 'Adam', fileName: 'adam_test.wav', gender: 'MALE' },
  { name: 'Bill', fileName: 'bill_test.wav', gender: 'MALE' },
  { name: 'Brian', fileName: 'brian_test.wav', gender: 'MALE' },
  { name: 'Callum', fileName: 'callum_test.wav', gender: 'MALE' },
  { name: 'Charlie', fileName: 'charlie_test.wav', gender: 'MALE' },
  { name: 'Chris', fileName: 'chris_test.wav', gender: 'MALE' },
  { name: 'Daniel', fileName: 'daniel_test.wav', gender: 'MALE' },
  { name: 'Eric', fileName: 'eric_test.wav', gender: 'MALE' },
  { name: 'Harry', fileName: 'harry_test.wav', gender: 'MALE' },
  { name: 'Liam', fileName: 'liam_test.wav', gender: 'MALE' },
  { name: 'Roger', fileName: 'roger_test.wav', gender: 'MALE' },
  { name: 'Will', fileName: 'will_test.wav', gender: 'MALE' },
]

// 여성 목소리
const femaleVoices: DemoVoice[] = [
  { name: 'Alice', fileName: 'alice_test.wav', gender: 'FEMALE' },
  { name: 'Jessica', fileName: 'jessica_test.wav', gender: 'FEMALE' },
  { name: 'Luara', fileName: 'luara_test.wav', gender: 'FEMALE' },
  { name: 'Lily', fileName: 'lily_test.wav', gender: 'FEMALE' },
  { name: 'Matilda', fileName: 'matilda_test.wav', gender: 'FEMALE' },
  { name: 'River', fileName: 'river_test.wav', gender: 'FEMALE' },
  { name: 'Sarah', fileName: 'sarah_test.wav', gender: 'FEMALE' },
]

/**
 * 데모 목소리를 PublicVoiceInfo 형식으로 변환
 */
export function getDemoVoicesAsPublicVoiceInfo(): PublicVoiceInfo[] {
  const allVoices = [...maleVoices, ...femaleVoices]
  
  return allVoices.map((voice): PublicVoiceInfo => ({
    name: `demo:${voice.name}`,
    languageCodes: ['ko-KR'],
    ssmlGender: voice.gender,
    provider: 'demo',
    voiceId: voice.name,
    displayName: voice.name,
  }))
}

/**
 * 데모 파일 경로 가져오기 (Premium 데모는 premium 폴더에)
 */
export function getDemoFilePath(fileName: string): string {
  return `/voice-demos/premium/${fileName}`
}

/**
 * 목소리 이름으로 데모 파일 경로 가져오기
 */
export function getDemoFilePathByName(voiceName: string): string | null {
  const allVoices = [...maleVoices, ...femaleVoices]
  const voice = allVoices.find(v => v.name === voiceName)
  return voice ? getDemoFilePath(voice.fileName) : null
}

/**
 * PublicVoiceInfo에서 데모 파일 경로 가져오기
 */
export function getDemoFilePathFromVoiceInfo(voice: PublicVoiceInfo): string | null {
  if (voice.provider !== 'demo') return null
  const voiceName = voice.displayName || voice.voiceId || voice.name.replace('demo:', '')
  return getDemoFilePathByName(voiceName)
}

export const demoVoices = {
  male: maleVoices,
  female: femaleVoices,
  all: [...maleVoices, ...femaleVoices],
}
