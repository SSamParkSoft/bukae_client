/**
 * Mock Data (UI 개발용)
 *
 * API 연동 전 UI 개발에 사용하는 정적 데이터.
 * Domain Model 형태로 제공한다. (API 타입이 아님)
 *
 * ✅ 컴포넌트는 mock이든 실제 API든 동일한 Domain Model을 받는다.
 * ✅ API 연동 시 Service 함수로 교체하기만 하면 된다.
 *
 * 사용 예시:
 *   const data = MOCK_CHANNEL_STATS  // UI 개발 중
 *   const data = await fetchChannelStats()  // API 연동 후
 *
 * 도메인별 mock 데이터를 아래에 추가:
 * export * from './channelStats'
 * export * from './videoStats'
 */
