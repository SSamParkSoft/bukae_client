// --- Domain Command Types (mutation 입력) ---

export interface GenerationStartCommand {
  briefVersionId: string
  generationMode: 'single'
  variantCount: number
}

// --- Domain Model Types ---

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
  startedAt: Date | null
  completedAt: Date | null
  updatedAt: Date | null
}
