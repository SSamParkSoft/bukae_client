import { NextResponse } from 'next/server'
import type { VoiceInfo } from '@/lib/types/tts'
import { isGoogleVoice, isElevenLabsVoice, isDemoVoice } from '@/lib/types/tts'
import { getTextToSpeechClient, TTS_LANGUAGE_CODE } from '@/lib/tts/google-tts'
import { synthesizeSpeech as synthesizeElevenLabs } from '@/lib/tts/elevenlabs-tts'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit, enforceTtsDailyQuota, enforceCreditQuota } from '@/lib/api/rate-limit'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'

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

// 일레븐랩스는 SSML을 직접 지원하지 않으므로 마크업을 텍스트로 변환
function markupToText(markup: string): string {
  // 기본적인 SSML 태그 제거
  return markup
    .replace(/<speak[^>]*>/gi, '')
    .replace(/<\/speak>/gi, '')
    .replace(/<break[^>]*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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

    // 데모 목소리는 실제 TTS 합성 불가
    if (isDemoVoice(voiceInfo)) {
      return NextResponse.json(
        { error: '데모 목소리는 실제 TTS 합성을 지원하지 않습니다. 미리듣기만 가능합니다.' },
        { status: 400 }
      )
    }

    // 제공자별 쿼터 체크
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

    let audioBuffer: Buffer

    // 제공자별 TTS 합성
    if (isGoogleVoice(voiceInfo)) {
      // Google TTS 처리
      if (!voiceInfo.googleVoiceName.includes(TTS_LANGUAGE_CODE)) {
        return NextResponse.json({ error: '한국어(ko-KR) 목소리만 허용됩니다.' }, { status: 400 })
      }

      const speakingRate = typeof body.speakingRate === 'number' ? body.speakingRate : undefined
      const pitch = typeof body.pitch === 'number' ? body.pitch : undefined

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
        return NextResponse.json({ error: 'TTS 변환 결과가 비어있어요.' }, { status: 500 })
      }

      const nodeBuf =
        typeof audioContent === 'string'
          ? Buffer.from(audioContent, 'base64')
          : Buffer.from(audioContent as Uint8Array)
      
      audioBuffer = nodeBuf
    } else if (isElevenLabsVoice(voiceInfo)) {
      // ElevenLabs 처리
      const finalText = mode === 'markup' ? markupToText(inputText) : inputText

      const result = await synthesizeElevenLabs({
        voiceId: voiceInfo.elevenLabsVoiceId,
        text: finalText,
      })

      audioBuffer = result.audio

      // 문자 수 추적 (헤더에서 가져온 값 사용)
      if (result.charCount) {
        console.log(`[ElevenLabs] Character count: ${result.charCount}, Request ID: ${result.requestId}`)
      }
    } else {
      return NextResponse.json({ error: '지원하지 않는 TTS 제공자입니다.' }, { status: 400 })
    }

    const bodyArrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength
    )

    return new Response(bodyArrayBuffer, {
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


