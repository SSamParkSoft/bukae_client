/**
 * [_example] ViewModel Types
 *
 * Domain Model → UI에 필요한 형태로 파생한 타입.
 * - 포맷된 문자열 (숫자 → "1,234", Date → "2024.01.15")
 * - UI 전용 파생 상태 (증가/감소 여부, 색상 등)
 * - 컴포넌트가 props로 받는 타입
 *
 * ⚠️ API 호출, 상태 관리 등 부수효과 없이 순수 데이터 형태만 정의한다.
 */

// Domain Model import 예시:
// import type { ExampleDomain } from '@/lib/types/domain'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ExampleViewModel {
  // 화면에 바로 표시할 수 있는 형태의 필드들
  // ex) formattedCount: string    // "1,234"
  // ex) trendLabel: string        // "+12.3%"
  // ex) isPositive: boolean       // 색상 결정용
}
