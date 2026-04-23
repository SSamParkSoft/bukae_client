# Repository Guidelines

## 앱 범위와 구조
이 문서는 `apps/bukae_analyze` 전용 가이드입니다. 공통 워크스페이스 규칙은 루트 `AGENTS.md`를 함께 따르세요.

이 앱은 Next.js 16 App Router 기반 분석 플로우입니다. 주요 구조는 다음과 같습니다.

- `app/`: 라우트와 페이지 조합 레이어. `(shell)/` 아래에 `ai-planning`, `analysis`, `planning-setup`, `shooting-guide` 흐름이 있습니다.
- `app/_components`, `components/`: 페이지 전용 UI와 공용 레이아웃 UI
- `features/`: 도메인별 상태와 ViewModel 로직. `form/`, `viewmodel/`, `state/`로 역할을 나눕니다.
- `lib/types/api`, `lib/types/domain`: DTO와 앱 표준 도메인 타입 분리
- `lib/services`, `lib/services/mappers`: API 호출, Zod 검증, DTO→Domain 변환
- `lib/mocks`: API 미연동 구간에서 사용하는 도메인 형태 목 데이터
- `store/`: Zustand 기반 전역 상태

## 실행 및 검증 명령어
- 루트에서 `pnpm dev:analyze`: 분석 앱 개발 서버 실행 (`3002`)
- 앱 폴더에서 `pnpm dev`: 동일하게 실행
- `pnpm lint --filter bukae_analyze` 또는 루트 `pnpm lint`: ESLint 검사
- `pnpm typecheck --filter bukae_analyze` 또는 루트 `pnpm typecheck`: 타입 검사
- 루트에서 `pnpm --filter bukae_analyze exec next build --webpack`: 프로덕션 빌드 확인

현재 `pnpm build:analyze`는 Turbopack 빌드가 멈출 수 있으므로 검증용 빌드 명령으로 사용하지 않습니다.

현재 이 앱에는 커밋된 테스트 파일과 전용 테스트 스크립트가 없습니다. 기능 변경 시 최소한 `lint`, `typecheck`, `next build --webpack`까지 통과시키고, 복잡한 상태 로직을 추가하면 Vitest 기반 테스트도 함께 도입하는 방향으로 작업하세요.

## 레이어 규칙
데이터 흐름은 `lib/services` → `lib/types/domain` → `features` → `app/components` 순서만 허용합니다. UI에서 DTO를 직접 import하지 말고, `lib/services/mappers`에서만 DTO를 다루세요. `viewmodel` 훅은 변환만 담당하고 fetch나 자체 상태를 가지면 안 됩니다. 입력 상태는 `form`, 독립 상태 머신은 `state` 훅으로 분리합니다.

## 구현 규칙
기존 코드 스타일을 유지하세요: 2칸 들여쓰기, 작은따옴표, 세미콜론 미사용, `@/*` 경로 별칭 사용. 컴포넌트는 `PascalCase`, 훅과 스토어는 `useXxx...` 패턴을 사용합니다. 새 화면을 추가할 때는 먼저 도메인 타입과 mapper를 정의한 뒤, ViewModel 훅과 UI를 연결하세요.

## SSR / Next 구조 원칙
- `page.tsx`, `layout.tsx`는 기본적으로 서버 컴포넌트로 유지합니다. 클라이언트 컴포넌트는 입력, 클릭, 탭, 드롭다운, 브라우저 API가 필요한 작은 섬에만 둡니다.
- 서버 페이지는 최소 하나 이상의 서버 책임을 가져야 합니다. 예: `searchParams/params` 해석, `redirect`, 쿠키/세션 확인, 초기 데이터 fetch, 서버 프레임 조합.
- `analysis`, `planning-setup`, `ai-planning`처럼 보호된 플로우는 `(shell)` 서버 레이아웃에서 세션을 확인합니다. 새 보호 페이지를 추가할 때도 클라이언트 가드 대신 서버 `redirect('/login')`를 우선 사용하세요.
- 초기 렌더에 필요한 데이터는 서버에서 먼저 가져오고, 이후 갱신만 클라이언트 훅으로 넘깁니다. 현재 `analysis`는 이 패턴의 기준 구현입니다.
- 페이지 전체를 `loading.tsx`로 덮지 말고, `PageTitle` 아래 콘텐츠 영역처럼 필요한 부분에만 page-local `Suspense`나 조건부 로딩 UI를 둡니다.

## URL / 상태 배치 규칙
- `projectId`, `planning`처럼 새로고침/직접 진입/공유에 유지되어야 하는 값은 URL을 정본으로 둡니다.
- Zustand store는 UI 보조 상태나 과도기 호환용으로만 사용합니다. 인증, 프로젝트 식별자, 분석 결과 같은 정본 상태를 새로 store에 추가하지 마세요.
- readonly 변환 로직은 hook보다 순수 함수/mapper로 두고, `viewmodel` 훅은 조합과 포맷팅만 담당하게 유지합니다.

## API / 인증 구조 원칙
- DTO는 `lib/types/api`와 `lib/services/mappers`에서만 다룹니다. 컴포넌트와 `features`에서는 도메인 타입만 사용합니다.
- 브라우저와 서버 양쪽에서 써야 하는 API는 `lib/services/*WithFetcher` 패턴으로 추가합니다. 서버 전용 호출은 `lib/server/*`에서 fetcher를 주입해 재사용하세요.
- 서버에서 인증이 필요한 호출은 `lib/server/authSession.ts`의 세션 조회와 `lib/server/apiClient.ts` 기반으로 붙입니다. 새 서버 호출에서 클라이언트 store 토큰을 참조하지 마세요.
- OAuth 진입/콜백 로직은 현재 `/oauth/callback -> /api/auth/callback -> /oauth/finalize` 흐름을 사용합니다. 새 인증 로직을 추가할 때 이 서버 라우트 경계를 우선 활용하세요.
- 클라이언트 `useAuthStore.accessToken` 의존은 레거시 호환 경로입니다. 새 인증 기능은 cookie-first를 염두에 두고 설계하고, refresh/retry도 장기적으로는 서버/BFF로 이동할 수 있게 분리하세요.

## 환경 변수와 PR
`next.config.ts`는 `NEXT_PUBLIC_API_BASE_URL`이 있을 때 `/api/v1/*`, `/oauth2/*`를 리라이트합니다. 환경 변수 의존성이 바뀌면 PR 본문에 반드시 적으세요. 커밋 제목은 최근 관례대로 `[analyze] fix: ...`, `[analyze] refactor: ...` 형식을 우선 사용하고, UI 변경이 있으면 스크린샷을 첨부하세요.
