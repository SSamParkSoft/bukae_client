// Studio - Meta API 함수 (제목, 해시태그, 상세설명)

import { api } from './client'
import type {
  StudioMetaRequest,
  StudioTitleResponse,
  StudioHashtagsResponse,
  StudioDescriptionResponse,
} from '@/lib/types/api/studio-meta'

export const studioMetaApi = {
  /**
   * AI 영상 제목 생성
   * POST /api/v1/studio/meta/titles
   */
  createTitle: async (data: StudioMetaRequest): Promise<StudioTitleResponse> => {
    return api.post<StudioTitleResponse>('/api/v1/studio/meta/titles', data)
  },

  /**
   * AI 영상 해시태그 생성
   * POST /api/v1/studio/meta/hashtags
   */
  createHashtags: async (data: StudioMetaRequest): Promise<StudioHashtagsResponse> => {
    return api.post<StudioHashtagsResponse>('/api/v1/studio/meta/hashtags', data)
  },

  /**
   * AI 영상 상세설명 생성
   * POST /api/v1/studio/meta/descriptions
   */
  createDescription: async (data: StudioMetaRequest): Promise<StudioDescriptionResponse> => {
    return api.post<StudioDescriptionResponse>('/api/v1/studio/meta/descriptions', data)
  },
}

