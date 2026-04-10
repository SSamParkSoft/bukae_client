/**
 * [_example] Domain → ViewModel 변환 훅
 *
 * Domain Model을 받아 ViewModel로 변환한다.
 * - 숫자 포맷팅, 날짜 포맷팅
 * - UI 전용 파생 상태 계산
 *
 * ✅ 이 훅은 데이터를 fetch하지 않는다. 변환만 담당한다.
 * ✅ 순수 변환이므로 useMemo로 최적화 가능.
 */

// import { useMemo } from 'react'
// import type { ExampleDomain } from '@/lib/types/domain'
// import type { ExampleViewModel } from '../types/viewModel'

// export function useExampleViewModel(domain: ExampleDomain): ExampleViewModel {
//   return useMemo(() => ({
//     formattedCount: domain.count.toLocaleString('ko-KR'),
//     trendLabel: domain.changeRate >= 0
//       ? `+${domain.changeRate.toFixed(1)}%`
//       : `${domain.changeRate.toFixed(1)}%`,
//     isPositive: domain.changeRate >= 0,
//   }), [domain])
// }
