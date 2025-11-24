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

  useEffect(() => {
    const supabase = getSupabaseClient()

    const syncSession = (session: Session | null) => {
      if (session?.access_token && session?.refresh_token) {
        authStorage.setTokens(session.access_token, session.refresh_token)
      } else {
        authStorage.clearTokens()
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
        resetUser()
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
    }
  }, [setUser, resetUser])

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