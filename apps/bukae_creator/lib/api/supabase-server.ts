import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let serverClientSingleton: SupabaseClient | null = null

function ensureSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Supabase 환경 변수 NEXT_PUBLIC_SUPABASE_URL가 설정되어 있지 않습니다.')
  }
  if (!anonKey) {
    throw new Error('Supabase 환경 변수 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되어 있지 않습니다.')
  }
  return { url, anonKey }
}

export function getSupabaseServerClient(): SupabaseClient {
  if (serverClientSingleton) return serverClientSingleton

  const { url, anonKey } = ensureSupabaseEnv()
  serverClientSingleton = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return serverClientSingleton
}

export async function getUserFromAccessToken(accessToken: string) {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data?.user) return null
  return data.user
}

/**
 * 서비스 역할 키를 사용하는 Supabase 클라이언트를 생성합니다.
 * RLS를 우회하고 모든 작업을 수행할 수 있습니다.
 * 주의: 서비스 역할 키는 절대 클라이언트 사이드에 노출되어서는 안 됩니다.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('Supabase 환경 변수 NEXT_PUBLIC_SUPABASE_URL가 설정되어 있지 않습니다.')
  }
  if (!serviceRoleKey) {
    throw new Error('Supabase 환경 변수 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다.')
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

