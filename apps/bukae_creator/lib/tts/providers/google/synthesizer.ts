import type { SynthesizeParams, SynthesizeResult } from '@/lib/tts/core/synthesizer.interface'
import type { GoogleVoiceInfo } from '@/lib/types/tts'
import { getTextToSpeechClient } from './client'
import { TTS_LANGUAGE_CODE } from './constants'

/**
 * Google TTS 합성 로직
 */
export async function synthesize(params: SynthesizeParams & { voiceInfo: GoogleVoiceInfo }): Promise<SynthesizeResult> {
  const { voiceInfo, mode, text, markup, speakingRate, pitch } = params

  if (!voiceInfo.googleVoiceName.includes(TTS_LANGUAGE_CODE)) {
    throw new Error('한국어(ko-KR) 목소리만 허용됩니다.')
  }

  const inputText = mode === 'markup' ? markup : text
  if (!inputText) {
    throw new Error(mode === 'markup' ? 'markup이 필요합니다.' : 'text가 필요합니다.')
  }

  const client = getTextToSpeechClient()
  const [result] = await client.synthesizeSpeech({
    input: mode === 'markup' ? { markup: inputText } : { text: inputText },
    voice: {
      languageCode: TTS_LANGUAGE_CODE,
      name: voiceInfo.googleVoiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      ...(speakingRate !== undefined ? { speakingRate } : {}),
      ...(pitch !== undefined ? { pitch } : {}),
    },
  })

  const audioContent = result.audioContent
  if (!audioContent) {
    throw new Error('TTS 변환 결과가 비어있어요.')
  }

  const nodeBuf =
    typeof audioContent === 'string'
      ? Buffer.from(audioContent, 'base64')
      : Buffer.from(audioContent as Uint8Array)

  return {
    audio: nodeBuf,
  }
}
