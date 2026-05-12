'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import type { CurrentUser } from '@/lib/services/auth'
import { refreshToken } from '@/lib/services/auth'
import { syncServerAccessToken } from '@/lib/services/authSession'
import { useAuthStore } from '@/store/useAuthStore'

interface SessionPayload {
  user: CurrentUser
}

export function AuthSessionBootstrap() {
  const pathname = usePathname()
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (pathname.startsWith('/oauth/')) return
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    let cancelled = false

    async function syncAuthSession() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })

        if (!res.ok) {
          if (res.status === 401) {
            // BFF 쿠키 만료 — refresh 시도
            try {
              const refreshed = await refreshToken()
              const user = await syncServerAccessToken(refreshed.accessToken)
              if (!cancelled) useAuthStore.getState().setUser(user)
            } catch {
              if (!cancelled) useAuthStore.getState().clearUser()
            }
          } else {
            if (!cancelled) useAuthStore.getState().clearUser()
          }
          return
        }

        const { user } = await res.json() as SessionPayload
        if (cancelled) return
        useAuthStore.getState().setUser(user)
      } catch {
        if (cancelled) return
        useAuthStore.getState().clearUser()
      }
    }

    void syncAuthSession()

    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}
