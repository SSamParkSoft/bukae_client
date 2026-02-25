# TTS 캐시 가이드

## 사용처

### `public-voices-cache.ts`
- 로컬 저장 키: `bookae-public-voices-cache-v1`
- 캐시 구성:
  - 메모리 캐시: `cachedVoices`, `cachedAt`
  - 로컬 캐시: `localStorage`
  - 동시 요청 병합: `inflightFetchPromise`
- TTL: 5분 (`VOICE_CACHE_TTL_MS`)

## 왜 필요한가

- Step2 음성 패널 진입 시 반복 네트워크 호출 감소
- 같은 세션에서 음성 목록 체감 속도 개선
- 탭 새로고침 후에도 짧은 시간 동안 즉시 복원

## 무효화/복구 정책

- TTL 초과 시 자동 미스 처리 후 재조회
- JSON 파싱 실패/스키마 불일치 시 캐시 폐기
- `localStorage` 저장 실패(quota/private mode)는 치명 오류로 처리하지 않음
