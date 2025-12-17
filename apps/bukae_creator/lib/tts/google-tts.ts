import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech'

export const TTS_LANGUAGE_CODE = 'ko-KR' as const

export type GoogleTtsVoice = protos.google.cloud.texttospeech.v1.IVoice

export type PublicVoiceInfo = {
  name: string
  languageCodes: string[]
  ssmlGender?: string
  naturalSampleRateHertz?: number
}

let clientSingleton: TextToSpeechClient | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getServiceAccountFromEnv(): {
  projectId?: string
  client_email: string
  private_key: string
} {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 환경 변수가 설정되어 있지 않습니다.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON이 올바른 JSON 형식이 아닙니다.')
  }

  if (!isRecord(parsed)) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON이 객체(JSON) 형식이 아닙니다.')
  }

  const client_email = String(parsed.client_email ?? '')
  const private_key_raw = String(parsed.private_key ?? '')
  const private_key = private_key_raw.replace(/\\n/g, '\n')
  const projectId = parsed.project_id ? String(parsed.project_id) : undefined

  if (!client_email || !private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON에 client_email/private_key가 없습니다.')
  }

  return { projectId, client_email, private_key }
}

export function getTextToSpeechClient(): TextToSpeechClient {
  if (clientSingleton) return clientSingleton

  const sa = getServiceAccountFromEnv()
  clientSingleton = new TextToSpeechClient({
    projectId: sa.projectId,
    credentials: {
      client_email: sa.client_email,
      private_key: sa.private_key,
    },
  })

  return clientSingleton
}

function parseCsvEnv(name: string): string[] {
  const raw = process.env[name]
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function filterChirpKoreanVoices(voices: GoogleTtsVoice[]): GoogleTtsVoice[] {
  const allowedExact = parseCsvEnv('TTS_ALLOWED_VOICES') // exact voice.name allowlist
  const allowedPrefix = process.env.TTS_ALLOWED_VOICE_NAME_PREFIX?.trim()
  const allowedContains =
    parseCsvEnv('TTS_ALLOWED_VOICE_NAME_CONTAINS').length > 0
      ? parseCsvEnv('TTS_ALLOWED_VOICE_NAME_CONTAINS')
      : ['Chirp3', 'Chirp'] // 기본값: Chirp3 우선, 없으면 Chirp 계열

  const isAllowedByRule = (voiceName: string) => {
    if (allowedExact.length > 0) {
      return allowedExact.includes(voiceName)
    }
    if (allowedPrefix && voiceName.startsWith(allowedPrefix)) return true
    return allowedContains.some((needle) => voiceName.includes(needle))
  }

  const filtered = voices.filter((v) => {
    const name = v.name ?? ''
    const languageCodes = v.languageCodes ?? []
    if (!name) return false
    if (!languageCodes.includes(TTS_LANGUAGE_CODE)) return false
    // ko-KR 고정(언어 코드가 포함되어도, 이름이 아예 다른 언어인 경우 방지)
    if (!name.startsWith(`${TTS_LANGUAGE_CODE}-`) && !name.startsWith(`${TTS_LANGUAGE_CODE}_`)) {
      // 일부 naming이 다를 수 있어 startsWith 강제 대신, ko-KR 언어코드 포함만으로도 통과
      // 단, 안전을 위해 최소한 ko-KR을 포함하지 않으면 제외
      if (!name.includes(TTS_LANGUAGE_CODE)) return false
    }
    return isAllowedByRule(name)
  })

  return filtered.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
}

export function toPublicVoiceInfo(v: GoogleTtsVoice): PublicVoiceInfo | null {
  if (!v.name) return null
  return {
    name: v.name,
    languageCodes: (v.languageCodes ?? []).filter(Boolean) as string[],
    ssmlGender: v.ssmlGender ? String(v.ssmlGender) : undefined,
    naturalSampleRateHertz: v.naturalSampleRateHertz ?? undefined,
  }
}


