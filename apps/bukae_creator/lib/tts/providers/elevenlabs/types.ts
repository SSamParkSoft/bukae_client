/**
 * ElevenLabs Voice 타입 (v2 API 응답 구조에 맞춤)
 */
export type ElevenLabsVoice = {
  voice_id: string
  name: string
  category?: 'generated' | 'cloned' | 'premade' | 'professional' | 'famous' | 'high_quality'
  description?: string | null
  labels?: Record<string, string> // gender, age, accent 등의 정보가 labels에 포함될 수 있음
  preview_url?: string | null
  verified_languages?: Array<{
    language: string
    model_id: string
    accent?: string | null
    locale?: string | null
    preview_url?: string | null
  }> | null
}
