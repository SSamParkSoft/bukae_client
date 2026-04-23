'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const hydrated = useSyncExternalStore(
    (onStoreChange) => {
      const unsubHydrate = useAuthStore.persist?.onHydrate(onStoreChange)
      const unsubFinish = useAuthStore.persist?.onFinishHydration(onStoreChange)
      return () => {
        unsubHydrate?.()
        unsubFinish?.()
      }
    },
    () => useAuthStore.persist?.hasHydrated() ?? false,
    () => false
  )

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login')
    }
  }, [hydrated, accessToken, router])

  // persist rehydration 전이거나 미인증이면 아무것도 렌더하지 않음
  if (!hydrated || !accessToken) return null

  return <>{children}</>
}
