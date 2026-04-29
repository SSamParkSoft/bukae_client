// --- Domain Command Types (mutation 입력) ---

import type { ProjectWorkflow } from './workflow'
import { isProjectGenerationCompleted } from './workflow'

export interface GenerationStartCommand {
  briefVersionId: string
  generationMode: 'single'
  variantCount: number
}

// --- Domain Model Types ---

export type GenerationWorkflowStatus =
  | 'preparing'
  | 'generatingGuide'
  | 'generatingScript'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'unknown'

export interface GenerationWorkflow {
  status: GenerationWorkflowStatus
  rawStatus: string | null
}

export function createGenerationWorkflow(rawStatus: string | null): GenerationWorkflow {
  switch (rawStatus) {
    case 'PREPARING':
      return { status: 'preparing', rawStatus }
    case 'GENERATING_GUIDE':
      return { status: 'generatingGuide', rawStatus }
    case 'GENERATING_SCRIPT':
      return { status: 'generatingScript', rawStatus }
    case 'REVIEWING':
      return { status: 'reviewing', rawStatus }
    case 'COMPLETED':
      return { status: 'completed', rawStatus }
    case 'FAILED':
      return { status: 'failed', rawStatus }
    default:
      return { status: 'unknown', rawStatus }
  }
}

export interface GenerationArtifact {
  generatedArtifactId: string | null
  artifactType: string
  artifactVersion: number | null
  storageKey: string | null
  publicUrl: string | null
  contentChecksum: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date | null
  updatedAt: Date | null
}

export interface GenerationFailure {
  summary: string | null
  message: string | null
  retryable: boolean
  code: string | null
}

export interface Generation {
  projectId: string | null
  generationRequestId: string
  briefVersionId: string | null
  generationStatus: string
  workflow: GenerationWorkflow
  generationMode: string | null
  variantCount: number | null
  guideUrl: string | null
  scriptUrl: string | null
  shootingGuide: import('./shootingGuide').ShootingGuide | null
  scriptPreview: string
  qaSurface: Record<string, unknown> | null
  generationQualityReview: Record<string, unknown> | null
  variantBundle: Record<string, unknown> | null
  artifacts: GenerationArtifact[]
  lastErrorCode: string | null
  lastErrorMessage: string | null
  failure: GenerationFailure | null
  projectStatus: string | null
  currentStep: string | null
  projectWorkflow: ProjectWorkflow
  startedAt: Date | null
  completedAt: Date | null
  updatedAt: Date | null
}

export function isGenerationWorkflowCompleted(generation: Generation | null): boolean {
  return (
    generation?.workflow.status === 'completed' ||
    Boolean(generation && isProjectGenerationCompleted(generation.projectWorkflow))
  )
}

export function isGenerationWorkflowFailed(generation: Generation): boolean {
  return generation.workflow.status === 'failed'
}
