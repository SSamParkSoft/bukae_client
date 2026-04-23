/**
 * Mappers (DTO → Domain Model)
 *
 * API Response 타입을 Domain Model로 변환하는 순수 함수 모음.
 * - 서버 네이밍 → 클라이언트 네이밍
 * - ISO string → Date 객체
 * - 중첩 구조 정규화
 *
 * ✅ 이 파일들만 API 타입(DTO)을 알고 있다.
 * ✅ 순수 함수이므로 API 스펙 변경 시 여기만 수정한다.
 *
 * API 연동 시 각 도메인 mapper를 추가:
 * export * from './channelStatsMapper'
 * export * from './videoStatsMapper'
 */

export * from './benchmarkAnalysisMapper'
export * from './projectAnalysisMapper'
export * from './planningMapper'
