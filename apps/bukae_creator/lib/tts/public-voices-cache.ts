import type { PublicVoiceInfo } from '@/lib/types/tts'

const VOICE_CACHE_TTL_MS = 5 * 60 * 1000
const VOICE_CACHE_STORAGE_KEY = 'bookae-public-voices-cache-v1'

let cachedVoices: PublicVoiceInfo[] | null = null
let cachedAt = 0
let inflightFetchPromise: Promise<PublicVoiceInfo[]> | null = null

function isCacheFresh(timestamp: number): boolean {
  return Date.now() - timestamp <= VOICE_CACHE_TTL_MS
}

function readCachedPublicVoicesFromStorage(): PublicVoiceInfo[] | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(VOICE_CACHE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { voices?: unknown; cachedAt?: unknown }
    if (!Array.isArray(parsed.voices) || typeof parsed.cachedAt !== 'number') {
      return null
    }

    if (!isCacheFresh(parsed.cachedAt)) {
      return null
    }

    return parsed.voices as PublicVoiceInfo[]
  } catch {
    return null
  }
}

function writeCachedPublicVoicesToStorage(voices: PublicVoiceInfo[], timestamp: number): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      VOICE_CACHE_STORAGE_KEY,
      JSON.stringify({
        voices,
        cachedAt: timestamp,
      })
    )
  } catch {
    // localStorage quota or privacy mode errors are non-critical.
  }
}

export function getCachedPublicVoices(): PublicVoiceInfo[] | null {
  if (cachedVoices && isCacheFresh(cachedAt)) {
    return cachedVoices
  }

  const stored = readCachedPublicVoicesFromStorage()
  if (!stored) return null

  cachedVoices = stored
  cachedAt = Date.now()
  return stored
}

export function setCachedPublicVoices(voices: PublicVoiceInfo[]): void {
  cachedVoices = voices
  cachedAt = Date.now()
  writeCachedPublicVoicesToStorage(voices, cachedAt)
}

export async function fetchAndCachePublicVoices(token: string): Promise<PublicVoiceInfo[]> {
  const cached = getCachedPublicVoices()
  if (cached && cached.length > 0) {
    return cached
  }

  if (inflightFetchPromise) {
    return inflightFetchPromise
  }

  inflightFetchPromise = fetch('/api/tts/voices', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('목소리 목록을 불러오는데 실패했습니다.')
      }

      const data = await res.json()
      const voicesList = Array.isArray(data?.voices) ? (data.voices as PublicVoiceInfo[]) : []
      setCachedPublicVoices(voicesList)
      return voicesList
    })
    .finally(() => {
      inflightFetchPromise = null
    })

  return inflightFetchPromise
}

export function prefetchPublicVoices(token: string | null | undefined): void {
  if (!token) return
  void fetchAndCachePublicVoices(token)
}
