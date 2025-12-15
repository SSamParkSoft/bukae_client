// Studio - Script API 함수

import { api } from './client'
import type { StudioScriptRequest, StudioScriptResponse } from '@/lib/types/api/studio-script'

export const studioScriptApi = {
  /**
   * AI 기반 쇼츠 대본 생성
   * POST /api/v1/studio/scripts
   */
  generateScripts: async (data: StudioScriptRequest): Promise<StudioScriptResponse> => {
    return api.post<StudioScriptResponse>('/api/v1/studio/scripts', data)
  },
}


