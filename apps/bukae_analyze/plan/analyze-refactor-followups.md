# Analyze Refactor Follow-ups

## SSR / Next.js 후속 작업

이번 리팩터링은 레이어 구조, viewmodel 순수화, UI 책임 축소, 함수 분리를 우선으로 했다. 아래 항목은 인증/백엔드 흐름과 맞물릴 수 있어 별도 작업으로 진행한다.

1. `shooting-guide` URL 필수값 검증
   - `projectId`, `generationRequestId`가 없을 때 client에 `null`을 넘기지 않는다.
   - 서버 페이지에서 `redirect('/')` 또는 명시적 서버 error UI로 처리한다.

2. mutation BFF화 검토
   - `submitIntakeCommand`, `submitPt1SlotAnswer`, `submitPt2FreeText`, `finalizePlanning`, `startGenerationFromCommand`를 client access token 의존에서 점진적으로 분리한다.
   - 인증 정책이 cookie-first로 확정되면 route handler 또는 server action 경유를 우선 검토한다.

3. 서버 bootstrap 실패 정책 정리
   - `analysis`, `ai-planning`, `shooting-guide`의 서버 초기 fetch 실패 시 `null` fallback과 client polling fallback의 기준을 문서화한다.
   - 사용자에게 즉시 보여줄 실패와 polling으로 회복할 수 있는 실패를 구분한다.

4. page-local loading / Suspense 적용 범위 정리
   - 전체 페이지를 덮는 loading보다 `PageTitle` 아래 콘텐츠 영역 단위의 loading을 유지한다.
   - bootstrap이 느린 페이지는 page-local `Suspense` 또는 명시적 skeleton을 추가한다.

5. fetch cache 정책 명시
   - polling/상태 조회 API는 `no-store` 성격을 명시할지 검토한다.
   - 정적인 설정성 데이터가 생기면 서버 fetch cache나 revalidate를 별도로 적용한다.
