# API 계층 캐시/LocalStorage 가이드

이 디렉토리는 인증 토큰 저장, 요청 단위 캐시, 크레딧 Redis 기록을 담당합니다.

## 사용처

### `auth-storage.ts` (브라우저 `localStorage`)
- 키 목록:
  - `bookae_access_token`
  - `bookae_refresh_token` (호환 목적, 실사용은 쿠키 기반)
  - `bookae_auth_source`
  - `bookae_token_timestamp`
  - `bookae_token_expires_in`
  - 정리 대상: `bookae-video-create-storage`, `currentVideoJobId`
- 사용 이유:
  - accessToken/만료 시점 추적으로 API 인증 안정화
  - 로그아웃 시 creator 드래프트까지 함께 정리

### `route-guard.ts` (서버 메모리 캐시)
- 캐시: `tokenCache: Map<string, { userId, timestamp }>`
- TTL 정책:
  - 같은 토큰 재검증 결과를 1초 재사용
  - 10초 간격으로 5초 이상 지난 엔트리 정리
- 사용 이유:
  - 동일 요청 버스트에서 `/users/me` 중복 호출 감소

### `credit.ts` (Redis 캐시/기록)
- 키 패턴:
  - 잔액: `credit:user:{userId}`
  - 요청 멱등: `credit:video:req:{userId}:{clientRequestId}`
  - 거래: `credit:video:tx:{transactionId}`
  - 잡 매핑: `credit:video:job:{jobId}`
- TTL: `CREDIT_RECORD_TTL_SECONDS` (30일)
- 사용 이유:
  - 내보내기 과금/환불 멱등성 보장
  - 렌더 실패 환불 추적 가능

## 현재 크레딧 정책 상수

- `CREDIT_POLICY_BY_PLAN`
  - `ADMIN: null` (무제한)
  - `FREE: null` (무제한)
  - `FAST: 10000`
  - `PREMIUM: 10000`

`null`은 잔액 제한 없음 의미입니다.

## 유지보수 규칙

- 토큰 저장/삭제 로직은 `auth-storage.ts`에만 두고 분산 저장 금지
- 과금 API는 반드시 `clientRequestId`를 받아 멱등 처리
- Redis 키 네이밍 변경 시 환불/정산 경로 전체를 함께 점검
