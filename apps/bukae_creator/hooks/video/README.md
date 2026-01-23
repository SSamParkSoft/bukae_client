# Video Hooks 디렉토리

## 목적

이 디렉토리는 **여러 페이지/컴포넌트에서 재사용 가능한 순수 비즈니스 로직 훅**을 포함합니다.

## 포함 기준

다음 조건을 모두 만족하는 훅은 이 디렉토리에 위치해야 합니다:

1. ✅ **재사용 가능성**: 여러 페이지나 컴포넌트에서 사용될 수 있는 로직
2. ✅ **순수 비즈니스 로직**: 특정 페이지의 UI 상태에 의존하지 않는 로직
3. ✅ **독립성**: 다른 페이지 전용 훅에 의존하지 않음
4. ✅ **범용성**: 비디오 편집 기능 전반에 걸쳐 사용되는 로직

## 폴더 구조

```
hooks/
├── auth/                          # 인증 관련
│   └── useVideoCreateAuth.ts
├── save/                          # 저장 가드 관련
│   └── useVideoCreateSaveGuard.ts
└── video/                         # 비디오 편집 관련 훅들
    ├── playback/                  # 재생 관련
    │   ├── useFullPlayback.ts
    │   ├── useGroupPlayback.ts
    │   ├── useSingleScenePlayback.ts
    │   ├── usePlaybackCore.ts
    │   ├── usePlaybackEngine.ts
    │   ├── usePlaybackStateSync.ts
    │   ├── useTimelinePlayer.ts
    │   └── useScenePlayback.ts
    ├── scene/                     # 씬 관리 관련
    │   ├── useSceneManager.ts
    │   ├── useSceneNavigation.ts
    │   ├── useSceneHandlers.ts
    │   ├── useSceneEditHandlers.ts
    │   └── management/            # 씬 관리 하위 로직
    │       ├── useSceneLoader.ts
    │       ├── useSceneRenderer.ts
    │       ├── useSceneTransition.ts
    │       └── useFabricSync.ts
    ├── editing/                   # 편집 관련
    │   ├── usePixiEditor.ts
    │   ├── useFabricHandlers.ts
    │   ├── useResizeHandler.ts
    │   ├── useTransformManager.ts
    │   └── utils.ts
    ├── effects/                   # 효과 관련
    │   ├── usePixiEffects.ts
    │   ├── transitions/           # 전환 효과
    │   │   ├── fade.ts
    │   │   ├── slide.ts
    │   │   ├── zoom.ts
    │   │   └── index.ts
    │   └── utils.ts
    ├── tts/                       # TTS 관련
    │   ├── useTtsManager.ts
    │   ├── useTtsPreview.ts
    │   ├── useTtsResources.ts
    │   └── useTtsCache.ts
    ├── audio/                     # 오디오 관련
    │   ├── useBgmManager.ts
    │   └── useSoundEffects.ts
    ├── canvas/                    # 캔버스 관련
    │   ├── useCanvasSize.ts
    │   ├── useGridManager.ts
    │   └── useFontLoader.ts
    ├── pixi/                      # PixiJS 관련
    │   └── usePixiFabric.ts
    ├── timeline/                  # 타임라인 관련
    │   ├── useTimelineInitializer.ts
    │   └── useTimelineInteraction.ts
    ├── export/                    # 내보내기 관련
    │   └── useVideoExport.ts
    └── types/                     # 타입 정의
        ├── common.ts
        ├── scene.ts
        ├── playback.ts
        ├── editing.ts
        ├── effects.ts
        └── index.ts
```

## 포함 대상

### 재생 관련 (`playback/`)
- `useFullPlayback.ts` - 전체 재생 관리
- `useGroupPlayback.ts` - 그룹 재생
- `useSingleScenePlayback.ts` - 단일 씬 재생
- `usePlaybackCore.ts` - 재생 코어 로직
- `usePlaybackEngine.ts` - 재생 엔진
- `usePlaybackStateSync.ts` - 재생 상태 동기화
- `useTimelinePlayer.ts` - 타임라인 재생
- `useScenePlayback.ts` - 씬 재생

### 씬 관리 관련 (`scene/`)
- `useSceneManager.ts` - 씬 관리 통합 훅
- `useSceneNavigation.ts` - 씬 네비게이션
- `useSceneHandlers.ts` - 씬 핸들러
- `useSceneEditHandlers.ts` - 씬 편집 핸들러
- `management/useSceneLoader.ts` - 씬 로드 로직
- `management/useSceneRenderer.ts` - 씬 렌더링 로직
- `management/useSceneTransition.ts` - 씬 전환 로직
- `management/useFabricSync.ts` - Fabric.js 동기화

### 편집 관련 (`editing/`)
- `usePixiEditor.ts` - PixiJS 편집 통합 훅
- `useFabricHandlers.ts` - Fabric.js 핸들러
- `useResizeHandler.ts` - 리사이즈 핸들링
- `useTransformManager.ts` - Transform 저장/적용
- `utils.ts` - 편집 유틸리티

### 효과 관련 (`effects/`)
- `usePixiEffects.ts` - 전환 효과 통합 훅
- `transitions/` - 전환 효과별 함수들
  - `fade.ts` - 페이드 효과
  - `slide.ts` - 슬라이드 효과
  - `zoom.ts` - 줌 효과
- `utils.ts` - 효과 유틸리티

### TTS 관련 (`tts/`)
- `useTtsManager.ts` - TTS 관리
- `useTtsPreview.ts` - TTS 미리보기
- `useTtsResources.ts` - TTS 리소스 관리
- `useTtsCache.ts` - TTS 캐시 관리

### 오디오 관련 (`audio/`)
- `useBgmManager.ts` - BGM 관리
- `useSoundEffects.ts` - 효과음 관리

### 캔버스 관련 (`canvas/`)
- `useCanvasSize.ts` - Canvas 크기 관리
- `useGridManager.ts` - 격자 관리
- `useFontLoader.ts` - 폰트 로더

### PixiJS 관련 (`pixi/`)
- `usePixiFabric.ts` - PixiJS/Fabric.js 통합

### 타임라인 관련 (`timeline/`)
- `useTimelineInitializer.ts` - 타임라인 초기화
- `useTimelineInteraction.ts` - 타임라인 인터랙션

### 내보내기 관련 (`export/`)
- `useVideoExport.ts` - 비디오 내보내기

### 타입 정의 (`types/`)
- `common.ts` - 공통 타입
- `scene.ts` - 씬 관련 타입
- `playback.ts` - 재생 관련 타입
- `editing.ts` - 편집 관련 타입
- `effects.ts` - 효과 관련 타입
- `index.ts` - 타입 export

## 제외 대상

다음과 같은 훅은 이 디렉토리에 포함하지 **않습니다**:

- ❌ 특정 페이지에만 사용되는 통합/컨테이너 훅
  - 예: `app/video/create/step3/hooks/useStep3Container.ts`
- ❌ 페이지별 UI 상태 관리
- ❌ 페이지별 이벤트 핸들러 통합

## 사용 예시

### 올바른 사용
```typescript
// ✅ 여러 페이지에서 재사용 가능한 순수 로직
import { useSceneManager } from '@/hooks/video/scene/useSceneManager'
import { usePixiEditor } from '@/hooks/video/editing/usePixiEditor'
import { useFullPlayback } from '@/hooks/video/playback/useFullPlayback'
import { useTtsManager } from '@/hooks/video/tts/useTtsManager'
import { useVideoCreateAuth } from '@/hooks/auth/useVideoCreateAuth'
```

### 잘못된 사용
```typescript
// ❌ step3 전용 통합 훅을 여기에 두면 안 됨
// 대신 app/video/create/step3/hooks/에 위치해야 함
```

## 새 훅 추가 시 체크리스트

새로운 훅을 이 디렉토리에 추가하기 전에 다음을 확인하세요:

- [ ] 다른 페이지에서도 사용될 수 있는가?
- [ ] 특정 페이지의 UI 상태에 의존하지 않는가?
- [ ] 순수 비즈니스 로직인가?
- [ ] 다른 페이지 전용 훅에 의존하지 않는가?

모든 항목이 체크되면 적절한 기능별 폴더에 추가하세요.

## 관련 문서

- 페이지 전용 훅: `app/video/create/step3/hooks/README.md`
- 전체 리팩토링 계획: `.cursor/plans/video_hooks_리팩토링_및_최적화_*.plan.md`
