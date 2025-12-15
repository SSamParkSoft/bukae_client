// Studio - Title API 함수

import { api } from './client'
import type { StudioTitleRequest, StudioTitleResponse } from '@/lib/types/api/studio-title'

export const studioTitleApi = {
  /**
   * AI 제목 및 설명 생성
   * POST /api/v1/studio/titles
   */
  createTitle: async (data: StudioTitleRequest): Promise<StudioTitleResponse> => {
    return api.post<StudioTitleResponse>('/api/v1/studio/titles', data)
  },
}


