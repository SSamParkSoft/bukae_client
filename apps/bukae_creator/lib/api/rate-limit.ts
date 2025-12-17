import { NextResponse } from 'next/server'
import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getRequestIp } from '@/lib/api/route-guard'

type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

type EndpointPolicy = {
  // user 기준
  user: { limit: number; window: Duration }
  // ip 기준(선택)
  ip?: { limit: number; window: Duration }
}

let redisSingleton: Redis | null = null
const ratelimiters: Record<string, { user: Ratelimit; ip?: Ratelimit }> = {}

function hasUpstashEnv(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
}

function isDevBypass(): boolean {
  return process.env.NODE_ENV !== 'production' && !hasUpstashEnv()
}

function getRedis(): Redis {
  if (redisSingleton) return redisSingleton
  if (!hasUpstashEnv()) {
    throw new Error(
      'Upstash Redis 환경변수(UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN)가 설정되어 있지 않습니다.'
    )
  }
  redisSingleton = Redis.fromEnv()
  return redisSingleton
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function strEnv(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw?.trim() ? raw.trim() : fallback
}

function durationEnv(name: string, fallback: Duration): Duration {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback

  // @upstash/ratelimit Duration 포맷: "60 s" (숫자 + 단위 s/m/h/d)
  const normalized = raw.replace(/\s+/g, ' ').trim()
  const m = normalized.match(/^(\d+)\s*([smhd])$/)
  if (!m) return fallback
  return `${m[1]} ${m[2]}` as Duration
}

export function getEndpointPolicy(endpoint: string): EndpointPolicy {
  // 기본 윈도우는 "60 s" 형태(@upstash/ratelimit 규격)
  const defaultWindow = durationEnv('RATE_LIMIT_DEFAULT_WINDOW', '60 s')

  if (endpoint === 'tts:voices') {
    return {
      user: {
        limit: intEnv('RATE_LIMIT_TTS_VOICES_LIMIT', 30),
        window: durationEnv('RATE_LIMIT_TTS_VOICES_WINDOW', defaultWindow),
      },
      ip: {
        limit: intEnv('RATE_LIMIT_TTS_VOICES_IP_LIMIT', 60),
        window: durationEnv('RATE_LIMIT_TTS_VOICES_IP_WINDOW', defaultWindow),
      },
    }
  }

  if (endpoint === 'tts:synthesize') {
    return {
      user: {
        limit: intEnv('RATE_LIMIT_TTS_SYNTHESIZE_LIMIT', 10),
        window: durationEnv('RATE_LIMIT_TTS_SYNTHESIZE_WINDOW', defaultWindow),
      },
      ip: {
        limit: intEnv('RATE_LIMIT_TTS_SYNTHESIZE_IP_LIMIT', 30),
        window: durationEnv('RATE_LIMIT_TTS_SYNTHESIZE_IP_WINDOW', defaultWindow),
      },
    }
  }

  // 기타(추후 비용 API 확장 대비)
  return {
    user: {
      limit: intEnv('RATE_LIMIT_GENERIC_USER_LIMIT', 60),
      window: durationEnv('RATE_LIMIT_GENERIC_USER_WINDOW', defaultWindow),
    },
    ip: {
      limit: intEnv('RATE_LIMIT_GENERIC_IP_LIMIT', 120),
      window: durationEnv('RATE_LIMIT_GENERIC_IP_WINDOW', defaultWindow),
    },
  }
}

function getRatelimiters(endpoint: string) {
  if (ratelimiters[endpoint]) return ratelimiters[endpoint]

  const policy = getEndpointPolicy(endpoint)
  const redis = getRedis()

  const user = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(policy.user.limit, policy.user.window),
    prefix: strEnv('RATE_LIMIT_PREFIX', 'ratelimit'),
    analytics: false,
  })

  const ip = policy.ip
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(policy.ip.limit, policy.ip.window),
        prefix: strEnv('RATE_LIMIT_PREFIX', 'ratelimit'),
        analytics: false,
      })
    : undefined

  ratelimiters[endpoint] = { user, ip }
  return ratelimiters[endpoint]
}

function rateLimitHeaders(res: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(res.limit),
    'X-RateLimit-Remaining': String(res.remaining),
    'X-RateLimit-Reset': String(res.reset),
  }
}

function retryAfterSeconds(resetMs: number): string {
  const ms = resetMs - Date.now()
  const sec = Math.max(1, Math.ceil(ms / 1000))
  return String(sec)
}

export async function enforceRateLimit(
  request: Request,
  params: {
    endpoint: string
    userId: string
  }
): Promise<{ headers?: Record<string, string> } | NextResponse> {
  const { endpoint, userId } = params
  // 로컬(dev)에서 Upstash env가 없을 때는 기능은 동작시키고 레이트리밋만 스킵
  if (isDevBypass()) {
    return { headers: {} }
  }

  const { user, ip: ipLimiter } = getRatelimiters(endpoint)

  const userKey = `${endpoint}:user:${userId}`
  const userRes = (await user.limit(userKey)) as unknown as RateLimitResult

  if (!userRes.success) {
    const headers = {
      ...rateLimitHeaders(userRes),
      'Retry-After': retryAfterSeconds(userRes.reset),
    }
    return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429, headers })
  }

  const ip = getRequestIp(request)
  if (ipLimiter && ip) {
    const ipKey = `${endpoint}:ip:${ip}`
    const ipRes = (await ipLimiter.limit(ipKey)) as unknown as RateLimitResult
    if (!ipRes.success) {
      const headers = {
        ...rateLimitHeaders(ipRes),
        'Retry-After': retryAfterSeconds(ipRes.reset),
      }
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers }
      )
    }
  }

  return { headers: rateLimitHeaders(userRes) }
}

const consumeQuotaLua = `
  local key = KEYS[1]
  local ttl = tonumber(ARGV[1])
  local inc = tonumber(ARGV[2])
  local max = tonumber(ARGV[3])

  local current = redis.call('GET', key)
  if not current then
    current = 0
  else
    current = tonumber(current)
  end

  if current + inc > max then
    return -1
  end

  local next = current + inc
  if current == 0 then
    redis.call('SET', key, next, 'EX', ttl)
  else
    redis.call('SET', key, next, 'KEEPTTL')
  end

  return next
`

async function consumeQuota(key: string, inc: number, max: number, ttlSeconds: number) {
  const redis = getRedis()
  // @upstash/redis는 eval을 지원(atomic 보장)
  return redis.eval<[number, number, number], number>(consumeQuotaLua, [key], [ttlSeconds, inc, max])
}

export async function enforceTtsDailyQuota(
  params: {
    userId: string
    charCount: number
  }
): Promise<NextResponse | null> {
  const { userId, charCount } = params
  // 로컬(dev)에서 Upstash env가 없을 때는 쿼터도 스킵
  if (isDevBypass()) return null

  const ttl = intEnv('TTS_DAILY_QUOTA_TTL_SECONDS', 60 * 60 * 24)

  const maxChars = intEnv('TTS_DAILY_CHAR_QUOTA', 20000)
  const maxReq = intEnv('TTS_DAILY_REQUEST_QUOTA', 200)

  const charKey = `quota:tts:chars:${userId}`
  const reqKey = `quota:tts:req:${userId}`

  const [nextChars, nextReq] = await Promise.all([
    consumeQuota(charKey, Math.max(0, Math.floor(charCount)), maxChars, ttl),
    consumeQuota(reqKey, 1, maxReq, ttl),
  ])

  if (nextChars === -1) {
    return NextResponse.json(
      { error: '오늘의 TTS 사용량(문자수) 한도를 초과했습니다.' },
      { status: 429 }
    )
  }
  if (nextReq === -1) {
    return NextResponse.json(
      { error: '오늘의 TTS 사용량(요청수) 한도를 초과했습니다.' },
      { status: 429 }
    )
  }

  return null
}


