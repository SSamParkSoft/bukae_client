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

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0

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

    // limit이 지정된 경우: Provider별로 균등하게 분배하여 반환
    let finalVoices = allVoices
    if (limit !== undefined) {
      // Provider별로 그룹화
      const googleVoices = allVoices.filter(v => v.provider === 'google' || !v.provider)
      const elevenlabsVoices = allVoices.filter(v => v.provider === 'elevenlabs')
      
      // 각 Provider에서 가져올 개수 계산 (처음 로드 시 균등 분배)
      if (offset === 0) {
        // 처음 로드: 각 Provider에서 일부씩 가져오기
        const perProviderLimit = Math.ceil(limit / 2) // 각 Provider에서 가져올 개수
        const googleSlice = googleVoices.slice(0, perProviderLimit)
        const elevenlabsSlice = elevenlabsVoices.slice(0, perProviderLimit)
        finalVoices = [...googleSlice, ...elevenlabsSlice].slice(0, limit)
      } else {
        // 추가 로드: 전체 목록에서 offset부터 limit만큼 가져오기
        const endIndex = Math.min(offset + limit, allVoices.length)
        finalVoices = allVoices.slice(offset, endIndex)
      }
    }

    return NextResponse.json(
      {
        languageCode: TTS_LANGUAGE_CODE,
        voices: finalVoices,
        totalVoices: allVoices.length, // 전체 음성 개수
        hasMore: limit !== undefined ? offset + finalVoices.length < allVoices.length : false,
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


