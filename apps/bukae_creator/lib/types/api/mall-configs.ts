// 쇼핑몰 트래킹 ID 설정 관련 타입 정의

import type { TargetMall } from './products'

/**
 * 쇼핑몰 트래킹 ID 설정 정보
 */
export interface MallConfig {
  mallType: TargetMall
  trackingId: string
  updatedAt: string
}

/**
 * 쇼핑몰 트래킹 ID 설정 저장/수정 요청
 */
export interface MallConfigRequest {
  mallType: TargetMall
  trackingId: string
}

/**
 * 쇼핑몰 트래킹 ID 설정 저장/수정 응답
 */
export interface MallConfigResponse {
  mallType: TargetMall
  trackingId: string
  updatedAt: string
}

