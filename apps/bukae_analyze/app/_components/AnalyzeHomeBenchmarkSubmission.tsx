'use client'

import { BenchmarkUrlSubmissionForm } from '@/app/_components/BenchmarkUrlSubmissionForm'
import { useBenchmarkUrlSubmission } from '@/app/_hooks/useBenchmarkUrlSubmission'

export function AnalyzeHomeBenchmarkSubmission() {
  const {
    benchmarkUrl,
    changeBenchmarkUrl,
    submitBenchmarkUrl,
    isSubmitting,
  } = useBenchmarkUrlSubmission()

  return (
    <BenchmarkUrlSubmissionForm
      benchmarkUrl={benchmarkUrl}
      onBenchmarkUrlChange={changeBenchmarkUrl}
      onSubmitBenchmarkUrl={submitBenchmarkUrl}
      isSubmitting={isSubmitting}
    />
  )
}
