# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Monorepo-level commands (dev/build/lint), tech stack, CI/CD, and code style rules are in the root `CLAUDE.md`. This file covers `apps/bukae_creator/`-specific architecture.

---

## Step3 Rendering Architecture

The Step3 preview has **one active renderer**:

```
app/video/create/pro/step3/hooks/playback/useProTransportRenderer.ts
```

This file owns the full render loop, transition logic (`applySceneStartTransition`), video sync, and motion. It is orchestrated by `useProStep3Container.ts`.

Legacy dead renderer files were removed. Do not re-introduce:
- `hooks/video/renderer/useTransportRenderer.ts`
- `hooks/video/renderer/transitions/useTransitionEffects.ts`
- `hooks/video/renderer/pipeline/`

Active imports from `hooks/video/renderer/` are limited to: `transport/`, `playback/`, `subtitle/`, `utils/`.

**Timing policy** (source of truth: `hooks/video/renderer/TIMING_POLICY.md`):
- Transport time (`tSec`), audio segments, scene boundaries, and transition start points all use the same timeline: **TTS durations summed only** — no transition gaps, no padding.
- Scene i starts at `sum(TTS[0]..TTS[i-1])`. Transition i-1→i also starts at that exact same point.
- Pro scene resolver: `app/video/create/pro/step3/utils/segmentDuration.ts` and `proPlaybackUtils.ts`
- Transition frame logic: `app/video/create/pro/step3/utils/transitionFrameState.ts`
- Audio segments: `hooks/video/audio/useTtsTrack.ts` → `buildSegmentsFromTimeline`
- UI/seek timeline (includes transition duration + gap): `utils/timeline.ts → getSceneStartTime` — **do not use this inside the render pipeline**.

---

## Step3 Sprite Lifecycle Rules

**Sprites start hidden.** `loadVideoAsSprite` and `loadImageAsSprite` both set `sprite.visible = false; sprite.alpha = 0` on creation. `applyVisualState()` inside `renderAt` is responsible for the first visible render frame — this prevents a full-opacity flash of the incoming sprite before transition animations begin.

**`isSpriteReady` contract**: Requires `videoReady && spriteReady` from `sceneLoadingStateRef`. Image sprites have no `<video>` element but **must** set `videoReady: true` so `canRenderCrossTransitionNow` evaluates correctly for cross-scene transitions. If `videoReady` is left `false` for an image scene, all push/slide transitions from that image scene to the next will be silently skipped.

**`useProStep3Scenes` hook** (`app/video/create/pro/step3/hooks/useProStep3Scenes.ts`): The single data bridge from `useVideoCreateStore` to step3. Converts store `SceneScript[]` → `ProScene[]` → `ProStep3Scene[]` via `normalizeSelectionRange` (which clamps `selectionStart/EndSeconds` to valid ranges relative to `originalVideoDurationSeconds`).

---

## Zustand Store Persistence

Three persisted stores (localStorage):

| Store | Key | Notes |
|-------|-----|-------|
| `useVideoCreateStore` | `bookae-video-create-storage` | `partialize` excludes `File` objects and `step1SearchCache`. Write is blocked when `autoSaveEnabled === false`. |
| `useUserStore` | `bookae-user-storage` | `onRehydrateStorage` re-validates token; clears `useVideoCreateStore` + `currentVideoJobId` on missing token. |
| `useThemeStore` | `bookae-theme` | light/dark preference only |

**Draft lifecycle**: `clearVideoCreateDraft()` → `useVideoCreateStore.reset()` + `persist.clearStorage()` + removes `currentVideoJobId`. Called on new-start, Step4 completion, and auth logout.

When adding fields to `useVideoCreateStore`: confirm serializability, declare persist intent, exclude via `partialize` if not needed across sessions.

---

## hooks/video/ Organization Rule

`hooks/video/` is for **reusable, page-agnostic business logic** only. A hook belongs here if it can be used from multiple pages and doesn't depend on page-specific UI state.

Page-specific container hooks (e.g., `useProStep3Container`) live in `app/video/create/pro/step3/hooks/`, not here.

---

## API Routes

All Next.js route handlers are under `app/api/`:

```
auth/{refresh,oauth-callback}   tts/{synthesize,voices}
videos/{generate,cleanup,refund} script/generate
images/{upload,cleanup}          media/{upload,proxy,cleanup}
credit/{balance,add}             youtube/{videos,stats}
sound-effects/list               coupang/stats
```

Client-side API calls go through `lib/api/client.ts` (`ApiError`, auto token-refresh on 401). Server-side Supabase access uses `lib/api/supabase-server.ts`.

---

## Type Locations

- Domain models: `lib/types/domain/` (`product`, `timeline`, `script`, `video`)
- API shapes: `lib/types/api/`
- Converters / type guards: `lib/utils/converters/`
- `TimelineData` / `TimelineScene` — defined in `lib/types/domain/timeline.ts`, stored in `useVideoCreateStore`
