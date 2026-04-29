import type { VideoAnalysisResult } from './videoAnalysis'

export interface ProjectSession {
  projectId: string
  projectStatus: string
  currentStep: string | null
}

export interface ProjectPollingState {
  projectStatus: string
  currentStep: string | null
  activeBriefVersionId: string | null
  lastSummary: string | null
  errorMessage: string | null
}

export interface BenchmarkSubmissionState extends ProjectSession {
  submissionStatus: string
}

export interface AnalysisPollingState {
  submissionStatus: string
  analysisStatus: string | null
  projectStatus: string | null
  currentStep: string | null
  readyForCategorySelection: boolean
  errorMessage: string | null
  hasResult: boolean
}

export interface AnalysisSnapshot {
  polling: AnalysisPollingState
  result: VideoAnalysisResult | null
}
