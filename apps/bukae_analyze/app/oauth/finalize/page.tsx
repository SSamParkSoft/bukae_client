'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { refreshToken } from '@/lib/services/auth'
import { clearServerAccessToken, syncServerAccessToken } from '@/lib/services/authSession'
import { useAuthStore } from '@/store/useAuthStore'
import type { CurrentUser } from '@/lib/services/auth'

interface SessionPayload {
  accessToken: string
  user: CurrentUser
}

function OAuthFinalizeHandler() {
  const router = useRouter()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    let cancelled = false

    async function finalizeOAuth() {
      try {
        const refreshed = await refreshToken()
        await syncServerAccessToken(refreshed.accessToken)

        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        if (!res.ok) throw new Error('세션 조회 실패')
        const { accessToken, user } = await res.json() as SessionPayload

        if (cancelled) return
        setAccessToken(accessToken)
        setUser(user)
        router.replace('/')
      } catch {
        if (cancelled) return
        clearServerAccessToken().catch(() => {})
        useAuthStore.getState().clearToken()
        router.replace('/login')
      }
    }

    void finalizeOAuth()

    return () => {
      cancelled = true
    }
  }, [router, setAccessToken, setUser])

  return null
}

export default function OAuthFinalizePage() {
  return (
    <Suspense fallback={null}>
      <OAuthFinalizeHandler />
    </Suspense>
  )
}
