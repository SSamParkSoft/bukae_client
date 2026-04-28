'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, submitBenchmark } from '@/lib/services/projects'

export function useBenchmarkUrlSubmission() {
  const router = useRouter()
  const [benchmarkUrl, setBenchmarkUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeBenchmarkUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBenchmarkUrl(e.target.value)
  }

  const submitBenchmarkUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!benchmarkUrl.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const project = await createProject()
      await submitBenchmark(project.projectId, benchmarkUrl.trim())
      router.push(`/analysis?projectId=${encodeURIComponent(project.projectId)}`)
    } catch (err) {
      console.error('분석 요청 실패:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    benchmarkUrl,
    changeBenchmarkUrl,
    submitBenchmarkUrl,
    isSubmitting,
  }
}
