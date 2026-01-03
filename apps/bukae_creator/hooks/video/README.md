# Video Hooks 디렉토리

## 목적

이 디렉토리는 **여러 페이지/컴포넌트에서 재사용 가능한 순수 비즈니스 로직 훅**을 포함합니다.

## 포함 기준

다음 조건을 모두 만족하는 훅은 이 디렉토리에 위치해야 합니다:

1. ✅ **재사용 가능성**: 여러 페이지나 컴포넌트에서 사용될 수 있는 로직
2. ✅ **순수 비즈니스 로직**: 특정 페이지의 UI 상태에 의존하지 않는 로직
3. ✅ **독립성**: 다른 페이지 전용 훅에 의존하지 않음
4. ✅ **범용성**: 비디오 편집 기능 전반에 걸쳐 사용되는 로직

## 포함 대상

### 씬 관리 관련
- `useSceneManager.ts` - 씬 관리 통합 훅
- `useSceneLoader.ts` - 씬 로드 로직
- `useSceneRenderer.ts` - 씬 렌더링 로직
- `useSceneTransition.ts` - 씬 전환 로직
- `useSceneNavigation.ts` - 씬 네비게이션

### 편집 관련
- `usePixiEditor.ts` - PixiJS 편집 통합 훅
- `useDragHandler.ts` - 드래그 핸들링
- `useResizeHandler.ts` - 리사이즈 핸들링
- `useEditHandles.ts` - 편집 핸들 그리기
- `useTransformManager.ts` - Transform 저장/적용

### 재생 관련
- `useFullPlayback.ts` - 전체 재생 관리
- `useGroupPlayback.ts` - 그룹 재생
- `useSingleScenePlayback.ts` - 단일 씬 재생
- `useTimelinePlayer.ts` - 타임라인 재생
- `useTimelineInteraction.ts` - 타임라인 인터랙션

### 효과 관련
- `usePixiEffects.ts` - 전환 효과 통합 훅
- `effects/transitions/` - 전환 효과별 함수들

### TTS/BGM 관리
- `useTtsManager.ts` - TTS 관리
- `useBgmManager.ts` - BGM 관리
- `useTtsPreview.ts` - TTS 미리보기

### 유틸리티 훅
- `useCanvasSize.ts` - Canvas 크기 관리
- `useGridManager.ts` - 격자 관리
- `useFontLoader.ts` - 폰트 로더
- `useTimelineInitializer.ts` - 타임라인 초기화

### 타입 정의
- `types/` - 공통 타입 정의
  - `scene.ts` - 씬 관련 타입
  - `playback.ts` - 재생 관련 타입
  - `editing.ts` - 편집 관련 타입
  - `effects.ts` - 효과 관련 타입
  - `common.ts` - 공통 타입

### 공통 유틸리티
- `utils/` - 공통 유틸리티 함수
  - `pixi-helpers.ts` - PixiJS 헬퍼 함수
  - `transform-helpers.ts` - Transform 계산 함수
  - `scene-helpers.ts` - 씬 관련 헬퍼 함수

## 제외 대상

다음과 같은 훅은 이 디렉토리에 포함하지 **않습니다**:

- ❌ 특정 페이지에만 사용되는 통합/컨테이너 훅
  - 예: `app/video/create/step4/hooks/useStep4Container.ts`
- ❌ 페이지별 UI 상태 관리
- ❌ 페이지별 이벤트 핸들러 통합

## 폴더 구조 예시

```
hooks/video/
├── README.md                    # 이 파일
├── scene-management/            # 씬 관리 관련 훅들
│   ├── useSceneLoader.ts
│   ├── useSceneRenderer.ts
│   ├── useSceneTransition.ts
│   └── useSceneManager.ts       # 통합 훅
├── editing/                     # 편집 관련 훅들
│   ├── useDragHandler.ts
│   ├── useResizeHandler.ts
│   ├── useEditHandles.ts
│   └── usePixiEditor.ts         # 통합 훅
├── playback/                    # 재생 관련 훅들
│   ├── useFullPlayback.ts
│   ├── useGroupPlayback.ts
│   └── useSingleScenePlayback.ts
├── effects/                     # 효과 관련 훅들
│   ├── transitions/
│   │   ├── fade.ts
│   │   ├── slide.ts
│   │   └── zoom.ts
│   └── usePixiEffects.ts
├── types/                       # 타입 정의
│   ├── scene.ts
│   ├── playback.ts
│   ├── editing.ts
│   └── effects.ts
└── utils/                       # 공통 유틸리티
    ├── pixi-helpers.ts
    ├── transform-helpers.ts
    └── scene-helpers.ts
```

## 사용 예시

### 올바른 사용
```typescript
// ✅ 여러 페이지에서 재사용 가능한 순수 로직
import { useSceneManager } from '@/hooks/video/useSceneManager'
import { usePixiEditor } from '@/hooks/video/editing/usePixiEditor'
```

### 잘못된 사용
```typescript
// ❌ step4 전용 통합 훅을 여기에 두면 안 됨
// 대신 app/video/create/step4/hooks/에 위치해야 함
```

## 새 훅 추가 시 체크리스트

새로운 훅을 이 디렉토리에 추가하기 전에 다음을 확인하세요:

- [ ] 다른 페이지에서도 사용될 수 있는가?
- [ ] 특정 페이지의 UI 상태에 의존하지 않는가?
- [ ] 순수 비즈니스 로직인가?
- [ ] 다른 페이지 전용 훅에 의존하지 않는가?

모든 항목이 체크되면 이 디렉토리에 추가하세요.

## 관련 문서

- 페이지 전용 훅: `app/video/create/step4/hooks/README.md`
- 전체 리팩토링 계획: `.cursor/plans/video_hooks_리팩토링_및_최적화_*.plan.md`

