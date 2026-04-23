'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchCurrentUser } from '@/lib/services/auth'
import { clearServerAccessToken } from '@/lib/services/authSession'
import { useAuthStore } from '@/store/useAuthStore'

function OAuthFinalizeHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const setUser = useAuthStore((s) => s.setUser)

  useEffect(() => {
    const token = searchParams.get('accessToken')

    if (!token) {
      router.replace('/login')
      return
    }

    setAccessToken(token)

    fetchCurrentUser(token)
      .then((user) => {
        setUser(user)
        router.replace('/')
      })
      .catch(() => {
        clearServerAccessToken().catch(() => {})
        useAuthStore.getState().clearToken()
        router.replace('/login')
      })
  }, [router, searchParams, setAccessToken, setUser])

  return null
}

export default function OAuthFinalizePage() {
  return (
    <Suspense fallback={null}>
      <OAuthFinalizeHandler />
    </Suspense>
  )
}
