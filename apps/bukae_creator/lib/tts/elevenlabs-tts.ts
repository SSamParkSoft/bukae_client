import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import type { PublicVoiceInfo } from '@/lib/types/tts'

export const TTS_LANGUAGE_CODE = 'ko-KR' as const

export type ElevenLabsVoice = {
  voice_id: string
  name: string
  category?: string
  description?: string
  gender?: string
  age?: string
  accent?: string
  use_case?: string
  language?: string
}

let clientSingleton: ElevenLabsClient | null = null

function getApiKeyFromEnv(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY 환경 변수가 설정되어 있지 않습니다.')
  }
  return apiKey
}

export function getElevenLabsClient(): ElevenLabsClient {
  if (clientSingleton) return clientSingleton

  const apiKey = getApiKeyFromEnv()
  clientSingleton = new ElevenLabsClient({
    apiKey,
  })

  return clientSingleton
}

export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const client = getElevenLabsClient()
  const response = await client.voices.getAll()
  return response.voices || []
}

export function filterKoreanVoices(voices: ElevenLabsVoice[]): ElevenLabsVoice[] {
  // 일레븐랩스는 다국어를 지원하므로 모든 음성 반환
  // 필요시 language 필드로 필터링 가능
  // 현재는 모든 음성을 반환 (다국어 지원)
  return voices
}

export function toPublicVoiceInfo(v: ElevenLabsVoice): PublicVoiceInfo | null {
  if (!v.voice_id || !v.name) return null

  // gender 매핑
  let ssmlGender: 'MALE' | 'FEMALE' | undefined
  if (v.gender) {
    const genderLower = v.gender.toLowerCase()
    if (genderLower.includes('female') || genderLower.includes('여성')) {
      ssmlGender = 'FEMALE'
    } else if (genderLower.includes('male') || genderLower.includes('남성')) {
      ssmlGender = 'MALE'
    }
  }

  return {
    name: `elevenlabs:${v.voice_id}`, // provider 구분을 위한 prefix (직렬화용)
    languageCodes: [TTS_LANGUAGE_CODE],
    ssmlGender,
    provider: 'elevenlabs' as const,
    voiceId: v.voice_id,
    displayName: v.name, // 실제 이름 (UI 표시용)
  }
}

export async function synthesizeSpeech({
  voiceId,
  text,
  modelId = 'eleven_multilingual_v2',
  stability = 0.5,
  similarityBoost = 0.75,
}: {
  voiceId: string
  text: string
  modelId?: string
  stability?: number
  similarityBoost?: number
}): Promise<{ audio: Buffer; charCount?: number; requestId?: string }> {
  const client = getElevenLabsClient()
  
  // withRawResponse()로 헤더 정보도 가져오기
  const { data, rawResponse } = await client.textToSpeech
    .convert(voiceId, {
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    })
    .withRawResponse()

  // Stream을 Buffer로 변환
  const chunks: Uint8Array[] = []
  for await (const chunk of data) {
    chunks.push(chunk)
  }

  const audioBuffer = Buffer.concat(chunks)

  // 헤더에서 메타데이터 추출
  const charCount = rawResponse.headers.get('x-character-count')
    ? parseInt(rawResponse.headers.get('x-character-count')!, 10)
    : undefined
  const requestId = rawResponse.headers.get('request-id') || undefined

  return {
    audio: audioBuffer,
    charCount,
    requestId,
  }
}
