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
- `pnpm build:analyze`: 프로덕션 빌드 확인

현재 이 앱에는 커밋된 테스트 파일과 전용 테스트 스크립트가 없습니다. 기능 변경 시 최소한 `lint`, `typecheck`, `build:analyze`까지 통과시키고, 복잡한 상태 로직을 추가하면 Vitest 기반 테스트도 함께 도입하는 방향으로 작업하세요.

## 레이어 규칙
데이터 흐름은 `lib/services` → `lib/types/domain` → `features` → `app/components` 순서만 허용합니다. UI에서 DTO를 직접 import하지 말고, `lib/services/mappers`에서만 DTO를 다루세요. `viewmodel` 훅은 변환만 담당하고 fetch나 자체 상태를 가지면 안 됩니다. 입력 상태는 `form`, 독립 상태 머신은 `state` 훅으로 분리합니다.

## 구현 규칙
기존 코드 스타일을 유지하세요: 2칸 들여쓰기, 작은따옴표, 세미콜론 미사용, `@/*` 경로 별칭 사용. 컴포넌트는 `PascalCase`, 훅과 스토어는 `useXxx...` 패턴을 사용합니다. 새 화면을 추가할 때는 먼저 도메인 타입과 mapper를 정의한 뒤, ViewModel 훅과 UI를 연결하세요.

## 환경 변수와 PR
`next.config.ts`는 `NEXT_PUBLIC_API_BASE_URL`이 있을 때 `/api/v1/*`, `/oauth2/*`를 리라이트합니다. 환경 변수 의존성이 바뀌면 PR 본문에 반드시 적으세요. 커밋 제목은 최근 관례대로 `[analyze] fix: ...`, `[analyze] refactor: ...` 형식을 우선 사용하고, UI 변경이 있으면 스크린샷을 첨부하세요.
