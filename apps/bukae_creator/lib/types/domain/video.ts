/**
 * Video 도메인 모델
 * 내부 애플리케이션에서 사용하는 Video 타입입니다.
 * API 응답과는 분리되어 있습니다.
 */

/**
 * 비디오 편집 데이터
 */
export interface VideoEditData {
  title: string
  effects: string[]
  productContent: Record<string, string> // 상품별 편집 내용
}

/**
 * 스크립트 생성 방법
 */
export type ScriptMethod = 'edit' | 'auto'

/**
 * STEP2 모드 타입
 */
export type Step2Mode = 'manual' | 'auto'

/**
 * STEP2 결과물
 */
export interface Step2Result {
  mode: Step2Mode
  finalScript: string
  selectedImages?: string[] // auto 모드용
  scenes?: unknown[] // auto 모드용 (AutoScene 타입은 별도 정의 필요)
  uploadedVideo?: File // manual 모드용
  draftVideo: string // AI 초안 영상 경로
  referenceVideo?: string // DB 추천 영상 경로
}

/**
 * 스크립트 생성 방법
 */
export type ScriptMethod = 'edit' | 'auto'

/**
 * 생성 모드
 */
export type CreationMode = 'manual' | 'auto'

