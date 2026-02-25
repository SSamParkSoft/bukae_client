# OAuth Callback 저장 정책

## 사용처

- `OAuthCallbackClient.tsx`
  - `authStorage.setTokens(...)` 호출로 access token 저장
  - 실제 localStorage 키 관리는 `lib/api/auth-storage.ts`에서 일괄 처리

## 왜 필요한가

- OAuth 콜백에서도 로그인 콜백과 동일한 토큰 저장 규칙 유지
- 토큰 저장 정책의 중복 구현 방지
