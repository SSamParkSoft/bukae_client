# Repository Guidelines

## 프로젝트 구조 및 모듈 구성
이 저장소는 Bukae 프론트엔드를 위한 `pnpm` 모노레포입니다. 주요 앱은 `apps/` 아래에 있습니다.

- `apps/bukae_creator`: 크리에이터 대시보드, 포트 `3000`
- `apps/bukae_viewer`: 뷰어 사이트, 포트 `3001`
- `apps/bukae_analyze`: 분석 앱, 포트 `3002`

각 앱은 Next.js 16 App Router 기반이며, 화면 진입점은 `app/`, 재사용 UI는 `components/`, 상태 관리는 `store/`, 도메인 및 API 유틸은 `lib/`에 둡니다. 공용 워크스페이스 자료는 현재 `packages/shared`에 있습니다. 빌드 및 보조 스크립트는 `scripts/`와 `apps/bukae_creator/scripts/`를 확인하세요.

## 빌드, 테스트, 개발 명령어
개발 환경은 Node `24`, `pnpm >=10`을 기준으로 합니다.

- `pnpm install`: 워크스페이스 전체 의존성 설치
- `pnpm dev`, `pnpm dev:creator`, `pnpm dev:viewer`, `pnpm dev:analyze`: 앱별 로컬 개발 서버 실행
- `pnpm dev:all`: 모든 앱 병렬 실행
- `pnpm build`, `pnpm build:creator`, `pnpm build:viewer`, `pnpm build:analyze`: 프로덕션 빌드
- `pnpm lint`: 전체 앱 ESLint 검사
- `pnpm typecheck`: TypeScript `--noEmit` 검사
- `pnpm test`: `bukae_creator`의 Vitest 테스트 실행

## 코딩 스타일 및 네이밍 규칙
TypeScript는 `strict` 모드입니다. 불가피한 경우가 아니면 `any`는 피하고, 타입을 명시적으로 유지하세요. 현재 코드 스타일은 TS/TSX 기준 2칸 들여쓰기, 작은따옴표, 세미콜론 미사용입니다. 깊은 상대 경로 대신 앱 내부 `@/*` 별칭을 우선 사용하세요. 컴포넌트는 `AppShell.tsx` 같은 `PascalCase`, 훅과 스토어는 `useVideoCreateStore.ts` 같은 `camelCase` 패턴을 따릅니다. 라우트 파일은 `app/video/create/page.tsx`처럼 Next.js 관례를 유지합니다.

## 테스트 가이드
Vitest 설정은 `apps/bukae_creator/vitest.config.ts`에 있습니다. 테스트 파일은 구현 근처의 `__tests__/` 폴더나 `*.test.ts` 형식으로 둡니다. UI나 훅이 DOM을 필요로 할 때만 `jsdom`을 사용하고, 그 외에는 기본 Node 환경을 우선합니다. 스토어 로직, 렌더링 유틸, export 관련 로직을 수정할 때는 테스트를 함께 추가하세요.

## 커밋 및 Pull Request 가이드
최근 커밋은 `[analyze] fix: ...`, `[analyze] refactor: ...`, `feat: ...`처럼 스코프와 타입을 포함한 제목을 사용합니다. 가능하면 `<scope> <type>: <summary>` 또는 `[scope] <type>: <summary>` 형식을 따르고, 요약은 짧은 명령형으로 작성하세요. PR에는 영향받는 앱, 사용자에게 보이는 변경점, 필요한 환경 변수, UI 변경 시 스크린샷이나 녹화를 포함해야 합니다. PR을 열기 전 `pnpm lint`, `pnpm typecheck`, 관련 빌드 또는 테스트 명령을 직접 실행하세요.

## 설정 팁
환경 변수 파일은 앱별로 관리하며 예시는 `apps/bukae_creator/.env.local`입니다. 비밀값은 커밋하지 마세요. 특히 creator 빌드는 CI에서 외부 서비스 키를 사용하므로, 새 환경 변수를 추가했다면 PR 설명에 반드시 기록해야 합니다.
