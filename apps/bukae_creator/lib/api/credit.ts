import { Redis } from '@upstash/redis'
import type { TtsProvider, CreditUsageResult } from '@/lib/types/tts'
import { calculateCredits } from '@/lib/types/tts'
// re-export for callers that import from './credit'
export { calculateCredits } from '@/lib/types/tts'

let redisSingleton: Redis | null = null

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
 * 개발 환경에서 admin 사용자인지 확인
 * 프로덕션에서는 항상 false
 */
export async function isAdminUser(userId: string, userEmail?: string, userRole?: string): Promise<boolean> {
  // 프로덕션에서는 항상 false
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  // role이 'admin'이면 admin
  if (userRole === 'admin' || userRole === 'ADMIN') {
    return true
  }

  // 환경변수로 admin 이메일 목록 설정
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()).filter(Boolean) || []
  
  // 환경변수로 admin 사용자 ID 목록 설정
  const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()).filter(Boolean) || []
  
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

/**
 * 사용자 정보 조회 (이메일, role 등)
 * 개발 환경에서만 사용
 */
async function getUserInfo(userId: string, accessToken?: string): Promise<{
  email?: string
  role?: string
} | null> {
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  try {
    // 백엔드 API에서 사용자 정보 조회
    if (accessToken) {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
      if (!API_BASE_URL) {
        console.error('[Credit] NEXT_PUBLIC_API_BASE_URL이 설정되지 않았습니다.')
        return null
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      
      if (res.ok) {
        const user = await res.json()
        return {
          email: user.email,
          role: user.role,
        }
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
export async function getUserCredits(userId: string): Promise<number | null> {
  if (!isCreditSystemEnabled()) {
    return null // 크레딧 시스템 비활성화 시 무제한
  }

  try {
    const redis = getRedis()
    const key = `credit:user:${userId}`
    const credits = await redis.get<number>(key)
    
    // 크레딧이 없으면 초기값 설정 (개발 환경 전용)
    if (credits === null) {
      const initialCredits = parseInt(process.env.INITIAL_CREDITS || '10000', 10)
      await redis.set(key, initialCredits)
      return initialCredits
    }
    
    return credits
  } catch (error) {
    console.error('[Credit] getUserCredits error:', error)
    return null
  }
}

/**
 * 크레딧 차감
 */
export async function consumeCredits(
  userId: string,
  provider: TtsProvider,
  charCount: number,
  accessToken?: string // 추가: 사용자 정보 조회용
): Promise<CreditUsageResult> {
  // 크레딧 시스템이 비활성화되어 있으면 항상 성공
  if (!isCreditSystemEnabled()) {
    return {
      success: true,
      creditsUsed: calculateCredits(provider, charCount),
      remainingCredits: null,
    }
  }

  // 개발 환경에서는 크레딧 제한 없음 (모든 사용자)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Credit] 개발 환경 - 크레딧 차감 스킵 (userId: ${userId}, provider: ${provider}, 문자: ${charCount})`)
    return {
      success: true,
      creditsUsed: calculateCredits(provider, charCount), // 통계용으로 계산
      remainingCredits: null, // 개발 환경에서는 무제한
    }
  }

  const creditsToDeduct = calculateCredits(provider, charCount)
  
  try {
    const redis = getRedis()
    const key = `credit:user:${userId}`
    
    let currentCredits = await redis.get<number>(key)
    
    if (currentCredits === null) {
      const initialCredits = parseInt(process.env.INITIAL_CREDITS || '10000', 10)
      await redis.set(key, initialCredits)
      currentCredits = initialCredits
    }
    
    if (currentCredits < creditsToDeduct) {
      return {
        success: false,
        creditsUsed: 0,
        remainingCredits: currentCredits,
        error: `크레딧이 부족합니다. 필요: ${creditsToDeduct}, 보유: ${currentCredits}`,
      }
    }
    
    const remaining = await redis.decrby(key, creditsToDeduct)
    await logCreditUsage(userId, provider, charCount, creditsToDeduct)
    
    console.log(`[Credit] ${provider} TTS 사용 - 문자: ${charCount}, 크레딧: ${creditsToDeduct}, 잔액: ${remaining}`)
    
    return {
      success: true,
      creditsUsed: creditsToDeduct,
      remainingCredits: remaining,
    }
  } catch (error) {
    console.error('[Credit] consumeCredits error:', error)
    return {
      success: false,
      creditsUsed: 0,
      remainingCredits: null,
      error: error instanceof Error ? error.message : '크레딧 차감 중 오류가 발생했습니다.',
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
    
    console.log(`[Credit] 크레딧 충전 - 사용자: ${userId}, 추가: ${amount}, 잔액: ${newBalance}`)
    
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
