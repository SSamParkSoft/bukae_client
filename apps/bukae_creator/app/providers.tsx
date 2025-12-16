'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'
import { authStorage } from '@/lib/api/auth-storage'
import { useUserStore } from '@/store/useUserStore'

function SupabaseAuthSync() {
  const setUser = useUserStore((state) => state.setUser)
  const resetUser = useUserStore((state) => state.reset)
  const checkAuth = useUserStore((state) => state.checkAuth)

  useEffect(() => {
    // 백엔드 토큰이 있으면 Supabase 동기화 완전히 건너뛰기 (백엔드 OAuth2 사용)
    // 주기적으로 체크하여 토큰이 있으면 인증 상태만 업데이트
    const checkBackendAuth = () => {
      if (authStorage.hasTokens()) {
        checkAuth()
        return true
      }
      return false
    }

    // 즉시 체크
    if (checkBackendAuth()) {
      return
    }

    // 백엔드 토큰이 없는 경우에만 Supabase 동기화 실행
    const supabase = getSupabaseClient()

    const syncSession = (session: Session | null) => {
      // 백엔드 토큰이 있으면 Supabase 동기화 중단
      if (authStorage.hasTokens()) {
        checkAuth()
        return
      }

      if (session?.access_token && session?.refresh_token) {
        authStorage.setTokens(session.access_token, session.refresh_token)
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
      // 세션 조회 후에도 백엔드 토큰 체크
      if (!checkBackendAuth()) {
        syncSession(data.session)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // 상태 변경 시에도 백엔드 토큰 체크
      if (!checkBackendAuth()) {
        syncSession(session)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, resetUser, checkAuth])

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