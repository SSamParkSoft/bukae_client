import { NextResponse } from 'next/server'
import { filterChirpKoreanVoices, getTextToSpeechClient, toPublicVoiceInfo, TTS_LANGUAGE_CODE } from '@/lib/tts/google-tts'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 로그인 사용자만 허용 + 레이트리밋 (voices도 외부 API 호출이므로 보호)
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'tts:voices', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

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
          ...(rl.headers ?? {}),
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


