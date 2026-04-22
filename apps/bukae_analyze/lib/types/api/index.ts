/**
 * API Response Types (DTO)
 *
 * 서버에서 내려주는 raw JSON 형태 그대로 정의한다.
 * - 네이밍: 서버 규칙 따름 (snake_case 등)
 * - 날짜: 문자열 (ISO string)
 * - null/undefined: 서버 응답 그대로
 *
 * ⚠️ 이 타입은 Service Layer(mappers)에서만 사용한다.
 * 컴포넌트나 훅에서 직접 사용하지 않는다.
 *
 * ⚠️ API 연동 시 Zod 스키마로 검증한 뒤 이 타입으로 캐스팅한다.
 * ex) const parsed = ChannelStatsResponseSchema.parse(data) satisfies ApiChannelStatsResponse
 */

// 각 도메인별 API 타입을 아래에 re-export
export * from './auth'
