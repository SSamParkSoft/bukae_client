/**
 * Video API DTO (Data Transfer Object) 정의
 * 
 * 이 파일의 타입들은 백엔드 API와의 통신을 위한 DTO입니다.
 * 내부 도메인 로직에서는 사용하지 않고, 반드시 변환 함수를 통해
 * 도메인 모델로 변환하여 사용해야 합니다.
 * 
 * @see lib/types/domain/video.ts - Video 도메인 모델
 * @see lib/utils/converters/video.ts - 변환 함수
 */

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

