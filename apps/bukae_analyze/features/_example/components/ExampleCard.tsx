/**
 * [_example] UI 컴포넌트
 *
 * ViewModel을 props로 받아 화면에 표시만 한다.
 * - API 호출 없음
 * - 데이터 변환 없음
 * - 포맷팅 없음 (이미 ViewModel에서 완료)
 *
 * ✅ props 타입은 ViewModel을 사용한다.
 * ✅ 비즈니스 로직 없이 순수하게 렌더링만 담당한다.
 */

// import type { ExampleViewModel } from '../types/viewModel'
//
// interface Props {
//   data: ExampleViewModel
// }
//
// export function ExampleCard({ data }: Props) {
//   return (
//     <div>
//       <span>{data.formattedCount}</span>
//       <span style={{ color: data.isPositive ? 'green' : 'red' }}>
//         {data.trendLabel}
//       </span>
//     </div>
//   )
// }
