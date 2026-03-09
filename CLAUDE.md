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
- **Real-time**: STOMP over WebSocket (video processing progress)
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

## CI/CD

- `lint.yml`: Runs ESLint on PRs and pushes to `develop`/`main`. Uses Node.js 20 and pnpm 10.7.0.
- `coderabbit-guard.yml`: Blocks merge if CodeRabbit finds major/critical issues. Reviews are in Korean (`ko-KR`). Wait for CodeRabbit to complete before assuming a PR is ready.
- Main branch for PRs: `main`. Development branch: `develop`.

## App-Specific Documentation

For detailed architecture of `apps/bukae_creator/` (Step3 rendering, store persistence, hooks organization, API routes, type locations), see `apps/bukae_creator/CLAUDE.md`.
