# app/video/create/ 폴더 구조

> 정리 기준일: 2026-03-05
> `?track=pro` URL 파라미터 제거 + 폴더 통합 후 최종 구조

---

## 전체 트리

```
app/video/create/
├── layout.tsx                        # 공통 레이아웃 (BukaeTop, 인증 가드)
├── page.tsx                          # /video/create → 영상 제작 시작 페이지
├── README.md
│
├── _utils/                           # 전역 유틸 (create 경로 전체에서 사용)
│   ├── draft-storage.ts              # localStorage 임시저장 (layout, page에서 사용)
│   ├── scene-array.ts                # 씬 배열 조작 헬퍼
│   └── README.md
│
├── step1/                            # URL: /video/create/step1
│   ├── page.tsx
│   ├── components/
│   │   ├── index.ts
│   │   ├── ErrorMessage.tsx
│   │   ├── ExpectedRevenue.tsx
│   │   ├── LoadingIndicator.tsx
│   │   ├── PlatformSelector.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductCardSkeleton.tsx
│   │   ├── ProductPriceDisplay.tsx
│   │   ├── SearchInput.tsx
│   │   ├── SearchUrlToggle.tsx
│   │   └── SelectedProductCard.tsx
│   ├── hooks/
│   │   ├── useStep1Container.ts
│   │   └── README.md
│   └── utils/
│       └── productCalculations.ts
│
└── pro/                              # Pro 트랙 (현재 유일한 트랙)
    ├── step2/                        # URL: /video/create/pro/step2
    │   ├── page.tsx
    │   ├── README.md
    │   ├── components/
    │   │   ├── index.ts
    │   │   ├── ProSceneCard.tsx
    │   │   ├── ProVideoEditSceneCard.tsx
    │   │   ├── ProVideoEditSection.tsx
    │   │   ├── ProVideoTimelineGrid.tsx
    │   │   ├── ProVideoUpload.tsx
    │   │   ├── ProVoicePanel.tsx
    │   │   └── script/               # 대본 관련 컴포넌트 (구 _components/)
    │   │       ├── index.ts
    │   │       ├── AiScriptGenerateButton.tsx
    │   │       ├── ConceptCard.tsx
    │   │       └── ScriptStyleSection.tsx
    │   ├── edit/
    │   │   └── page.tsx              # URL: /video/create/pro/step2/edit
    │   └── utils/
    │       ├── synthesizeAllScenes.ts
    │       └── types.ts
    │
    ├── step3/                        # URL: /video/create/pro/step3
    │   ├── page.tsx
    │   ├── model/
    │   │   └── types.ts
    │   ├── hooks/
    │   │   ├── index.ts
    │   │   ├── README.md
    │   │   ├── useProStep3Container.ts
    │   │   ├── useProStep3Scenes.ts
    │   │   ├── useProStep3SelectionChange.ts
    │   │   ├── useProStep3State.ts
    │   │   ├── editing/
    │   │   │   ├── proFabricTransformUtils.ts
    │   │   │   ├── proFabricTransformUtils.test.ts
    │   │   │   ├── useProEditModeManager.ts
    │   │   │   ├── useProFabricResizeDrag.ts
    │   │   │   └── useProSubtitleTextBounds.ts
    │   │   └── playback/
    │   │       ├── useProTransportPlayback.ts
    │   │       ├── useProTransportRenderer.ts
    │   │       ├── useProTransportTtsSync.ts
    │   │       └── media/
    │   │           └── videoSpriteAdapter.ts
    │   ├── ui/
    │   │   ├── index.ts
    │   │   ├── ExportButton.tsx
    │   │   ├── SpeedSelector.tsx
    │   │   ├── TimelineBar.tsx
    │   │   ├── ProEffectsPanel.tsx
    │   │   ├── ProPreviewPanel.tsx
    │   │   ├── ProSceneListPanel.tsx
    │   │   └── ProStep3SceneCard.tsx
    │   └── utils/
    │       ├── index.ts
    │       ├── reorderScenes.ts
    │       ├── reorderScenes.test.ts
    │       ├── segmentDuration.ts
    │       ├── segmentDuration.test.ts
    │       ├── proPlaybackUtils.ts
    │       ├── proPlaybackUtils.test.ts
    │       ├── proPreviewLayout.ts
    │       └── proPreviewLayout.test.ts
    │
    └── step4/                        # URL: /video/create/pro/step4
        ├── page.tsx
        └── hooks/
            └── useStep4Container.ts
```

---

## URL 라우팅

| URL | 파일 |
|-----|------|
| `/video/create` | `page.tsx` |
| `/video/create/step1` | `step1/page.tsx` |
| `/video/create/pro/step2` | `pro/step2/page.tsx` |
| `/video/create/pro/step2/edit` | `pro/step2/edit/page.tsx` |
| `/video/create/pro/step3` | `pro/step3/page.tsx` |
| `/video/create/pro/step4` | `pro/step4/page.tsx` |

> `?track=` 쿼리 파라미터 없음. `/pro/step1` 리다이렉트 없음.

---

## 이전 구조 대비 변경 사항

| 구분 | 이전 | 이후 |
|------|------|------|
| URL | `/video/create/step1?track=pro` | `/video/create/step1` |
| step1 리다이렉트 | `pro/step1/page.tsx` (router.replace) | 삭제 |
| 공유 step3 코드 | 루트 레벨 공유 디렉터리 | `pro/step3/hooks`, `pro/step3/ui`, `pro/step3/utils`로 통합 |
| 대본 컴포넌트 | `_components/` | `pro/step2/components/script/` |
| 레거시 브릿지 | `_hooks/step3/`, `_step3-components/`, `_utils/step3/` | 삭제 |
| ESLint | 트랙 경계 규칙 다수 | 삭제 (단일 트랙) |

---

## import 경로 규칙

- `pro/step3/` 내부 import: **상대 경로** (`./hooks/…`, `./ui/…`, `./utils/…`, `../hooks/…`)
- `pro/step3/` 외부 import: **경로 별칭** (`@/app/video/create/pro/step3/hooks/…`, `.../ui/…`, `.../utils/…`)
- `_utils/` (draft-storage, scene-array): **경로 별칭** (`@/app/video/create/_utils/…`)
