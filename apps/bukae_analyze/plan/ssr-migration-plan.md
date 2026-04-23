# Bukae Analyze SSR Migration Plan

## Goal
- Migrate `bukae_analyze` toward a server-first Next.js structure without breaking the current login and API flow.
- Keep the existing auth flow alive during migration, then introduce a reversible hybrid auth path later.
- Preserve the current UX requirement that loading only covers the content area below `PageTitle`.

## Principles
- Default `page.tsx` and `layout.tsx` to server components.
- Keep `use client` only for interactive islands.
- Move readonly formatting logic out of hooks into pure mapper functions.
- Defer auth storage changes until after low-risk boundary cleanup is complete.
- Use page-local `Suspense` for content-area loading instead of route-wide `loading.tsx`.

## Phases

### Phase 0. Baseline and safety rails
- Freeze current behavior with a manual QA checklist for login, callback, project creation, analysis polling, refresh, and logout.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

### Phase 1. Low-risk client boundary reduction
- Remove unnecessary `use client` from readonly components.
- Convert readonly viewmodel hooks into pure mapper functions.
- Convert low-risk pages to server components where possible.

### Phase 2. Analysis layout split
- Keep the existing UI, but split the analysis page into:
  - server-rendered frame above the content area
  - async content slot below the title
- Recreate the current loading UX with page-local `Suspense` fallback.

### Phase 3. Project context via URL
- Start carrying `projectId` in the route or query string.
- Keep Zustand as a compatibility layer while server entry points are introduced.

### Phase 4. Hybrid auth
- Keep the legacy client-store auth path alive.
- Add a server-readable cookie path in parallel behind a feature flag.
- Add server-only API helpers for future SSR pages.

### Phase 5. Analysis server-first rendering
- Fetch initial analysis data on the server.
- Leave polling and tab interactions in client islands only.

### Phase 6. Remaining flow cleanup
- Apply the same pattern to `planning-setup` and `ai-planning`.
- Remove obsolete legacy auth/store dependencies after stabilization.

## Immediate work started
- [x] Add migration plan document
- [x] Remove unnecessary `use client` from readonly components
- [x] Convert readonly viewmodel hooks to pure mappers
- [x] Convert low-risk pages (`/`, `/login`, `/shooting-guide`) toward server-first structure
- [ ] Validate with lint, typecheck, and build
