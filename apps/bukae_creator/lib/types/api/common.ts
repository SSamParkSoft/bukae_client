/**
 * 공통 API 타입 정의
 * 모든 API에서 공통으로 사용되는 타입들을 정의합니다.
 */

/**
 * API 응답 래퍼 타입
 * 성공적인 API 응답을 감싸는 공통 구조
 */
export interface ApiResponse<T> {
  data: T
  message?: string
  statusCode?: number
}

/**
 * API 에러 응답 타입
 */
export interface ApiErrorResponse {
  error: string
  message: string
  statusCode: number
  details?: unknown
}

/**
 * 페이지네이션 메타데이터
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * 페이지네이션된 API 응답
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

/**
 * API 요청 공통 옵션
 */
export interface ApiRequestOptions {
  timeout?: number
  headers?: Record<string, string>
  signal?: AbortSignal
}

/**
 * API 응답 공통 메타데이터
 */
export interface ApiResponseMeta {
  timestamp?: string
  requestId?: string
  version?: string
}

/**
 * 성공 응답 타입 (공통 구조)
 */
export interface SuccessResponse<T> {
  success: true
  data: T
  meta?: ApiResponseMeta
}

/**
 * 실패 응답 타입 (공통 구조)
 */
export interface FailureResponse {
  success: false
  error: ApiErrorResponse
  meta?: ApiResponseMeta
}

/**
 * API 응답 Union 타입
 */
export type ApiResult<T> = SuccessResponse<T> | FailureResponse

