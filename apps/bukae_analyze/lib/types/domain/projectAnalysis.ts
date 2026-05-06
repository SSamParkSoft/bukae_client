import type { VideoAnalysisResult } from './videoAnalysis'
import type { ProjectWorkflow } from './workflow'

export interface ProjectSession {
  projectId: string
  projectStatus: string
  currentStep: string | null
  workflow: ProjectWorkflow
}

export interface ProjectPollingState {
  projectStatus: string
  currentStep: string | null
  workflow: ProjectWorkflow
  activeBriefVersionId: string | null
  lastSummary: string | null
  errorMessage: string | null
}

export interface BenchmarkSubmissionState extends ProjectSession {
  submissionStatus: string
}

export interface AnalysisProgressState {
  stage: string | null
  status: string | null
  percent: number | null
  stageIndex: number | null
  stageLabel: string | null
  stageTotal: number | null
  updatedAt: string | null
}

export interface AnalysisPollingState {
  submissionStatus: string
  analysisStatus: string | null
  projectStatus: string | null
  currentStep: string | null
  readyForCategorySelection: boolean
  errorMessage: string | null
  hasResult: boolean
  progress: AnalysisProgressState | null
}

export interface AnalysisSnapshot {
  polling: AnalysisPollingState
  result: VideoAnalysisResult | null
}
