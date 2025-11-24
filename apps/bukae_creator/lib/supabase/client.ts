import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

const requiredEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

const ensureEnv = () => {
  if (!requiredEnv.url) {
    throw new Error('Supabase 환경 변수 NEXT_PUBLIC_SUPABASE_URL가 설정되어 있지 않습니다.')
  }
  if (!requiredEnv.anonKey) {
    throw new Error('Supabase 환경 변수 NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되어 있지 않습니다.')
  }
  return requiredEnv as { url: string; anonKey: string }
}

export const getSupabaseClient = (): SupabaseClient => {
  if (browserClient) {
    return browserClient
  }

  const { url, anonKey } = ensureEnv()

  browserClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

