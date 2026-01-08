'use client'

import { memo } from 'react'
import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string
}

export const ErrorMessage = memo(function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="mb-8 rounded-lg bg-red-50 border border-red-200 p-6">
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="w-5 h-5" />
        <span className="text-base">{message}</span>
      </div>
    </div>
  )
})
