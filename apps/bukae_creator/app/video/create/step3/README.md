# Step3 구조 가이드

Step3 코드는 아래 2가지 축으로 분리합니다.

- **트랙 축**: `shared` / `fast` / `pro`
- **레이어 축**: `ui` / `hooks` / `model`

---

## 폴더 구조 요약

```
app/video/create/
├── step3/                          # Step3 공통 루트
│   ├── README.md                   # 이 문서
│   └── shared/                     # fast·pro 공용 코드
│       ├── ui/                     # 공용 UI 컴포넌트
│       │   ├── index.ts
│       │   ├── TimelineBar.tsx
│       │   ├── SpeedSelector.tsx
│       │   └── ExportButton.tsx
│       ├── hooks/                  # 공용 훅
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── useScrollableGutter.ts
│       │   ├── useSceneSelectionUpdater.ts
│       │   └── useStep3EffectState.ts
│       └── model/                  # 공용 타입·유틸
│           ├── index.ts
│           ├── reorderScenes.ts
│           └── segmentDuration.ts
│
├── fast/step3/                     # 패스트 트랙 전용
│   ├── page.tsx
│   ├── ui/                         # PreviewPanel, SceneListPanel 등
│   └── hooks/                      # Transport, TTS, 재생, 편집 등
│       ├── useStep3Container.ts
│       ├── transport/, playback/, audio/, scene/, ...
│       └── README.md
│
├── pro/step3/                      # 프로 트랙 전용
│   ├── page.tsx
│   ├── ui/                         # ProPreviewPanel, ProSceneListPanel 등
│   ├── hooks/                      # Pro 전용 재생·편집
│   ├── model/
│   └── utils/
│
├── _step3-components/              # [deprecated] → step3/shared/ui
├── _hooks/step3/                   # [deprecated] → step3/shared/hooks
└── _utils/step3/                   # [deprecated] → step3/shared/model
```

---

## 폴더 의미

| 경로 | 의미 |
|------|------|
| `step3/shared/*` | fast·pro 모두가 재사용하는 코드 |
| `fast/step3/*` | 패스트 트랙 전용 (이미지 기반) |
| `pro/step3/*` | 프로 트랙 전용 (비디오 기반) |
| `ui/*` | React 컴포넌트 |
| `hooks/*` | 상태, 재생, 렌더링, 이벤트 로직 |
| `model/*` | 타입, 순수 유틸, 도메인 계산 |

---

## 경계 규칙

- **fast**는 **pro**를 직접 import 하지 않습니다.
- **pro**는 **fast**를 직접 import 하지 않습니다.
- **shared**는 **fast/pro**를 직접 import 하지 않습니다.
- 신규 코드에서는 `_step3-components`, `_hooks/step3`, `_utils/step3`를 사용하지 않고 **`step3/shared/*`** 를 사용합니다.

---

## 레거시 브릿지 (deprecated)

아래 경로는 기존 import 호환용 re-export이며, 새 코드에서는 사용하지 않습니다.

| 예전 경로 | 대체 경로 |
|-----------|-----------|
| `_step3-components` | `@/app/video/create/step3/shared/ui` |
| `_hooks/step3` | `@/app/video/create/step3/shared/hooks` |
| `_utils/step3` | `@/app/video/create/step3/shared/model` |
