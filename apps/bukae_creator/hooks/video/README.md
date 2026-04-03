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
├── useVideoCreateAuth.ts          # 비디오 생성 플로우 인증 게이트키퍼
└── video/                         # 비디오 편집 관련 훅들
    ├── audio/                     # 오디오 관련
    │   ├── TtsTrack.ts            # TTS 오디오 세그먼트 관리 클래스
    │   ├── useBgmManager.ts       # BGM 관리
    │   ├── useSoundEffectManager.ts
    │   ├── useSoundEffects.ts     # 효과음 관리
    │   ├── useTtsTrack.ts         # TTS 트랙 (세그먼트 빌드 + 오디오 구독)
    │   └── types.ts
    ├── editing/                   # Fabric.js 편집 관련
    │   ├── fabricObjectDefaults.ts  # Fabric 객체 기본값/핸들 스타일
    │   ├── useFabricHandlers.ts   # Fabric 캔버스 이벤트 핸들러
    │   └── utils.ts
    ├── effects/
    │   └── motion/                # 모션 애니메이션
    │       ├── MotionEvaluator.ts # 모션 진행도 계산 (easing 적용)
    │       ├── easing.ts          # 이징 함수 모음
    │       └── types.ts
    ├── export/                    # 내보내기 관련
    │   ├── useProVideoExport.ts   # Pro 비디오 내보내기
    │   ├── useVideoExport.ts      # 비디오 내보내기
    │   └── utils/
    │       └── serializeSubtitleForEncoding.ts
    ├── renderer/                  # 렌더러 지원 유틸
    │   ├── playback/
    │   │   └── useRenderLoop.ts   # 렌더 루프 관리
    │   ├── subtitle/              # 자막 렌더링
    │   │   ├── useSubtitleRenderer.ts
    │   │   └── previewStroke.ts
    │   ├── transport/
    │   │   └── useTransportState.ts  # Transport 상태 구독 (useSyncExternalStore)
    │   ├── utils/
    │   │   ├── calculateMotionTiming.ts
    │   │   ├── getFabricPosition.ts
    │   │   └── getSubtitlePosition.ts
    │   ├── types.ts
    │   └── TIMING_POLICY.md       # 타이밍 정책 문서 (source of truth)
    ├── scene/                     # 씬 관리 관련
    │   ├── useSceneManager.ts     # 씬 관리 통합 훅
    │   ├── useSceneNavigation.ts  # 씬 네비게이션
    │   ├── useSceneHandlers.ts    # 씬 핸들러
    │   ├── useSceneEditHandlers.ts
    │   └── management/
    │       ├── useSceneLoader.ts  # 씬 로드 로직
    │       ├── useSceneTransition.ts
    │       └── useFabricSync.ts   # Fabric.js 동기화
    ├── timeline/                  # 타임라인 관련
    │   ├── useTimelineInitializer.ts
    │   └── useTimelineInteraction.ts
    ├── transport/                 # Transport (재생 시간 엔진)
    │   ├── Transport.ts           # Transport 클래스
    │   ├── useTransport.ts        # Transport 인스턴스 생성/폐기
    │   └── types.ts
    ├── tts/                       # TTS 관련
    │   └── useTtsResources.ts     # TTS Blob 캐시 + 오디오 ref 관리
    └── types/                     # 타입 정의
        ├── common.ts
        ├── scene.ts
        ├── playback.ts
        ├── editing.ts
        ├── effects.ts
        └── index.ts
```

## 제외 대상

다음과 같은 훅은 이 디렉토리에 포함하지 **않습니다**:

- ❌ 특정 페이지에만 사용되는 통합/컨테이너 훅
  - 예: `app/video/create/pro/step3/hooks/useProStep3Container.ts`
- ❌ 페이지별 UI 상태 관리
- ❌ 페이지별 이벤트 핸들러 통합

## 새 훅 추가 시 체크리스트

- [ ] 다른 페이지에서도 사용될 수 있는가?
- [ ] 특정 페이지의 UI 상태에 의존하지 않는가?
- [ ] 순수 비즈니스 로직인가?
- [ ] 다른 페이지 전용 훅에 의존하지 않는가?

모든 항목이 체크되면 적절한 기능별 폴더에 추가하세요.

## 관련 문서

- 페이지 전용 훅: `app/video/create/pro/step3/hooks/README.md`
- 타이밍 정책: `hooks/video/renderer/TIMING_POLICY.md`
