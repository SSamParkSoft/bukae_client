// Studio - Script API 함수

import { api } from './client'
import type {
  StudioScriptAutoCreateRequest,
  StudioScriptRequestPro,
  StudioScriptResponse,
} from '@/lib/types/api/studio-script'

export const studioScriptApi = {
  /**
   * [Fast] AI 기반 쇼츠 대본 생성 (Stateless)
   * POST /api/v1/studio/scripts/auto-create
   * - 사용자가 선택한 이미지(URL)와 프롬프트를 기반으로 19가지 스크립트 페르소나 지원
   * - 15초 내외, 1씬 1문장 규칙
   */
  generateScripts: async (data: StudioScriptAutoCreateRequest): Promise<StudioScriptResponse> => {
    return api.post<StudioScriptResponse>('/api/v1/studio/scripts/auto-create', data)
  },

  /**
   * [Pro] 대본 생성 (Pro 전용 엔드포인트)
   * POST /api/v1/studio/scripts
   */
  generateScriptsPro: async (data: StudioScriptRequestPro): Promise<StudioScriptResponse> => {
    return api.post<StudioScriptResponse>('/api/v1/studio/scripts', data)
  },
}


