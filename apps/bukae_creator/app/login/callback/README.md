# Login Callback 저장 정책

## 사용처

- `LoginCallbackClient.tsx`
  - `authStorage.setTokens(...)` 호출로 access token 저장
  - 실제 localStorage 키 관리는 `lib/api/auth-storage.ts`에서 일괄 처리

## 왜 필요한가

- 로그인 콜백에서 인증 토큰 저장 경로를 단일화
- 저장 포맷 변경 시 콜백 코드 수정 범위를 최소화
