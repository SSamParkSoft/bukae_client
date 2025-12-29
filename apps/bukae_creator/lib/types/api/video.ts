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

// 내 영상 목록 조회 API 응답 타입
export type PlatformType = 'COUPANG' | 'NAVER' | 'ALIEXPRESS' | 'AMAZON'

export type ChannelType = 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM'

export interface VideoPost {
  channel: ChannelType
  postUrl: string
}

export interface VideoListItem {
  id: string
  userId: string
  title: string
  description: string
  fileUrl: string
  partnersLink: string
  platformType: PlatformType
  posts: VideoPost[]
  sequence: number
  createdAt: string
}

