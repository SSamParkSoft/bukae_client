import { NextResponse } from 'next/server'
import type { PublicVoiceInfo } from '@/lib/types/tts'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { getAllProviders } from '@/lib/tts/core/factory'
import { TTS_LANGUAGE_CODE } from '@/lib/tts/providers/google/constants'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // 로그인 사용자만 허용 + 레이트리밋 (voices도 외부 API 호출이므로 보호)
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'tts:voices', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

    const allVoices: PublicVoiceInfo[] = []

    // 모든 Provider에서 목소리 수집
    const providers = getAllProviders()
    console.log(`[TTS] Loading voices from ${providers.length} providers:`, providers.map(p => p.name))
    
    for (const provider of providers) {
      try {
        console.log(`[TTS] Loading voices from ${provider.name}...`)
        const voices = await provider.listVoices()
        console.log(`[TTS] ${provider.name} returned ${voices.length} voices`)
        allVoices.push(...voices)
      } catch (error) {
        console.error(`[TTS] ${provider.name} voices error:`, error)
        if (error instanceof Error) {
          console.error(`[TTS] ${provider.name} error message:`, error.message)
          console.error(`[TTS] ${provider.name} error stack:`, error.stack)
        }
        // 하나의 Provider 실패해도 다른 Provider는 계속 진행
      }
    }
    
    console.log(`[TTS] Total voices loaded: ${allVoices.length} (Google: ${allVoices.filter(v => v.provider === 'google' || !v.provider).length}, ElevenLabs: ${allVoices.filter(v => v.provider === 'elevenlabs').length})`)

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


