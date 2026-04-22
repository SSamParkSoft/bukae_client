import type { AnalysisResourceErrorType } from '@/features/analysisPage/hooks/state/useAnalysisResource'

type Props = {
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
}

function getErrorTitle(errorType: AnalysisResourceErrorType | null): string {
  if (errorType === 'missing_result') return '분석 결과를 불러오지 못했습니다'
  return '분석에 실패했습니다'
}

export function AnalysisErrorView({ errorType, errorMessage }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <p className="font-20-md text-white">{getErrorTitle(errorType)}</p>
      {errorMessage && <p className="font-14-rg text-white/60">{errorMessage}</p>}
    </div>
  )
}
