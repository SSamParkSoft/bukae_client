'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, submitBenchmark } from '@/lib/services/projects'

export function useBenchmarkUrlSubmission() {
  const router = useRouter()
  const [benchmarkUrl, setBenchmarkUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const changeBenchmarkUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBenchmarkUrl(e.target.value)
  }

  const submitBenchmarkUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!benchmarkUrl.trim() || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const project = await createProject()
      await submitBenchmark(project.projectId, benchmarkUrl.trim())
      router.push(`/analysis?projectId=${encodeURIComponent(project.projectId)}`)
    } catch (err) {
      console.error('분석 요청 실패:', err)
      setSubmitError(
        err instanceof Error
          ? err.message
          : '분석 요청에 실패했습니다. 화면을 새로고침하거나 처음부터 다시 시작해주세요.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    benchmarkUrl,
    changeBenchmarkUrl,
    submitBenchmarkUrl,
    isSubmitting,
    submitError,
  }
}
