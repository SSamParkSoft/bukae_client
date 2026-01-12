import { NextResponse } from 'next/server'
import { filterChirpKoreanVoices, getTextToSpeechClient, toPublicVoiceInfo, TTS_LANGUAGE_CODE } from '@/lib/tts/google-tts'
import { listElevenLabsVoices, filterKoreanVoices, toPublicVoiceInfo as toElevenLabsVoiceInfo } from '@/lib/tts/elevenlabs-tts'
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

    const allVoices: Array<ReturnType<typeof toPublicVoiceInfo> | ReturnType<typeof toElevenLabsVoiceInfo>> = []

    // Google TTS 목소리
    try {
      const client = getTextToSpeechClient()
      const [result] = await client.listVoices({ languageCode: TTS_LANGUAGE_CODE })
      const voices = result.voices ?? []
      const filtered = filterChirpKoreanVoices(voices)
        .map(toPublicVoiceInfo)
        .filter(Boolean)
      allVoices.push(...filtered)
    } catch (error) {
      console.error('[TTS] Google voices error:', error)
      // Google TTS 실패해도 일레븐랩스는 계속 진행
    }

    // ElevenLabs 목소리
    try {
      const elevenLabsVoices = await listElevenLabsVoices()
      const filtered = filterKoreanVoices(elevenLabsVoices)
        .map(toElevenLabsVoiceInfo)
        .filter(Boolean)
      allVoices.push(...filtered)
    } catch (error) {
      console.error('[TTS] ElevenLabs voices error:', error)
      // ElevenLabs 실패해도 Google은 이미 추가됨
    }

    return NextResponse.json(
      {
        languageCode: TTS_LANGUAGE_CODE,
        voices: allVoices,
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
            : 'TTS 목소리 목록 조회 중 오류가 발생했어요.',
      },
      { status: 500 }
    )
  }
}


