'use client'

import { useEffect, useRef } from 'react'
import type { CurrentUser } from '@/lib/services/auth'
import { useAuthStore } from '@/store/useAuthStore'

interface SessionPayload {
  accessToken: string
  user: CurrentUser
}

export function AuthSessionBootstrap() {
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    let cancelled = false

    async function syncAuthSession() {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!res.ok) {
          useAuthStore.getState().clearToken()
          return
        }

        const { accessToken, user } = await res.json() as SessionPayload

        if (cancelled) return
        useAuthStore.getState().setAccessToken(accessToken)
        useAuthStore.getState().setUser(user)
      } catch {
        if (cancelled) return
        useAuthStore.getState().clearToken()
      }
    }

    void syncAuthSession()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
