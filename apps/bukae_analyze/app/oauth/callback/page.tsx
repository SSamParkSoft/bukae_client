'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchCurrentUser } from '@/lib/services/auth'
import { clearServerAccessToken, syncServerAccessToken } from '@/lib/services/authSession'

function OAuthCallbackHandler() {
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

    Promise.all([
      syncServerAccessToken(token).catch(() => {}),
      fetchCurrentUser(token),
    ])
      .then(([, user]) => {
        setUser(user)
        router.replace('/')
      })
      .catch(() => {
        clearServerAccessToken().catch(() => {})
        useAuthStore.getState().clearToken()
        router.replace('/login')
      })
  }, [searchParams, setAccessToken, setUser, router])

  return null
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OAuthCallbackHandler />
    </Suspense>
  )
}
