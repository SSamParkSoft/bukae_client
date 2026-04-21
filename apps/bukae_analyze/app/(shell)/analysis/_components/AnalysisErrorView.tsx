type Props = {
  errorMessage: string | null
}

export function AnalysisErrorView({ errorMessage }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <p className="font-20-md text-white">분석에 실패했습니다</p>
      {errorMessage && <p className="font-14-rg text-white/60">{errorMessage}</p>}
    </div>
  )
}
