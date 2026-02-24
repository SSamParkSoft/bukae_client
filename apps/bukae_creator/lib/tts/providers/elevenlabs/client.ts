import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

let clientSingleton: ElevenLabsClient | null = null

function getApiKeyFromEnv(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY 환경 변수가 설정되어 있지 않습니다.')
  }
  return apiKey
}

/**
 * ElevenLabs 클라이언트 싱글톤 인스턴스 반환
 */
export function getElevenLabsClient(): ElevenLabsClient {
  if (clientSingleton) {
    return clientSingleton
  }

  try {
    const apiKey = getApiKeyFromEnv()
    clientSingleton = new ElevenLabsClient({
      apiKey,
    })
    return clientSingleton
  } catch (error) {
    console.error('[ElevenLabs] Failed to create client:', error)
    throw error
  }
}
