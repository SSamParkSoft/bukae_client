'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, submitBenchmark } from '@/lib/services/projects'

export function useUrlInput() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const project = await createProject()
      await submitBenchmark(project.projectId, url.trim())
      router.push(`/analysis?projectId=${encodeURIComponent(project.projectId)}`)
    } catch (err) {
      console.error('분석 요청 실패:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return { url, handleChange, handleSubmit, isSubmitting }
}
