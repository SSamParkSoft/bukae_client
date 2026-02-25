# React Query 캐시 가이드

이 디렉토리의 훅은 `@tanstack/react-query`의 메모리 캐시를 사용합니다.

## 공통 원칙

- 캐시는 `QueryClient` 메모리에만 존재 (localStorage persist 미사용)
- 새로고침 시 캐시는 초기화
- 각 훅에서 `staleTime`/`refetchInterval`로 데이터 신선도 제어

## 주요 캐시 설정

- `useAuth.ts`
  - `queryKey: ['current-user']`
  - `staleTime: 5분`
- `useVideos.ts`
  - `['videos']`, `['my-videos']`, `['videos', videoId]`
  - `staleTime: 30초`
- `useStudio.ts`
  - `['studio-jobs', jobId]`
  - `staleTime: 0` (항상 최신)
- `useMediaAssets.ts`
  - `['media-assets']`
  - `staleTime: 5분`
- `useCoupangStats.ts`, `useYouTubeStats.ts`
  - `staleTime: 30분`
  - 로그인 시 `refetchInterval: 1시간`

## 왜 필요한가

- 동일 데이터의 중복 API 호출 감소
- 화면 전환 시 빠른 재표시
- 데이터 성격별로 최신성/성능 균형 확보
