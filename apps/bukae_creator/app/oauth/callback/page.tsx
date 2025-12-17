import { Suspense } from 'react'
import OAuthCallbackClient from './OAuthCallbackClient'

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-gray-600">로그인 정보를 확인하는 중입니다...</p>
        </div>
      }
    >
      <OAuthCallbackClient />
    </Suspense>
  )
}

