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

## Where to Put New Files

### Hooks

| 위치 | 기준 |
|------|------|
| `lib/hooks/` | React Query (`useQuery`/`useMutation`) 기반 서버 데이터 패칭 훅. 캐시 전략이 필요한 경우. |
| `hooks/video/` | 재사용 가능한 비디오 도메인 로직. 여러 페이지에서 쓰일 수 있고, 특정 페이지 UI 상태에 의존하지 않는 경우. |
| `app/video/create/step*/hooks/` | 해당 스텝 페이지에서만 쓰이는 container/orchestration 훅. |
| `hooks/` 루트 | 비디오 생성 플로우 전반에 걸친 유틸 훅 (예: `useVideoCreateAuth.ts`). |

`hooks/video/`에 넣기 전 체크:
- 다른 페이지에서도 사용될 수 있는가?
- 특정 페이지 UI 상태에 의존하지 않는가?
- 다른 페이지 전용 훅에 의존하지 않는가?

→ 하나라도 No면 `app/.../step*/hooks/`에 두세요.

### Utils

| 위치 | 기준 |
|------|------|
| `lib/utils/` | 순수 유틸리티 함수 (converters, type-guards 포함). 외부 라이브러리 의존 없음. |
| `utils/pixi/` | PixiJS 관련 유틸리티 (sprite, texture, filter 등). |
| `utils/timeline.ts` | UI 타임라인 계산 (`getSceneStartTime`). **렌더 파이프라인 내부에서 사용 금지** — 렌더링은 `segmentDuration.ts`/`proPlaybackUtils.ts` 사용. |
| `app/video/create/step*/utils/` | 해당 스텝 전용 유틸리티. |

### Types

| 위치 | 기준 |
|------|------|
| `lib/types/domain/` | 도메인 모델 (`product`, `timeline`, `script`, `video`). |
| `lib/types/api/` | API 요청/응답 shape. |
| `lib/utils/converters/` | 타입 변환 함수 및 type guard. |
| `hooks/video/types/` | 비디오 훅 계층에서만 쓰이는 내부 타입. |

### Components

| 위치 | 기준 |
|------|------|
| `components/ui/` | shadcn/ui 기반 범용 UI 컴포넌트. |
| `components/video-editor/` | 비디오 에디터 전용 컴포넌트 (여러 스텝에서 공유). |
| `app/video/create/step*/` 내부 | 해당 스텝에서만 쓰이는 컴포넌트. |

---

## API Routes

All Next.js route handlers are under `app/api/`:

```
auth/{refresh,oauth-callback}   tts/{synthesize,voices}
videos/{generate,cleanup,refund} script/generate
images/{upload,cleanup}          media/{upload,proxy}
credit/{balance,add}             youtube/{videos,stats}
sound-effects/list               coupang/stats
```

`media/cleanup`, `videos/pro/cleanup`은 삭제됨 — Supabase Edge Function으로 대체 (루트 CLAUDE.md의 Storage Cleanup 섹션 참고).

Client-side API calls go through `lib/api/client.ts` (`ApiError`, auto token-refresh on 401). Server-side Supabase access uses `lib/api/supabase-server.ts`.

---

## Type Locations

- Domain models: `lib/types/domain/` (`product`, `timeline`, `script`, `video`)
- API shapes: `lib/types/api/`
- Converters / type guards: `lib/utils/converters/`
- `TimelineData` / `TimelineScene` — defined in `lib/types/domain/timeline.ts`, stored in `useVideoCreateStore`
