'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function ProTrackStep1Placeholder() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold text-brand-teal-dark">
        Pro Track은 준비 중입니다
      </h1>
      <p className="text-text-muted text-center">
        예비창업가를 위한 전문적인 AI 영상 제작 플로우가 곧 제공됩니다.
      </p>
      <Button
        variant="outline"
        onClick={() => router.push('/video/create')}
      >
        제작 방식 선택으로 돌아가기
      </Button>
    </div>
  )
}
