import { TextToSpeechClient } from '@google-cloud/text-to-speech'

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

/**
 * Google TTS 클라이언트 싱글톤 인스턴스 반환
 */
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
