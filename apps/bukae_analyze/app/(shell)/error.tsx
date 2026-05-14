'use client'

import { PageErrorState } from '@/components/errors/PageErrorState'

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('[ShellErrorBoundary]', error)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PageErrorState
        title="작업 화면을 불러오지 못했습니다"
        description="현재 단계에서 오류가 발생했습니다. 같은 문제가 반복되면 처음 화면에서 다시 분석을 시작해주세요."
        actions={[
          { label: '새로고침', onClick: reset },
          { label: '처음으로', href: '/', variant: 'secondary' },
        ]}
      />
    </div>
  )
}
