import { NextResponse } from 'next/server'

type AvatarCacheEntry = {
  expiresAt: number
  contentType: string
  body: ArrayBuffer
}

const TTL_MS = 24 * 60 * 60 * 1000 // 24시간
const MAX_ENTRIES = 200

const cacheKey = (url: string) => url

const isAllowedAvatarHostname = (hostname: string) => {
  const h = hostname.toLowerCase()

  // Google 로그인/소셜 프로필
  if (h === 'lh3.googleusercontent.com') return true
  if (h.endsWith('.googleusercontent.com')) return true

  // (선택) GitHub 등 확장 가능
  if (h === 'avatars.githubusercontent.com') return true
  if (h.endsWith('.githubusercontent.com')) return true

  // Facebook 등
  if (h === 'platform-lookaside.fbsbx.com') return true
  if (h.endsWith('.fbcdn.net')) return true

  return false
}

const getCache = () => {
  const g = globalThis as unknown as { __avatarProxyCache?: Map<string, AvatarCacheEntry> }
  if (!g.__avatarProxyCache) g.__avatarProxyCache = new Map<string, AvatarCacheEntry>()
  return g.__avatarProxyCache
}

const getInflight = () => {
  const g = globalThis as unknown as { __avatarProxyInflight?: Map<string, Promise<AvatarCacheEntry>> }
  if (!g.__avatarProxyInflight) g.__avatarProxyInflight = new Map<string, Promise<AvatarCacheEntry>>()
  return g.__avatarProxyInflight
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return NextResponse.json({ error: 'url 파라미터가 필요합니다.' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(imageUrl)
  } catch {
    return NextResponse.json({ error: '유효하지 않은 URL입니다.' }, { status: 400 })
  }

  if (!isAllowedAvatarHostname(parsedUrl.hostname)) {
    return NextResponse.json({ error: '허용되지 않은 이미지 도메인입니다.' }, { status: 403 })
  }

  const key = cacheKey(parsedUrl.toString())
  const cache = getCache()
  const now = Date.now()

  const cached = cache.get(key)
  if (cached && cached.expiresAt > now) {
    return new NextResponse(cached.body, {
      headers: {
        'Content-Type': cached.contentType,
        // 이미지 자체 응답을 브라우저/프록시 레벨에서 캐시
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // 캐시가 만료됐더라도, 원격이 429로 막히는 상황에선 "최신 캐시"를 응급으로 반환
  const staleCached = cached

  try {
    const inflight = getInflight()

    const existingInflight = inflight.get(key)
    if (existingInflight) {
      const entry = await existingInflight
      return new NextResponse(entry.body, {
        headers: {
          'Content-Type': entry.contentType,
          'Cache-Control': 'public, max-age=86400, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const promise = (async () => {
      const imageResponse = await fetch(parsedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      })

      if (!imageResponse.ok) {
        if (staleCached) return staleCached

        // 실패 시엔 캐시에 저장하지 않음 (다음 요청에 재시도할 여지)
        throw new Error(`이미지 가져오기 실패: ${imageResponse.status}`)
      }

      const contentType = imageResponse.headers.get('content-type') ?? 'image/jpeg'
      const body = await imageResponse.arrayBuffer()

      const entry: AvatarCacheEntry = {
        expiresAt: now + TTL_MS,
        contentType,
        body,
      }

      cache.set(key, entry)

      // 간단 LRU(삽입 순서 기준) - 최대치 초과 시 가장 오래된 엔트리부터 제거
      if (cache.size > MAX_ENTRIES) {
        const firstKey = cache.keys().next().value as string | undefined
        if (firstKey) cache.delete(firstKey)
      }

      return entry
    })()

    inflight.set(key, promise)

    try {
      const entry = await promise
      return new NextResponse(entry.body, {
        headers: {
          'Content-Type': entry.contentType,
          'Cache-Control': 'public, max-age=86400, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } finally {
      inflight.delete(key)
    }
  } catch {
    if (staleCached) {
      return new NextResponse(staleCached.body, {
        headers: {
          'Content-Type': staleCached.contentType,
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=3600',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return NextResponse.json({ error: '이미지 프록시 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

