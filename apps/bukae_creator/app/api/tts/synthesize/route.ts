import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit, enforceTtsDailyQuota, enforceCreditQuota } from '@/lib/api/rate-limit'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { getProvider } from '@/lib/tts/core/factory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SynthesizeRequest = {
  voiceTemplate: string // 직렬화된 VoiceInfo 또는 legacy 형식
  mode?: 'text' | 'markup'
  text?: string
  markup?: string
  speakingRate?: number
  pitch?: number
}

const MAX_PREVIEW_CHARS = 4500

export async function POST(request: Request) {
  try {
    // 로그인 사용자만 허용 + 레이트리밋
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'tts:synthesize', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

    const body = (await request.json()) as Partial<SynthesizeRequest>
    const voiceTemplate = String(body.voiceTemplate ?? '').trim()

    if (!voiceTemplate) {
      return NextResponse.json({ error: 'voiceTemplate이 필요합니다.' }, { status: 400 })
    }

    // VoiceInfo 파싱 (voiceTemplateHelpers 사용)
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(voiceTemplate)
    
    if (!voiceInfo) {
      return NextResponse.json({ error: '유효하지 않은 목소리 정보입니다.' }, { status: 400 })
    }

    // Provider 정보 로깅

    const mode = body.mode === 'markup' ? 'markup' : 'text'
    const text = String(body.text ?? '').trim()
    const markup = String(body.markup ?? '').trim()
    const inputText = mode === 'markup' ? markup : text

    if (!inputText) {
      return NextResponse.json(
        { error: mode === 'markup' ? 'markup이 필요합니다.' : 'text가 필요합니다.' },
        { status: 400 }
      )
    }
    if (inputText.length > MAX_PREVIEW_CHARS) {
      return NextResponse.json(
        { error: `미리듣기 텍스트는 최대 ${MAX_PREVIEW_CHARS}자까지 지원합니다.` },
        { status: 400 }
      )
    }

    // Provider별 쿼터 체크
    const quotaBlocked = await enforceTtsDailyQuota({
      userId: auth.userId,
      charCount: inputText.length,
      provider: voiceInfo.provider,
    })
    if (quotaBlocked) return quotaBlocked

    // 크레딧 차감 체크 (크레딧 시스템 활성화 시에만)
    const creditBlocked = await enforceCreditQuota({
      userId: auth.userId,
      provider: voiceInfo.provider,
      charCount: inputText.length,
      accessToken: auth.accessToken,
    })
    if (creditBlocked) return creditBlocked

    // Provider 팩토리를 사용하여 적절한 Provider 선택
    const provider = getProvider(voiceInfo.provider)

    // Provider의 synthesize 메서드 호출
    const speakingRate = typeof body.speakingRate === 'number' ? body.speakingRate : undefined
    const pitch = typeof body.pitch === 'number' ? body.pitch : undefined

    const result = await provider.synthesize({
      voiceId: voiceInfo.voiceId,
      text: mode === 'text' ? inputText : undefined,
      markup: mode === 'markup' ? inputText : undefined,
      mode,
      speakingRate,
      pitch,
    })

    const audioBuffer = result.audio

    // 문자 수 추적 (ElevenLabs인 경우)
    if (result.charCount) {
    }

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-TTS-Provider': voiceInfo.provider, // 응답 헤더에 제공자 정보 포함
        ...(rl.headers ?? {}),
      },
    })
  } catch (error) {
    console.error('[TTS] synthesize error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'TTS 합성 중 오류가 발생했어요.',
      },
      { status: 500 }
    )
  }
}


