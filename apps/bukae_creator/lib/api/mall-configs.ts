// 쇼핑몰 트래킹 ID 설정 API

import { api } from './client'
import type { MallConfig, MallConfigRequest, MallConfigResponse } from '@/lib/types/api/mall-configs'

/**
 * 사용자의 쇼핑몰 트래킹 ID 설정 목록 조회
 * GET /api/v1/users/me/mall-configs
 */
export async function getMallConfigs(): Promise<MallConfig[]> {
  return api.get<MallConfig[]>('/api/v1/users/me/mall-configs')
}

/**
 * 쇼핑몰 트래킹 ID 설정 저장/수정
 * POST /api/v1/users/me/mall-configs
 * 
 * @param mallType - 쇼핑몰 타입 (ALI_EXPRESS, COUPANG, AMAZON)
 * @param trackingId - 트래킹 ID
 */
export async function saveMallConfig(
  mallType: MallConfigRequest['mallType'],
  trackingId: string
): Promise<MallConfigResponse> {
  const request: MallConfigRequest = {
    mallType,
    trackingId,
  }
  return api.post<MallConfigResponse>('/api/v1/users/me/mall-configs', request)
}

