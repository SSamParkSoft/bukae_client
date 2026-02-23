// Studio - Script API 함수

import { api } from './client'
import type {
  StudioScriptAutoCreateRequest,
  StudioScriptRequestPro,
  StudioScriptResponse,
  StudioScriptUserEditGuideRequest,
  StudioScriptUserEditGuideResponseItem,
  StudioScriptUserEditResponse,
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
   * [Pro] 사용자 촬영 대본 생성 (1단계)
   * POST /api/v1/studio/scripts/user-edit/script
   * - 사용자가 직접 촬영할 영상을 위한 맞춤형 나레이션 대본 우선 생성
   */
  generateScriptUserEdit: async (
    data: StudioScriptRequestPro
  ): Promise<StudioScriptUserEditResponse> => {
    return api.post<StudioScriptUserEditResponse>('/api/v1/studio/scripts/user-edit/script', data)
  },

  /**
   * [Pro] 대본 생성 (Pro 레거시 엔드포인트)
   * POST /api/v1/studio/scripts
   */
  generateScriptsPro: async (data: StudioScriptRequestPro): Promise<StudioScriptResponse> => {
    return api.post<StudioScriptResponse>('/api/v1/studio/scripts', data)
  },

  /**
   * [Pro] 사용자 촬영 가이드 생성 (2단계)
   * POST /api/v1/studio/scripts/user-edit/guide
   * - 1단계 대본을 기반으로 촬영 지문(Action Guide) 생성
   * - 응답: 단일 객체 또는 배열
   */
  generateGuideUserEdit: async (
    data: StudioScriptUserEditGuideRequest
  ): Promise<StudioScriptUserEditGuideResponseItem | StudioScriptUserEditGuideResponseItem[]> => {
    return api.post<StudioScriptUserEditGuideResponseItem | StudioScriptUserEditGuideResponseItem[]>(
      '/api/v1/studio/scripts/user-edit/guide',
      data
    )
  },
}


