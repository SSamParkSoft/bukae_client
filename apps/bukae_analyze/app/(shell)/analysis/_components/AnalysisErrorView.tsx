'use client'

import { useRouter } from 'next/navigation'
import { FileWarning, RefreshCw } from 'lucide-react'
import { PageErrorState } from '@/components/errors/PageErrorState'
import type { AnalysisResourceErrorType } from '@/features/analysisPage/lib/analysisResource'

type Props = {
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
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

export function AnalysisErrorView({ errorType, errorMessage }: Props) {
  const router = useRouter()
  const icon = errorType === 'missing_result' ? FileWarning : RefreshCw

  return (
    <PageErrorState
      title={getErrorTitle(errorType)}
      description={getErrorDescription(errorType, errorMessage)}
      icon={icon}
      actions={[
        { label: '다시 시도', onClick: () => router.refresh() },
        { label: '처음으로', href: '/', variant: 'secondary' },
      ]}
    />
  )
}
