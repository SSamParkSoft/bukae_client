# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

pnpm workspace with two Next.js apps:
- `apps/bukae_creator/` — Creator dashboard (port 3000). Main app for video creation.
- `apps/bukae_viewer/` — Public viewer (port 3001).
- `packages/shared/` — Minimal shared package.

## Commands

Run from the workspace root:

```bash
# Development
pnpm dev              # Start creator app (default, auto-opens Chrome on ready)
pnpm dev:viewer       # Start viewer app
pnpm dev:all          # Start all apps in parallel

# Build
pnpm build            # Smart build with auto-fix (preferred)
pnpm build:raw        # Raw Next.js build for creator
pnpm build:all        # Build all apps

# Lint (runs across all apps)
pnpm lint

# Typecheck (runs across all apps)
pnpm typecheck

# Test (creator app)
pnpm test           # 1회 실행 후 종료 (CI용)
pnpm test:watch     # watch 모드 — 파일 저장 시 자동 재실행 (개발 중 사용)

# Seed demo data
pnpm seed-demo
```

The `pnpm dev` command runs `scripts/dev-with-browser.sh` which automatically opens Chrome at `http://localhost:3000` once the server is ready.


The `pnpm build` script (`scripts/auto-build-fix.sh`) attempts build, auto-fixes lint errors on failure, installs missing `@types` packages, then retries.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: TailwindCSS 4, shadcn/ui (Radix UI), Framer Motion, GSAP
- **State**: Zustand 5 (global/persisted), TanStack React Query 5 (server state)
- **Auth/DB**: Supabase auth, Better SQLite3 (local), Upstash Redis (rate limiting)
- **Video**: PixiJS 8 (canvas playback/transitions), Fabric.js 7 (editing mode), FFmpeg (client-side encoding)
- **AI/Voice**: Google Cloud TTS (Korean SSML), ElevenLabs
- **Real-time**: HTTP 폴링 (5초 간격, Step4 job 상태 확인). `lib/api/websocket.ts`에 STOMP 클라이언트 존재하나 보조 용도.
- **Path alias**: `@/*` maps to `apps/bukae_creator/` root

## Architecture: Video Creation Flow

The core feature is a multi-step video creation pipeline in `apps/bukae_creator/app/video/create/`:

```
/video/create           → start page
/video/create/step1     → product selection & image collection
/video/create/pro/step2 → script generation (manual or AI)
/video/create/pro/step3 → scene composition & timeline editing  ← most complex
/video/create/pro/step4 → effect/template application
Export                  → FFmpeg encoding + YouTube upload
```

Only a single **Pro track** exists. No `?track=` query params.

**Step3 directory layout** (`app/video/create/pro/step3/`):
- `page.tsx` + `hooks/useProStep3Container.ts` — orchestration layer
- `hooks/playback/useProTransportRenderer.ts` — **the only active renderer**; owns transition logic via `applySceneStartTransition()`
- `hooks/`, `ui/`, `utils/` — step3 utilities unified under the Pro track
- `ui/` — Pro-specific panel components
- `hooks/editing/` — Fabric.js editing mode hooks

**Dead code warning**: `hooks/video/renderer/useTransportRenderer.ts` and its `pipeline/` and `transitions/useTransitionEffects.ts` are legacy remnants — nothing imports them. Active renderer imports are limited to `hooks/video/renderer/{transport,playback,subtitle,utils}/`.

## Key Architectural Patterns

**API Client** (`lib/api/client.ts`): Centralized client with auto token refresh on 401, `ApiError` class, timeout handling.

**Auth**: Supabase-based. `AuthSync` component in providers handles automatic token refresh. 401 errors trigger logout + Zustand store reset.

**State layers**:
1. Zustand stores (`store/`) — `useVideoCreateStore`, `useUserStore`, `useAppStore`, `useThemeStore`, `useSceneStructureStore` — with localStorage persistence
2. React Query — API caching and deduplication
3. `useState` — local UI state

**Canvas rendering** (Step3): PixiJS handles scene playback and transitions; Fabric.js activates in editing mode for drag/resize/rotate.

**Types**: Domain types in `lib/types/domain/`, API request/response types in `lib/types/api/`, converters/type guards in `lib/utils/converters/`.

## Code Style Rules

From ESLint config and Cursor rules:
- **No `any` type** — use specific types, `unknown` + type guards, or generics
- **No `console.log`** in production code — only `console.warn` and `console.error` are allowed
- **No unused variables** — prefix intentionally unused vars/args/destructured with `_`
- Unused ESLint disable directives are errors

## Testing

Vitest 기반. 설정 파일: `apps/bukae_creator/vitest.config.ts` (`@/*` alias 포함).

테스트 대상은 **순수 유틸리티 함수**만 — React hook, Pixi/Fabric 등 외부 의존성이 있는 코드는 제외.

현재 커버리지 (13개 파일, 79개 테스트):

| 영역 | 파일 |
|------|------|
| Step3 타이밍/재생 | `segmentDuration`, `proPlaybackUtils`, `transitionFrameState` |
| Step3 유틸 | `reorderScenes`, `proPreviewLayout` |
| Step3 편집 | `proFabricTransformUtils`, `useSceneSelectionUpdater` |
| 자막 렌더링 | `useSubtitleRenderer` (anchor/position 계산), `previewStroke`, `getSubtitlePosition`, `serializeSubtitleForEncoding` |
| 모션 타이밍 | `calculateMotionTiming` |
| 익스포트 | `video-export` |

새 유틸 함수 추가 시 같은 위치에 `.test.ts` 파일을 함께 작성할 것.

## CI/CD

- `lint.yml`: Runs ESLint + TypeScript typecheck on pushes to `develop`. Uses Node version from `.nvmrc` and pnpm version from `package.json`. Path-filtered: only runs for the app that changed.
- `build-check.yml`: Build validation workflow.
- Main branch for PRs: `main`. Development branch: `develop`.

## Storage Cleanup

**현재 마이그레이션 진행 중** — Edge Function과 in-repo API route가 병행 실행됨.

### Supabase pg_cron + Edge Function (자동, 매 시간 정각)

스토리지 용량 절약을 위해 짧은 보존 기간으로 운영 중. 인증: `x-cron-secret` 헤더 (`CRON_SECRET` 환경변수).

| Edge Function | 버킷 | 현재 보존 기간 | 운영 전환 시 예정 |
|---------------|------|--------------|----------------|
| `cleanup-jobs` | `videos/jobs/*` | 24시간 | 30일 |
| `cleanup-pro-upload` | `pro_upload` 전체 | 1시간 | — |
| `cleanup-media` | `media` 전체 | 1시간 | — |

보존 기간 변경 시: Edge Function 코드의 `RETENTION_MS` 수정 후 재배포. pg_cron 스케줄은 그대로 유지됨.

### In-repo API route (수동 트리거용, 병행 운영 중)

`apps/bukae_creator/app/api/videos/cleanup/route.ts` — `POST /api/videos/cleanup`

- 대상: `videos/jobs/*` (Edge Function `cleanup-jobs`와 동일 버킷)
- 보존 기간: `RETENTION_DAYS = 30` (운영 기준값)
- 인증: `x-admin-secret` 헤더 (`ADMIN_VIDEO_CLEANUP_SECRET` 환경변수)
- 운영 전환 시 Edge Function의 보존 기간을 30일로 맞춘 뒤 이 route는 제거 예정

## Version Update Locations

| 항목 | 수정 파일 |
|------|-----------|
| 앱 버전 | `apps/bukae_creator/package.json`, `apps/bukae_viewer/package.json`, 루트 `package.json` → `"version"` |
| Node.js | `.nvmrc` + 루트 `package.json` → `"engines".node` |
| pnpm | 루트 `package.json` → `"packageManager"` + `"engines".pnpm` |
| Next.js / 패키지 | 루트 및 각 앱 `package.json` → `dependencies` / `devDependencies` (`pnpm update` 후 `pnpm-lock.yaml` 자동 갱신) |

## App-Specific Documentation

For detailed architecture of `apps/bukae_creator/` (Step3 rendering, store persistence, hooks organization, API routes, type locations), see `apps/bukae_creator/CLAUDE.md`.
