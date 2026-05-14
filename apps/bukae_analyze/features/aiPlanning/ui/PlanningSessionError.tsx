'use client'

import { useRouter } from 'next/navigation'
import { FileWarning } from 'lucide-react'
import { PageErrorState } from '@/components/errors/PageErrorState'
import type { ResolvedAppError } from '@/lib/errors/appError'

function getPlanningSessionErrorActions(
  appError: ResolvedAppError | null,
  refresh: () => void
) {
  switch (appError?.kind) {
    case 'auth_expired':
      return [{ label: '다시 로그인', href: '/login' }]
    case 'forbidden':
      return [{ label: '처음으로', href: '/' }]
    case 'invalid_project_state':
      return [{ label: '새 프로젝트 시작', href: '/' }]
    case 'server_error':
    case 'network_error':
      return [
        { label: '새로고침', onClick: refresh },
        { label: '처음으로', href: '/', variant: 'secondary' as const },
      ]
    case 'missing_result':
    case 'unknown':
    default:
      return [
        { label: '새로고침', onClick: refresh },
        { label: '새 프로젝트 시작', href: '/', variant: 'secondary' as const },
      ]
  }
}

export function PlanningSessionError({
  message,
  appError = null,
}: {
  message: string
  appError?: ResolvedAppError | null
}) {
  const router = useRouter()

  return (
    <PageErrorState
      title={appError?.title ?? '질문을 불러오지 못했습니다'}
      description={appError?.message ?? message}
      icon={FileWarning}
      className="min-h-[520px]"
      actions={getPlanningSessionErrorActions(appError, () => router.refresh())}
    />
  )
}
