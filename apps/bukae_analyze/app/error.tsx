'use client'

import { PageErrorState } from '@/components/errors/PageErrorState'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('[RootErrorBoundary]', error)

  return (
    <main className="flex min-h-dvh min-w-0 flex-col">
      <PageErrorState
        title="화면을 불러오지 못했습니다"
        description="일시적인 오류가 발생했습니다. 화면을 새로고침해도 문제가 계속되면 처음 화면에서 다시 시작해주세요."
        actions={[
          { label: '새로고침', onClick: reset },
          { label: '처음으로', href: '/', variant: 'secondary' },
        ]}
      />
    </main>
  )
}
