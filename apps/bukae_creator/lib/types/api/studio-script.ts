/**
 * Studio Script API DTO (Data Transfer Object) 정의
 * 백엔드 OpenAPI 스펙 기준
 * 
 * 이 파일의 타입들은 백엔드 API와의 통신을 위한 DTO입니다.
 * 내부 도메인 로직에서는 사용하지 않고, 반드시 변환 함수를 통해
 * 도메인 모델로 변환하여 사용해야 합니다.
 */

import type { ConceptType } from '@/lib/data/templates'

// 대본 스타일 타입 (ConceptType과 동일)
export type ScriptType = ConceptType

// /api/v1/studio/scripts 의 요청 스키마 (ScriptRequest)
export interface StudioScriptRequest {
  topic: string // 상품명 또는 영상 주제
  description: string // 핵심 설명/키워드 요약
  type: ScriptType // 대본 스타일
  imageUrls: string[] // 분석할 이미지 URL 목록
}

// /api/v1/studio/scripts 의 응답 스키마 (ScriptResponse)
export interface StudioScriptResponseItem {
  imageUrl: string
  script: string
}

// 구현체에 따라 단일 객체 또는 배열을 반환할 수 있으므로 Union 타입으로 정의
export type StudioScriptResponse = StudioScriptResponseItem | StudioScriptResponseItem[]

