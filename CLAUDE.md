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
pnpm dev              # Start creator app (default)
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
Step1 → Product selection & image collection
Step2 → Script generation (manual or AI)
Step3 → Scene composition & timeline editing  ← most complex
Step4 → Effect/template application
Export → FFmpeg encoding + YouTube upload
```

**Two tracks (Fast vs Pro)** with separate Step3 implementations:
- `fast/step3/` — simplified track
- `pro/step3/` — full-featured track
- `step3/shared/` — track-agnostic shared components/hooks/utils

**ESLint enforces strict module boundaries:**
- Fast Step3 cannot import Pro Step3, and vice versa
- Shared Step3 cannot import either track's specific modules
- Legacy bridge files (`_step3-components/`, `_hooks/step3/`, `_utils/step3/`) are being migrated; do not use them in new code — use the new paths (`step3/shared/ui`, `step3/shared/hooks`, `step3/shared/model`)

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

- `lint.yml`: Runs ESLint on PRs and pushes to `develop`/`main`
- `coderabbit-guard.yml`: Blocks merge if CodeRabbit finds major/critical issues. Reviews are in Korean (`ko-KR`). Wait for CodeRabbit to complete before assuming a PR is ready.
- Main branch for PRs: `main`. Development branch: `develop`.
