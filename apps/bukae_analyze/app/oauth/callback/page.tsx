'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchCurrentUser } from '@/lib/services/auth'

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

    fetchCurrentUser(token)
      .then((user) => {
        setUser(user)
        router.replace('/')
      })
      .catch(() => {
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
