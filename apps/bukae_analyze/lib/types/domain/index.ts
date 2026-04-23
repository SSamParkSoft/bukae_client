/**
 * Domain Models
 *
 * 앱 전체에서 사용하는 표준 타입.
 * - 네이밍: camelCase
 * - 날짜: Date 객체 (string → Date 변환은 mapper에서)
 * - 의미 없는 null은 제거, 필요한 경우만 optional
 *
 * ✅ 컴포넌트, 훅, Zustand store 등 앱 전반에서 이 타입을 사용한다.
 * ✅ API 타입이 바뀌어도 도메인 모델은 안정적으로 유지한다.
 */

// 각 도메인별 타입을 아래에 re-export
// export * from './channelStats'
// export * from './videoStats'
export * from './videoAnalysis'
export * from './projectAnalysis'
export * from './planningSetup'
export * from './aiPlanning'
export * from './shootingGuide'
