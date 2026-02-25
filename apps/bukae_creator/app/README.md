# App 레벨 캐시 가이드

## 사용처

### `providers.tsx`
- `QueryClient`를 생성해 React Query 메모리 캐시 제공
- `AuthSync`는 인증 만료 시 store/token 정리 트리거 수행

## 왜 필요한가

- 앱 전역에서 API 응답 재사용
- 인증 상태 변화 시 캐시/상태 정리를 일관되게 처리

## 주의

- 현재 Query cache는 persistent storage(localStorage)로 저장하지 않음
