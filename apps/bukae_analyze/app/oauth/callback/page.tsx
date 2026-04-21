'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchCurrentUser } from '@/lib/services/auth'

export default function OAuthCallbackPage() {
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
      .then((user) => setUser(user))
      .catch(() => {/* 사용자 정보 실패해도 로그인은 유지 */})
      .finally(() => router.replace('/'))
  }, [searchParams, setAccessToken, setUser, router])

  return null
}
