import { NextResponse } from 'next/server'
import { filterChirpKoreanVoices, getTextToSpeechClient, toPublicVoiceInfo, TTS_LANGUAGE_CODE } from '@/lib/tts/google-tts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = getTextToSpeechClient()
    const [result] = await client.listVoices({ languageCode: TTS_LANGUAGE_CODE })

    const voices = result.voices ?? []
    const filtered = filterChirpKoreanVoices(voices)
      .map(toPublicVoiceInfo)
      .filter(Boolean)

    return NextResponse.json(
      {
        languageCode: TTS_LANGUAGE_CODE,
        voices: filtered,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('[TTS] voices error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'TTS 목소리 목록 조회 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}


