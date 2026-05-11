'use client'

import { useRouter } from 'next/navigation'
import { FileWarning, RefreshCw } from 'lucide-react'
import { PageErrorState } from '@/components/errors/PageErrorState'
import type { ResolvedAppError } from '@/lib/errors/appError'
import type { AnalysisResourceErrorType } from '@/features/analysisPage/lib/analysisResource'

type Props = {
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
  appError: ResolvedAppError | null
}

function getAnalysisErrorActions(
  errorType: AnalysisResourceErrorType | null,
  appError: ResolvedAppError | null,
  retry: () => void
) {
  if (!appError && errorType === 'failed') {
    return [
      { label: '상태 다시 확인', onClick: retry },
      { label: '새 프로젝트 시작', href: '/', variant: 'secondary' as const },
    ]
  }

  switch (appError?.kind) {
    case 'auth_expired':
      return [{ label: '다시 로그인', href: '/login' }]
    case 'forbidden':
      return [{ label: '처음으로', href: '/' }]
    case 'invalid_project_state':
      return [{ label: '새 프로젝트 시작', href: '/' }]
    case 'server_error':
      return [
        { label: '다시 시도', onClick: retry },
        { label: '처음으로', href: '/', variant: 'secondary' as const },
      ]
    case 'network_error':
      return [
        { label: '다시 시도', onClick: retry },
        { label: '처음으로', href: '/', variant: 'secondary' as const },
      ]
    case 'missing_result':
    case 'unknown':
    default:
      return [
        { label: '다시 시도', onClick: retry },
        { label: '새 프로젝트 시작', href: '/', variant: 'secondary' as const },
      ]
  }
}

function getErrorTitle(errorType: AnalysisResourceErrorType | null): string {
  if (errorType === 'missing_result') return '분석 결과를 불러오지 못했습니다'
  return '분석에 실패했습니다'
}

function getErrorDescription(
  errorType: AnalysisResourceErrorType | null,
  errorMessage: string | null
): string {
  if (errorMessage) return errorMessage
  if (errorType === 'missing_result') {
    return '분석은 완료되었지만 화면에 표시할 결과가 없습니다. 다시 시도하거나 처음 화면에서 분석을 다시 시작해주세요.'
  }
  return '분석 상태를 확인하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

export function AnalysisErrorView({ errorType, errorMessage, appError }: Props) {
  const router = useRouter()
  const icon = errorType === 'missing_result' ? FileWarning : RefreshCw
  const title = appError?.title ?? getErrorTitle(errorType)
  const description = appError?.message ?? getErrorDescription(errorType, errorMessage)

  return (
    <PageErrorState
      title={title}
      description={description}
      icon={icon}
      actions={getAnalysisErrorActions(errorType, appError, () => router.refresh())}
    />
  )
}
