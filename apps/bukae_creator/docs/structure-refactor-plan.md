# 폴더 구조 개편 플랜

> 작성일: 2026-04-02
> 완료일: 2026-04-02
> 범위: `apps/bukae_creator/` 내 hooks 구조 정리
> 목표: 데드코드 제거 후 남겨진 빈/얕은 디렉토리 정리, 불필요한 중첩 제거

---

## 태스크 목록

### Task 1 — 빈 디렉토리 삭제
> 데드코드 삭제(2026-04-02)로 완전히 비어버린 디렉토리

- [x] `hooks/video/canvas/` 삭제
- [x] `hooks/video/playback/` 삭제

**작업**: `rm -rf` 후 typecheck
**영향 범위**: 없음 (파일 없음)

---

### Task 2 — `hooks/video/pixi/` 통합
> `usePixiFabric.ts` 삭제 후 `fabricObjectDefaults.ts` 1개만 남은 상태.
> 내용상 Fabric 편집 설정값이므로 `editing/`에 배치하는 것이 적합.

- [x] `hooks/video/pixi/fabricObjectDefaults.ts` → `hooks/video/editing/fabricObjectDefaults.ts` 이동
- [x] import 경로 수정 (2곳)
  - `app/video/create/pro/step3/hooks/editing/useProFabricResizeDrag.ts`
  - `hooks/video/scene/management/useFabricSync.ts`
- [x] `hooks/video/pixi/` 디렉토리 삭제
- [x] typecheck 통과 확인

---

### Task 3 — `hooks/auth/` 평탄화
> 파일 1개를 위한 디렉토리. `hooks/` 루트에 직접 두는 것이 명확.

- [x] `hooks/auth/useVideoCreateAuth.ts` → `hooks/useVideoCreateAuth.ts` 이동
- [x] import 경로 수정 (2곳)
  - `app/video/create/pro/step4/hooks/useStep4Container.ts`
  - `app/video/create/step1/hooks/useStep1Container.ts`
- [x] `hooks/auth/` 디렉토리 삭제
- [x] typecheck 통과 확인

---

### Task 4 — `hooks/save/` 삭제 (데드 파일)
> `useVideoCreateSaveGuard.ts`는 외부 import 없음 — 미사용 파일.

- [x] `hooks/save/useVideoCreateSaveGuard.ts` 내용 검토 후 삭제 확정
- [x] `hooks/save/` 디렉토리 삭제
- [x] typecheck 통과 확인

---

## 보류 항목

### `lib/hooks/` ↔ `hooks/` 통합
**현황**: 두 hooks 위치의 의미적 구분은 유효함
- `hooks/` — 비디오 기능 로직 훅 (video-create 플로우)
- `lib/hooks/` — 데이터 패칭 훅 (React Query 기반, useVideos / useAuth 등)

**보류 이유**: import 수정 범위가 10개 이상, 체감 개선 대비 리스크가 큼. 현재 구조 유지.

---

## 작업 후 예상 구조

```
hooks/
├── useVideoCreateAuth.ts          ← auth/ 에서 이동
├── video/
│   ├── audio/
│   ├── editing/
│   │   ├── fabricObjectDefaults.ts  ← pixi/ 에서 이동
│   │   ├── useFabricHandlers.ts
│   │   └── utils.ts
│   ├── effects/
│   │   └── motion/
│   ├── export/
│   ├── renderer/
│   ├── scene/
│   ├── timeline/
│   ├── transport/
│   ├── tts/
│   └── types/
```

삭제되는 디렉토리: `canvas/`, `playback/`, `pixi/`, `auth/`, `save/`
