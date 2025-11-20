// Video API 타입 정의

export type JobType = 'AUTO_CREATE_VIDEO_FROM_DATA'

export type StudioJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface ImageScriptPair {
  imageUrl: string
  script: string
}

export interface StudioJobRequest {
  productId: string
  jobType: JobType
  imageScriptPairs: ImageScriptPair[]
}

export interface StudioJob {
  id: string
  jobType: JobType
  status: StudioJobStatus
  imageScriptPairs: ImageScriptPair[]
  progressDetail?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface StudioJobStatusUpdateRequest {
  status?: StudioJobStatus
  progressDetail?: string
  resultVideoUrl?: string
  errorMessage?: string
}

export interface Video {
  id: string
  title?: string
  url: string
  studioJobId: string
  createdAt: string
  updatedAt: string
}

