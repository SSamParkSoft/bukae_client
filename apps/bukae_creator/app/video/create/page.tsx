'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StepIndicator from '../../../components/StepIndicator'

export default function VideoCreatePage() {
  const router = useRouter()

  useEffect(() => {
    // 기본적으로 step1로 리다이렉트
    router.replace('/video/create/step1')
  }, [router])

  return (
    <div className="flex min-h-screen">
      <StepIndicator />
      <div className="flex-1 ml-48">
        {/* 리다이렉트 중 로딩 표시 */}
        <div className="p-8">
          <div className="animate-pulse">로딩 중...</div>
        </div>
      </div>
    </div>
  )
}

