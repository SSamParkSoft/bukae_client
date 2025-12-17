import { NextResponse } from 'next/server'
import { getTextToSpeechClient, TTS_LANGUAGE_CODE } from '@/lib/tts/google-tts'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit, enforceTtsDailyQuota } from '@/lib/api/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SynthesizeRequest = {
  voiceName: string
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

    const voiceName = String(body.voiceName ?? '').trim()
    const mode = body.mode === 'markup' ? 'markup' : 'text'
    const text = String(body.text ?? '').trim()
    const markup = String(body.markup ?? '').trim()

    if (!voiceName) {
      return NextResponse.json({ error: 'voiceName이 필요합니다.' }, { status: 400 })
    }
    // 한국어 고정
    if (!voiceName.includes(TTS_LANGUAGE_CODE)) {
      return NextResponse.json({ error: '한국어(ko-KR) 목소리만 허용됩니다.' }, { status: 400 })
    }

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

    // 일일 쿼터(문자수/요청수) 소비: 실제 외부 호출 전에 차단
    const quotaBlocked = await enforceTtsDailyQuota({
      userId: auth.userId,
      charCount: inputText.length,
    })
    if (quotaBlocked) return quotaBlocked

    const speakingRate =
      typeof body.speakingRate === 'number' ? body.speakingRate : undefined
    const pitch = typeof body.pitch === 'number' ? body.pitch : undefined

    const client = getTextToSpeechClient()
    const [result] = await client.synthesizeSpeech({
      input: mode === 'markup' ? { markup: inputText } : { text: inputText },
      voice: {
        languageCode: TTS_LANGUAGE_CODE,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        ...(speakingRate !== undefined ? { speakingRate } : {}),
        ...(pitch !== undefined ? { pitch } : {}),
      },
    })

    const audioContent = result.audioContent
    if (!audioContent) {
      return NextResponse.json({ error: 'TTS 변환 결과가 비어있습니다.' }, { status: 500 })
    }

    // google client는 Uint8Array(Buffer) 또는 base64 string을 반환할 수 있음
    // Response body 타입(BodyInit) 호환을 위해 ArrayBuffer로 정규화
    const nodeBuf =
      typeof audioContent === 'string'
        ? Buffer.from(audioContent, 'base64')
        : Buffer.from(audioContent as Uint8Array)

    const bodyArrayBuffer = nodeBuf.buffer.slice(
      nodeBuf.byteOffset,
      nodeBuf.byteOffset + nodeBuf.byteLength
    )

    return new Response(bodyArrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        ...(rl.headers ?? {}),
      },
    })
  } catch (error) {
    console.error('[TTS] synthesize error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'TTS 합성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}


