'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist?.hasHydrated() ?? false)

  useEffect(() => {
    const unsub = useAuthStore.persist?.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist?.hasHydrated()) setHydrated(true)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login')
    }
  }, [hydrated, accessToken, router])

  // persist rehydration 전이거나 미인증이면 아무것도 렌더하지 않음
  if (!hydrated || !accessToken) return null

  return <>{children}</>
}
