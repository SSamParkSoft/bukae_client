'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'

function SupabaseAuthSync() {
  const router = useRouter()
  const setUser = useUserStore((state) => state.setUser)
  const resetUser = useUserStore((state) => state.reset)
  const checkAuth = useUserStore((state) => state.checkAuth)

  useEffect(() => {
    const handleAuthExpired = () => {
      resetUser()
      router.replace('/login')
    }

    window.addEventListener('auth:expired', handleAuthExpired)

    const supabase = getSupabaseClient()

    const syncSession = (session: Session | null) => {
      // 백엔드 OAuth2 로그인(백엔드 토큰)인 경우: Supabase 세션 동기화로 덮어쓰지 않음
      if (authStorage.getAuthSource() === 'backend' && authStorage.hasTokens()) {
        checkAuth()
        return
      }

      if (session?.access_token && session?.refresh_token) {
        authStorage.setTokens(session.access_token, session.refresh_token, { source: 'supabase' })
      } else {
        // Supabase 세션이 없고 백엔드 토큰도 없을 때만 clearTokens
        if (!authStorage.hasTokens()) {
          authStorage.clearTokens()
        }
      }

      const supabaseUser = session?.user
      if (supabaseUser) {
        setUser({
          id: supabaseUser.id,
          name:
            (supabaseUser.user_metadata?.full_name as string | undefined) ||
            supabaseUser.email?.split('@')[0] ||
            '사용자',
          email: supabaseUser.email ?? '',
          profileImage: supabaseUser.user_metadata?.avatar_url as string | undefined,
          createdAt: supabaseUser.created_at ?? new Date().toISOString(),
          accountStatus: 'active',
        })
      } else {
        // Supabase 세션이 없을 때, 백엔드 토큰이 있으면 resetUser 호출하지 않음
        if (!authStorage.hasTokens()) {
          resetUser()
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session)
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [router, setUser, resetUser, checkAuth])

  return null
}

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <SupabaseAuthSync />
      {children}
    </QueryClientProvider>
  )
}