'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clearServerAccessToken } from '@/lib/services/authSession'
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

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('세션 조회 실패')
        return res.json() as Promise<SessionPayload>
      })
      .then(({ accessToken, user }) => {
        setAccessToken(accessToken)
        setUser(user)
        router.replace('/')
      })
      .catch(() => {
        clearServerAccessToken().catch(() => {})
        useAuthStore.getState().clearToken()
        router.replace('/login')
      })
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
