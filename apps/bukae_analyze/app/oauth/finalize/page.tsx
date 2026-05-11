'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'
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
      } catch (error) {
        if (cancelled) return
        console.warn('[OAuthFinalize] failed:', error)
        clearServerAccessToken().catch((clearError) => {
          console.warn('[OAuthFinalize] clear server access token failed:', clearError)
        })
        useAuthStore.getState().clearToken()
        router.replace('/login')
      }
    }

    void finalizeOAuth()

    return () => {
      cancelled = true
    }
  }, [router, setUser])

  return (
    <main className="relative min-h-dvh">
      <AnalysisLoadingOverlay
        visible
        label="로그인 처리 중..."
        stageLabel="계정 정보를 확인하고 있습니다."
      />
    </main>
  )
}

export default function OAuthFinalizePage() {
  return <OAuthFinalizeHandler />
}
