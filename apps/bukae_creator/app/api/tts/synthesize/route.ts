import { NextResponse } from 'next/server'
import { getTextToSpeechClient, TTS_LANGUAGE_CODE } from '@/lib/tts/google-tts'

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
    let bodyBytes: Uint8Array
    if (typeof audioContent === 'string') {
      bodyBytes = Buffer.from(audioContent, 'base64')
    } else {
      bodyBytes = audioContent as Uint8Array
    }

    return new Response(bodyBytes, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
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


