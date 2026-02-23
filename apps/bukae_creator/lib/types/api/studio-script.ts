/**
 * Studio Script API DTO (Data Transfer Object) 정의
 * 백엔드 OpenAPI 스펙: POST /api/v1/studio/scripts/auto-create
 *
 * 이 파일의 타입들은 백엔드 API와의 통신을 위한 DTO입니다.
 */

import type { ConceptType } from '@/lib/data/templates'
import type { ProductResponse } from './products'

// 대본 스타일 타입 (ShortsScriptType Code = ConceptType)
export type ScriptType = ConceptType

/**
 * /api/v1/studio/scripts/auto-create 요청 스키마
 * - product: 상품 정보 (product 내 imageUrls + 기타 필드)
 * - type: 스크립트 페르소나 Code (UNEXPECTED_TIP, MUST_BUY_ITEM 등 19종)
 * - imageUrls: 루트 레벨 이미지 URL 배열 (대본 생성에 사용할 선택 이미지)
 */
export interface StudioScriptAutoCreateRequest {
  product: ProductResponse & { imageUrls: string[] }
  type: ScriptType
  imageUrls: string[]
}

/** [Pro] 기존 스크립트 API 요청 (product + type + imageUrls) */
export interface StudioScriptRequestPro {
  product: ProductResponse
  type: ScriptType
  imageUrls: string[]
}

/**
 * [Pro] 사용자 촬영 대본 생성 (1단계) 응답
 * POST /api/v1/studio/scripts/user-edit/script
 * - scene: 씬 번호 (1-based)
 * - script: 생성된 나레이션 대본
 * - duration: 재생 시간(초)
 */
export interface StudioScriptUserEditResponse {
  scene: number
  script: string
  duration: number
}

/**
 * [Pro] 촬영 가이드 생성 (2단계) 요청
 * POST /api/v1/studio/scripts/user-edit/guide
 * - product: 상품 정보
 * - type: 스크립트 타입 (VIRAL 등)
 * - previousScripts: 1단계에서 생성된 씬별 대본 목록
 */
export interface StudioScriptUserEditGuideRequest {
  product: ProductResponse
  type: ScriptType
  previousScripts: Array<{ scene: number; script: string; duration?: number }>
}

/**
 * [Pro] 촬영 가이드 생성 (2단계) 응답 1건
 * - scene: 씬 번호 (1-based)
 * - script: 나레이션 대본
 * - actionGuide: 촬영 지문(액션 가이드)
 * - duration: 재생 시간(초)
 */
export interface StudioScriptUserEditGuideResponseItem {
  scene: number
  script: string
  actionGuide: string
  duration: number
}

/** 대본 1건 응답 (imageUrl + script) */
export interface StudioScriptResponseItem {
  imageUrl: string
  script: string
}

/** 200 OK 시 생성된 대본 리스트 */
export type StudioScriptResponse = StudioScriptResponseItem[]

