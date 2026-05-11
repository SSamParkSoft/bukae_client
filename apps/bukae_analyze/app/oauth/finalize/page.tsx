'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { refreshToken } from '@/lib/services/auth'
import { clearServerAccessToken, syncServerAccessToken } from '@/lib/services/authSession'
import { useAuthStore } from '@/store/useAuthStore'

function OAuthFinalizeHandler() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    let cancelled = false

    async function finalizeOAuth() {
      try {
        const refreshed = await refreshToken()
        const user = await syncServerAccessToken(refreshed.accessToken)

        if (cancelled) return
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
  }, [router, setUser])

  return null
}

export default function OAuthFinalizePage() {
  return (
    <Suspense fallback={null}>
      <OAuthFinalizeHandler />
    </Suspense>
  )
}
