// Video Production API 함수

import { api } from './client'
import type {
  StudioJobRequest,
  StudioJob,
  StudioJobStatusUpdateRequest,
} from '@/lib/types/api/video'

export const studioApi = {
  /**
   * 영상 생성 작업 요청
   * POST /api/v1/studio/jobs
   */
  createStudioJob: async (data: StudioJobRequest): Promise<StudioJob> => {
    return api.post<StudioJob>('/api/v1/studio/jobs', data)
  },

  /**
   * 영상 제작 상태 조회
   * GET /api/v1/studio/jobs/{jobId}
   */
  getStudioJob: async (jobId: string): Promise<StudioJob> => {
    return api.get<StudioJob>(`/api/v1/studio/jobs/${jobId}`)
  },

  /**
   * 영상 제작 상태 업데이트
   * PATCH /api/v1/studio/jobs/{jobId}/status
   */
  updateStudioJobStatus: async (
    jobId: string,
    data: StudioJobStatusUpdateRequest
  ): Promise<StudioJob> => {
    return api.patch<StudioJob>(`/api/v1/studio/jobs/${jobId}/status`, data)
  },
}

