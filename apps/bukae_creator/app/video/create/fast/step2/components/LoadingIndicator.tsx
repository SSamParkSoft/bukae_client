'use client'

import { memo } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingIndicatorProps {
  message?: string
}

export const LoadingIndicator = memo(function LoadingIndicator({
  message = '인증 확인 중...',
}: LoadingIndicatorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-background-start">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-teal" />
        <p className="text-brand-teal-dark">{message}</p>
      </div>
    </div>
  )
})
