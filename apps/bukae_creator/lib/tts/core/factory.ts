import type { TtsProviderInterface } from './provider.interface'
import type { TtsProvider } from '@/lib/types/tts'
import { GoogleProvider } from '../providers/google'
import { ElevenLabsProvider } from '../providers/elevenlabs'
import { DemoProvider } from '../providers/demo'

/**
 * Provider 팩토리
 * provider 이름에 따라 적절한 Provider 인스턴스를 반환
 */
export function getProvider(provider: TtsProvider): TtsProviderInterface {
  switch (provider) {
    case 'google':
      return GoogleProvider
    case 'elevenlabs':
      return ElevenLabsProvider
    case 'demo':
      return DemoProvider
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

/**
 * 모든 Provider 목록 반환
 */
export function getAllProviders(): TtsProviderInterface[] {
  return [GoogleProvider, ElevenLabsProvider, DemoProvider]
}
