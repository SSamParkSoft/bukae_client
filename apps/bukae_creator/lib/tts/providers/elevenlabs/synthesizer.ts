import type { SynthesizeParams, SynthesizeResult } from '@/lib/tts/core/synthesizer.interface'
import type { ElevenLabsVoiceInfo } from '@/lib/types/tts'
import { getElevenLabsClient } from './client'
import { markupToText } from '@/lib/tts/core/utils'

/**
 * ElevenLabs TTS 합성 로직
 */
export async function synthesize(params: SynthesizeParams & { voiceInfo: ElevenLabsVoiceInfo }): Promise<SynthesizeResult> {
  const { voiceInfo, mode, text, markup } = params

  const inputText = mode === 'markup' ? markup : text
  if (!inputText) {
    throw new Error(mode === 'markup' ? 'markup이 필요합니다.' : 'text가 필요합니다.')
  }

  // ElevenLabs는 SSML을 직접 지원하지 않으므로 마크업을 텍스트로 변환
  const finalText = mode === 'markup' ? markupToText(inputText) : inputText

  const client = getElevenLabsClient()
  
  // withRawResponse()로 헤더 정보도 가져오기
  const { data, rawResponse } = await client.textToSpeech
    .convert(voiceInfo.elevenLabsVoiceId, {
      text: finalText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
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
