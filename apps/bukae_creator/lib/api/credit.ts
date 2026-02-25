import { Redis } from '@upstash/redis'
import type { TtsProvider, CreditUsageResult } from '@/lib/types/tts'
import { calculateCredits } from '@/lib/types/tts'
// re-export for callers that import from './credit'
export { calculateCredits } from '@/lib/types/tts'

let redisSingleton: Redis | null = null
const CREDIT_RECORD_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
const DEFAULT_VIDEO_EXPORT_CREDIT_COST = 100
const DEFAULT_INITIAL_CREDITS = 10000
const FAST_PLAN_CREDITS = 10000
const PREMIUM_PLAN_CREDITS = 10000

type CreditPlanTier = 'admin' | 'free' | 'fast' | 'premium'

export const CREDIT_POLICY_BY_PLAN: Record<Uppercase<CreditPlanTier>, number | null> = {
  ADMIN: null,
  FREE: null,
  FAST: FAST_PLAN_CREDITS,
  PREMIUM: PREMIUM_PLAN_CREDITS,
}

type VideoCreditTransactionStatus = 'charged' | 'refunded'

interface VideoCreditTransaction {
  transactionId: string
  userId: string
  clientRequestId: string
  creditsUsed: number
  status: VideoCreditTransactionStatus
  chargedAt: string
  refundedAt?: string
  refundReason?: string
  jobId?: string
}

interface VideoCreditRequestRecord {
  transactionId: string
  status?: VideoCreditTransactionStatus
}

export interface VideoCreditChargeResult {
  success: boolean
  charged: boolean
  alreadyProcessed: boolean
  transactionId: string | null
  creditsUsed: number
  remainingCredits: number | null
  error?: string
}

export interface VideoCreditRefundResult {
  success: boolean
  refunded: boolean
  transactionId: string | null
  refundedCredits: number
  remainingCredits: number | null
  error?: string
}

const chargeVideoExportLua = `
  local requestKey = KEYS[1]
  local userCreditKey = KEYS[2]
  local txKey = KEYS[3]

  local ttl = tonumber(ARGV[1])
  local nowIso = ARGV[2]
  local creditsToDeduct = tonumber(ARGV[3])
  local transactionId = ARGV[4]
  local userId = ARGV[5]
  local clientRequestId = ARGV[6]
  local initialCredits = tonumber(ARGV[7])

  local existingRequest = redis.call('GET', requestKey)
  if existingRequest then
    local existingRecord = cjson.decode(existingRequest)
    return {1, existingRecord.transactionId}
  end

  local currentCreditsRaw = redis.call('GET', userCreditKey)
  local currentCredits
  if not currentCreditsRaw then
    currentCredits = initialCredits
    redis.call('SET', userCreditKey, currentCredits)
  else
    currentCredits = tonumber(currentCreditsRaw)
  end

  if currentCredits < creditsToDeduct then
    return {0, tostring(currentCredits)}
  end

  local remainingCredits = redis.call('DECRBY', userCreditKey, creditsToDeduct)
  local txPayload = cjson.encode({
    transactionId = transactionId,
    userId = userId,
    clientRequestId = clientRequestId,
    creditsUsed = creditsToDeduct,
    status = 'charged',
    chargedAt = nowIso,
  })
  local requestPayload = cjson.encode({
    transactionId = transactionId,
    status = 'charged',
  })

  redis.call('SET', txKey, txPayload, 'EX', ttl)
  redis.call('SET', requestKey, requestPayload, 'EX', ttl)
  return {2, transactionId, tostring(remainingCredits)}
`

const bindVideoCreditJobLua = `
  local jobKey = KEYS[1]
  local txKey = KEYS[2]

  local transactionId = ARGV[1]
  local jobId = ARGV[2]
  local ttl = tonumber(ARGV[3])

  local existingJobTx = redis.call('GET', jobKey)
  if existingJobTx and existingJobTx ~= transactionId then
    return 0
  end

  redis.call('SET', jobKey, transactionId, 'EX', ttl)

  local txRaw = redis.call('GET', txKey)
  if not txRaw then
    return 1
  end

  local tx = cjson.decode(txRaw)
  tx.jobId = jobId
  redis.call('SET', txKey, cjson.encode(tx), 'KEEPTTL')
  return 1
`

const refundVideoExportLua = `
  local txKey = KEYS[1]
  local userCreditKey = KEYS[2]

  local requestRecordPrefix = ARGV[1]
  local userId = ARGV[2]
  local refundedAt = ARGV[3]
  local refundReason = ARGV[4]
  local initialCredits = tonumber(ARGV[5])
  local ttl = tonumber(ARGV[6])

  local txRaw = redis.call('GET', txKey)
  if not txRaw then
    return {0}
  end

  local tx = cjson.decode(txRaw)
  if tx.userId ~= userId then
    return {3}
  end

  local creditsUsed = tonumber(tx.creditsUsed) or 0
  local currentCreditsRaw = redis.call('GET', userCreditKey)
  local currentCredits
  if not currentCreditsRaw then
    currentCredits = initialCredits
    redis.call('SET', userCreditKey, currentCredits)
  else
    currentCredits = tonumber(currentCreditsRaw)
  end

  local requestKey = requestRecordPrefix .. tx.userId .. ':' .. tx.clientRequestId
  local requestTtl = redis.call('TTL', requestKey)
  local requestedTtl = ttl
  if requestTtl and requestTtl > 0 then
    requestedTtl = requestTtl
  end

  if tx.status == 'refunded' then
    if redis.call('EXISTS', requestKey) == 1 then
      redis.call('SET', requestKey, cjson.encode({ transactionId = tx.transactionId, status = 'refunded' }), 'EX', requestedTtl)
    end
    return {1, tx.transactionId, tostring(creditsUsed), tostring(currentCredits)}
  end

  local remainingCredits = redis.call('INCRBY', userCreditKey, creditsUsed)
  tx.status = 'refunded'
  tx.refundedAt = refundedAt
  tx.refundReason = refundReason
  redis.call('SET', txKey, cjson.encode(tx), 'KEEPTTL')
  redis.call('SET', requestKey, cjson.encode({ transactionId = tx.transactionId, status = 'refunded' }), 'EX', requestedTtl)

  return {2, tx.transactionId, tostring(creditsUsed), tostring(remainingCredits)}
`

function getInitialCredits(): number {
  const parsed = Number.parseInt(process.env.INITIAL_CREDITS || `${DEFAULT_INITIAL_CREDITS}`, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INITIAL_CREDITS
}

function getVideoExportCreditCost(): number {
  const parsed = Number.parseInt(
    process.env.VIDEO_EXPORT_CREDIT_COST || `${DEFAULT_VIDEO_EXPORT_CREDIT_COST}`,
    10
  )
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_VIDEO_EXPORT_CREDIT_COST
}

function getVideoCreditRequestKey(userId: string, clientRequestId: string): string {
  return `credit:video:req:${userId}:${clientRequestId}`
}

function getVideoCreditRequestPrefix(): string {
  return 'credit:video:req:'
}

function getVideoCreditTransactionKey(transactionId: string): string {
  return `credit:video:tx:${transactionId}`
}

function getVideoCreditJobKey(jobId: string): string {
  return `credit:video:job:${jobId}`
}

function parseVideoCreditRequestRecord(raw: unknown): VideoCreditRequestRecord | null {
  if (typeof raw !== 'string') return null

  try {
    const parsed = JSON.parse(raw) as Partial<VideoCreditRequestRecord>
    if (!parsed.transactionId || typeof parsed.transactionId !== 'string') {
      return null
    }
    return {
      transactionId: parsed.transactionId,
      status: parsed.status,
    }
  } catch {
    return null
  }
}

function parseVideoCreditTransaction(raw: unknown): VideoCreditTransaction | null {
  if (typeof raw !== 'string') return null

  try {
    const parsed = JSON.parse(raw) as Partial<VideoCreditTransaction>
    if (
      typeof parsed.transactionId !== 'string' ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.clientRequestId !== 'string' ||
      typeof parsed.creditsUsed !== 'number' ||
      (parsed.status !== 'charged' && parsed.status !== 'refunded') ||
      typeof parsed.chargedAt !== 'string'
    ) {
      return null
    }

    return {
      transactionId: parsed.transactionId,
      userId: parsed.userId,
      clientRequestId: parsed.clientRequestId,
      creditsUsed: parsed.creditsUsed,
      status: parsed.status,
      chargedAt: parsed.chargedAt,
      refundedAt: typeof parsed.refundedAt === 'string' ? parsed.refundedAt : undefined,
      refundReason: typeof parsed.refundReason === 'string' ? parsed.refundReason : undefined,
      jobId: typeof parsed.jobId === 'string' ? parsed.jobId : undefined,
    }
  } catch {
    return null
  }
}

function toSafeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value)
    if (Number.isFinite(n)) {
      return n
    }
  }

  return null
}

function getRedis(): Redis {
  if (redisSingleton) return redisSingleton
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('Upstash Redis 환경변수가 설정되어 있지 않습니다.')
  }
  redisSingleton = Redis.fromEnv()
  return redisSingleton
}

/**
 * 개발 환경에서만 크레딧 시스템 활성화
 * 환경변수 ENABLE_CREDIT_SYSTEM=true로 설정하면 활성화
 * 프로덕션에서는 항상 비활성화
 */
function isCreditSystemEnabled(): boolean {
  // 프로덕션에서는 항상 비활성화
  if (process.env.NODE_ENV === 'production') {
    return false
  }
  
  // 개발 환경에서 환경변수로 제어
  return process.env.ENABLE_CREDIT_SYSTEM === 'true'
}

/**
 * admin 사용자인지 확인
 */
export async function isAdminUser(userId: string, userEmail?: string, userRole?: string): Promise<boolean> {
  // role이 'admin'이면 admin
  const normalizedRole = userRole?.trim().toLowerCase()
  if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
    return true
  }

  // 환경변수로 admin 이메일 목록 설정
  const adminEmails =
    process.env.ADMIN_EMAILS?.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean) || []
  
  // 환경변수로 admin 사용자 ID 목록 설정
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map((id) => id.trim()).filter(Boolean) || []
  
  // 이메일로 체크
  if (userEmail && adminEmails.includes(userEmail.toLowerCase())) {
    return true
  }
  
  // 사용자 ID로 체크
  if (adminUserIds.includes(userId)) {
    return true
  }
  
  return false
}

interface CreditPolicy {
  tier: CreditPlanTier
  initialCredits: number | null
  unlimited: boolean
}

function getStringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return undefined
}

function normalizePlanTier(plan?: string): Exclude<CreditPlanTier, 'admin'> | null {
  if (!plan) return null

  const normalized = plan.trim().toLowerCase()

  if (
    ['premium', 'pro', 'premium_track', 'premiumtrack', 'pro_track', 'protrack'].includes(
      normalized
    )
  ) {
    return 'premium'
  }

  if (['fast', 'fast_track', 'fasttrack'].includes(normalized)) {
    return 'fast'
  }

  if (
    ['free', 'none', 'basic', 'default', 'starter', 'trial'].includes(normalized)
  ) {
    return 'free'
  }

  return null
}

function getInitialCreditsByTier(tier: CreditPlanTier): number | null {
  if (tier === 'premium') return PREMIUM_PLAN_CREDITS
  if (tier === 'fast') return FAST_PLAN_CREDITS
  return null
}

async function resolveCreditPolicy(userId: string, accessToken?: string): Promise<CreditPolicy> {
  const userInfo = await _getUserInfo(userId, accessToken)
  const adminUser = await isAdminUser(userId, userInfo?.email, userInfo?.role)

  if (adminUser) {
    return {
      tier: 'admin',
      initialCredits: null,
      unlimited: true,
    }
  }

  const planTier = normalizePlanTier(userInfo?.subscriptionPlan) ?? 'free'
  const initialCredits = getInitialCreditsByTier(planTier)

  return {
    tier: planTier,
    initialCredits,
    unlimited: initialCredits === null,
  }
}

async function ensureCreditsFloor(redis: Redis, key: string, minCredits: number): Promise<number> {
  const safeMinCredits = Math.max(0, Math.floor(minCredits))
  const currentCredits = await redis.get<number>(key)

  if (currentCredits === null || currentCredits < safeMinCredits) {
    await redis.set(key, safeMinCredits)
    return safeMinCredits
  }

  return currentCredits
}

/**
 * 사용자 정보 조회 (이메일, role, 요금제)
 */
async function _getUserInfo(userId: string, accessToken?: string): Promise<{
  email?: string
  role?: string
  subscriptionPlan?: string
} | null> {
  if (!userId || !accessToken) return null

  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    if (!API_BASE_URL) {
      console.error('[Credit] NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다.')
      return null
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const user = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (!user) return null

      const subscriptionPlan = getStringField(user, [
        'subscriptionPlan',
        'subscription',
        'plan',
        'planName',
        'membership',
        'membershipPlan',
        'tier',
      ])

      return {
        email: getStringField(user, ['email']),
        role: getStringField(user, ['role']),
        subscriptionPlan,
      }
    }
  } catch (error) {
    // 조회 실패는 무시 (크레딧 시스템은 계속 동작)
    console.error('[Credit] getUserInfo error:', error)
  }
  
  return null
}

/**
 * 사용자의 크레딧 잔액 조회
 */
export async function getUserCredits(userId: string, accessToken?: string): Promise<number | null> {
  if (!isCreditSystemEnabled()) {
    return null // 크레딧 시스템 비활성화 시 무제한
  }

  try {
    const policy = await resolveCreditPolicy(userId, accessToken)
    if (policy.unlimited) {
      return null
    }

    const redis = getRedis()
    const key = `credit:user:${userId}`
    const fallbackCredits = policy.initialCredits ?? getInitialCredits()
    return await ensureCreditsFloor(redis, key, fallbackCredits)
  } catch (error) {
    console.error('[Credit] getUserCredits error:', error)
    return null
  }
}

/**
 * 영상 내보내기 크레딧 차감 (clientRequestId 멱등 처리)
 */
export async function chargeVideoExportCredits(params: {
  userId: string
  clientRequestId: string
  creditsToDeduct?: number
  accessToken?: string
}): Promise<VideoCreditChargeResult> {
  const { userId, clientRequestId, accessToken } = params
  const creditsToDeduct = Math.max(1, Math.floor(params.creditsToDeduct ?? getVideoExportCreditCost()))

  if (!isCreditSystemEnabled()) {
    return {
      success: true,
      charged: false,
      alreadyProcessed: false,
      transactionId: null,
      creditsUsed: creditsToDeduct,
      remainingCredits: null,
    }
  }

  try {
    const policy = await resolveCreditPolicy(userId, accessToken)
    if (policy.unlimited) {
      return {
        success: true,
        charged: false,
        alreadyProcessed: false,
        transactionId: null,
        creditsUsed: creditsToDeduct,
        remainingCredits: null,
      }
    }

    const redis = getRedis()
    const creditKey = `credit:user:${userId}`
    const requestKey = getVideoCreditRequestKey(userId, clientRequestId)
    const transactionId = crypto.randomUUID()
    const txKey = getVideoCreditTransactionKey(transactionId)
    const initialCreditsForPlan = Math.max(
      policy.initialCredits ?? getInitialCredits(),
      creditsToDeduct
    )

    await ensureCreditsFloor(redis, creditKey, initialCreditsForPlan)

    const result = await redis.eval<
      [string, string, string, string, string, string, string],
      unknown[]
    >(
      chargeVideoExportLua,
      [requestKey, creditKey, txKey],
      [
        String(CREDIT_RECORD_TTL_SECONDS),
        new Date().toISOString(),
        String(creditsToDeduct),
        transactionId,
        userId,
        clientRequestId,
        String(initialCreditsForPlan),
      ]
    )

    const code = toSafeNumber(result?.[0])

    // 이미 처리된 요청: 기존 transactionId 반환 (추가 차감 없음)
    if (code === 1) {
      const existingTransactionId =
        typeof result?.[1] === 'string' && result[1].trim().length > 0
          ? result[1]
          : null

      if (!existingTransactionId) {
        return {
          success: false,
          charged: false,
          alreadyProcessed: true,
          transactionId: null,
          creditsUsed: 0,
          remainingCredits: await getUserCredits(userId, accessToken),
          error: '기존 거래 정보를 확인할 수 없습니다.',
        }
      }

      const [requestRaw, txRaw, currentCredits] = await Promise.all([
        redis.get<string>(requestKey),
        redis.get<string>(getVideoCreditTransactionKey(existingTransactionId)),
        redis.get<number>(creditKey),
      ])
      const requestRecord = parseVideoCreditRequestRecord(requestRaw)
      const txRecord = parseVideoCreditTransaction(txRaw)

      return {
        success: true,
        charged: false,
        alreadyProcessed: true,
        transactionId: requestRecord?.transactionId ?? existingTransactionId,
        creditsUsed: txRecord?.creditsUsed ?? creditsToDeduct,
        remainingCredits: currentCredits ?? null,
      }
    }

    // 잔액 부족
    if (code === 0) {
      return {
        success: true,
        charged: false,
        alreadyProcessed: false,
        transactionId: null,
        creditsUsed: creditsToDeduct,
        remainingCredits: await getUserCredits(userId, accessToken),
      }
    }

    // 신규 차감 성공
    if (code === 2) {
      const chargedTransactionId =
        typeof result?.[1] === 'string' && result[1].trim().length > 0 ? result[1] : transactionId

      return {
        success: true,
        charged: true,
        alreadyProcessed: false,
        transactionId: chargedTransactionId,
        creditsUsed: creditsToDeduct,
        remainingCredits: toSafeNumber(result?.[2]),
      }
    }

    return {
      success: false,
      charged: false,
      alreadyProcessed: false,
      transactionId: null,
      creditsUsed: 0,
      remainingCredits: null,
      error: '크레딧 차감 결과를 해석하지 못했습니다.',
    }
  } catch (error) {
    console.error('[Credit] chargeVideoExportCredits error:', error)
    return {
      success: true,
      charged: false,
      alreadyProcessed: false,
      transactionId: null,
      creditsUsed: creditsToDeduct,
      remainingCredits: null,
    }
  }
}

/**
 * 크레딧 거래와 생성된 jobId를 연결합니다.
 */
export async function bindVideoCreditTransactionToJob(params: {
  transactionId: string
  jobId: string
}): Promise<{ success: boolean; error?: string }> {
  const { transactionId, jobId } = params

  if (!isCreditSystemEnabled()) {
    return { success: true }
  }

  try {
    const redis = getRedis()
    const result = await redis.eval<[string, string, string], number>(
      bindVideoCreditJobLua,
      [getVideoCreditJobKey(jobId), getVideoCreditTransactionKey(transactionId)],
      [transactionId, jobId, String(CREDIT_RECORD_TTL_SECONDS)]
    )

    if (result === 0) {
      return {
        success: false,
        error: '이미 다른 거래와 연결된 jobId입니다.',
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[Credit] bindVideoCreditTransactionToJob error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '거래-작업 연결 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 영상 내보내기 환불 (jobId 또는 transactionId 기반, 멱등 처리)
 */
export async function refundVideoExportCredits(params: {
  userId: string
  jobId?: string
  transactionId?: string
  reason?: string
}): Promise<VideoCreditRefundResult> {
  const { userId, reason } = params

  if (!isCreditSystemEnabled()) {
    return {
      success: true,
      refunded: false,
      transactionId: null,
      refundedCredits: 0,
      remainingCredits: null,
    }
  }

  try {
    const redis = getRedis()
    const targetTransactionId =
      params.transactionId ??
      (params.jobId ? await redis.get<string>(getVideoCreditJobKey(params.jobId)) : null)

    if (!targetTransactionId) {
      return {
        success: true,
        refunded: false,
        transactionId: null,
        refundedCredits: 0,
        remainingCredits: await getUserCredits(userId),
      }
    }

    const result = await redis.eval<[string, string, string, string, string, string], unknown[]>(
      refundVideoExportLua,
      [getVideoCreditTransactionKey(targetTransactionId), `credit:user:${userId}`],
      [
        getVideoCreditRequestPrefix(),
        userId,
        new Date().toISOString(),
        reason ?? 'render_failed',
        String(getInitialCredits()),
        String(CREDIT_RECORD_TTL_SECONDS),
      ]
    )

    const code = toSafeNumber(result?.[0])

    // 거래 없음 (이미 만료/삭제)
    if (code === 0) {
      return {
        success: true,
        refunded: false,
        transactionId: targetTransactionId,
        refundedCredits: 0,
        remainingCredits: await getUserCredits(userId),
      }
    }

    // 다른 사용자 거래 접근
    if (code === 3) {
      return {
        success: false,
        refunded: false,
        transactionId: targetTransactionId,
        refundedCredits: 0,
        remainingCredits: null,
        error: '환불 권한이 없습니다.',
      }
    }

    const transactionId =
      typeof result?.[1] === 'string' && result[1].trim().length > 0
        ? result[1]
        : targetTransactionId
    const credits = toSafeNumber(result?.[2]) ?? 0
    const remainingCredits = toSafeNumber(result?.[3])

    // 이미 환불된 거래 (중복 요청)
    if (code === 1) {
      return {
        success: true,
        refunded: false,
        transactionId,
        refundedCredits: 0,
        remainingCredits,
      }
    }

    if (code === 2) {
      return {
        success: true,
        refunded: true,
        transactionId,
        refundedCredits: credits,
        remainingCredits,
      }
    }

    return {
      success: false,
      refunded: false,
      transactionId,
      refundedCredits: 0,
      remainingCredits: null,
      error: '환불 결과를 해석하지 못했습니다.',
    }
  } catch (error) {
    console.error('[Credit] refundVideoExportCredits error:', error)
    return {
      success: false,
      refunded: false,
      transactionId: params.transactionId ?? null,
      refundedCredits: 0,
      remainingCredits: null,
      error: error instanceof Error ? error.message : '영상 내보내기 환불 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 크레딧 차감
 */
export async function consumeCredits(
  userId: string,
  provider: TtsProvider,
  charCount: number,
  accessToken?: string
): Promise<CreditUsageResult> {
  // 크레딧 시스템이 비활성화되어 있으면 항상 성공
  if (!isCreditSystemEnabled()) {
    return {
      success: true,
      creditsUsed: calculateCredits(provider, charCount),
      remainingCredits: null,
    }
  }

  const creditsToDeduct = calculateCredits(provider, charCount)

  try {
    const policy = await resolveCreditPolicy(userId, accessToken)
    if (policy.unlimited) {
      return {
        success: true,
        creditsUsed: creditsToDeduct,
        remainingCredits: null,
      }
    }

    const redis = getRedis()
    const key = `credit:user:${userId}`
    const initialCreditsForPlan = Math.max(policy.initialCredits ?? getInitialCredits(), creditsToDeduct)

    let currentCredits = await ensureCreditsFloor(redis, key, initialCreditsForPlan)

    // 부족하면 해당 플랜 기본값으로 재보정 후 재시도 (요청 차단 방지)
    if (currentCredits < creditsToDeduct) {
      currentCredits = await ensureCreditsFloor(redis, key, initialCreditsForPlan)
    }

    const remaining = await redis.decrby(key, creditsToDeduct)
    await logCreditUsage(userId, provider, charCount, creditsToDeduct)

    return {
      success: true,
      creditsUsed: creditsToDeduct,
      remainingCredits: remaining,
    }
  } catch (error) {
    console.error('[Credit] consumeCredits error:', error)
    return {
      success: true,
      creditsUsed: creditsToDeduct,
      remainingCredits: null,
    }
  }
}

/**
 * 크레딧 사용량 로깅
 */
async function logCreditUsage(
  userId: string,
  provider: TtsProvider,
  charCount: number,
  creditsUsed: number
): Promise<void> {
  if (!isCreditSystemEnabled()) {
    return
  }

  try {
    const redis = getRedis()
    const timestamp = Date.now()
    const logKey = `credit:log:${userId}:${timestamp}`
    
    await redis.set(logKey, JSON.stringify({
      provider,
      charCount,
      creditsUsed,
      timestamp: new Date().toISOString(),
    }), { ex: 60 * 60 * 24 * 30 }) // 30일 보관
    
    // 통계 업데이트 (제공자별)
    const statsKey = `credit:stats:${userId}:${provider}`
    await redis.incrby(`${statsKey}:chars`, charCount)
    await redis.incrby(`${statsKey}:credits`, creditsUsed)
    await redis.expire(`${statsKey}:chars`, 60 * 60 * 24 * 30)
    await redis.expire(`${statsKey}:credits`, 60 * 60 * 24 * 30)
  } catch (error) {
    // 로깅 실패는 무시
    console.error('[Credit] logCreditUsage error:', error)
  }
}

/**
 * 크레딧 충전 (개발 환경 전용)
 */
export async function addCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; newBalance: number | null; error?: string }> {
  if (!isCreditSystemEnabled()) {
    return {
      success: false,
      newBalance: null,
      error: '크레딧 시스템이 비활성화되어 있습니다.',
    }
  }

  try {
    const redis = getRedis()
    const key = `credit:user:${userId}`
    
    let currentCredits = await redis.get<number>(key)
    
    if (currentCredits === null) {
      const initialCredits = parseInt(process.env.INITIAL_CREDITS || '10000', 10)
      await redis.set(key, initialCredits)
      currentCredits = initialCredits
    }
    
    const newBalance = await redis.incrby(key, amount)
    
    
    return {
      success: true,
      newBalance,
    }
  } catch (error) {
    console.error('[Credit] addCredits error:', error)
    return {
      success: false,
      newBalance: null,
      error: error instanceof Error ? error.message : '크레딧 충전 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 제공자별 사용량 통계 조회
 */
export async function getProviderUsageStats(
  userId: string
): Promise<{
  google: { charCount: number; creditsUsed: number }
  elevenlabs: { charCount: number; creditsUsed: number }
  totalCredits: number | null
}> {
  if (!isCreditSystemEnabled()) {
    return {
      google: { charCount: 0, creditsUsed: 0 },
      elevenlabs: { charCount: 0, creditsUsed: 0 },
      totalCredits: null,
    }
  }

  try {
    const redis = getRedis()
    
    const [googleChars, googleCredits, elevenLabsChars, elevenLabsCredits, totalCredits] = await Promise.all([
      redis.get<number>(`credit:stats:${userId}:google:chars`) ?? 0,
      redis.get<number>(`credit:stats:${userId}:google:credits`) ?? 0,
      redis.get<number>(`credit:stats:${userId}:elevenlabs:chars`) ?? 0,
      redis.get<number>(`credit:stats:${userId}:elevenlabs:credits`) ?? 0,
      getUserCredits(userId),
    ])
    
    return {
      google: {
        charCount: googleChars ?? 0,
        creditsUsed: googleCredits ?? 0,
      },
      elevenlabs: {
        charCount: elevenLabsChars ?? 0,
        creditsUsed: elevenLabsCredits ?? 0,
      },
      totalCredits,
    }
  } catch (error) {
    console.error('[Credit] getProviderUsageStats error:', error)
    return {
      google: { charCount: 0, creditsUsed: 0 },
      elevenlabs: { charCount: 0, creditsUsed: 0 },
      totalCredits: null,
    }
  }
}
