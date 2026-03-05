# Step3 렌더러 & 전환 효과 아키텍처

> 기준일: 2026-03-05

---

## 1. 활성 렌더러

**단 하나의 렌더러**만 실제로 동작한다:

```
app/video/create/pro/step3/hooks/playback/useProTransportRenderer.ts
```

- 오케스트레이터: `useProStep3Container.ts`
- 전환 로직: `applySceneStartTransition()` (같은 파일 내부, 약 라인 222~407)
- PixiJS 8 기반. `mainContainer` → `sceneContainer[]` 구조.

### 전환 효과 수정 위치

전환 효과를 수정하려면 반드시 `useProTransportRenderer.ts`의 `applySceneStartTransition()` 내부를 수정해야 한다.

---

## 2. Dead Code — 절대 수정하지 말 것

아래 파일들은 기존 **Fast 트랙 잔재**였고, 현재는 삭제되었다.

| 파일 | 이유 |
|------|------|
| `hooks/video/renderer/useTransportRenderer.ts` | 8-step 파이프라인 렌더러(삭제됨) |
| `hooks/video/renderer/transitions/useTransitionEffects.ts` | 위 파일 전용 전환 훅(삭제됨) |
| `hooks/video/renderer/pipeline/` (step1~step8) | 전체 파이프라인 스텝들(삭제됨) |

`hooks/video/renderer/`에서 **실제로 사용되는** 서브디렉토리:
- `transport/` — transport 상태 관리
- `playback/` — 재생 관련 유틸
- `subtitle/` — 자막 렌더링
- `utils/` — 타임라인 계산 유틸

---

## 3. 타이밍 정책

소스: `hooks/video/renderer/TIMING_POLICY.md`

**핵심 규칙**: 렌더 경계·오디오 세그먼트·전환 시작 모두 **TTS duration만 합산**한 단일 타임라인 사용. transition 길이나 gap은 더하지 않는다.

```
씬 i 시작 = sum(TTS[0] .. TTS[i-1])
전환(i-1→i) 시작 = 위와 동일
```

### 구현 파일

| 용도 | 파일 |
|------|------|
| 씬 경계(렌더) | `app/video/create/pro/step3/utils/segmentDuration.ts` + `proPlaybackUtils.ts` |
| 전환 시작 시점 | `app/video/create/pro/step3/utils/transitionFrameState.ts` (`relativeTime = tSec - sceneStartTime`) |
| 오디오 세그먼트 | `hooks/video/audio/useTtsTrack.ts` → `buildSegmentsFromTimeline` |
| UI/시크 전용 | `utils/timeline.ts` → `getSceneStartTime` (렌더 파이프라인에서 사용 금지) |

### 한 프레임 밀림 방지

전환 시작을 약 2프레임(−0.02초) 일찍 인식해 부동소수점 오차로 인한 "돌아가는" 현상 방지:
- `isTransitionActive`: `relativeTime >= -0.02`
- `progress`: `Math.max(0, relativeTime / transitionDuration)` (음수면 0 유지)

---

## 4. 컨테이너 구조 (PixiJS)

```
mainContainer (clip mask: stageWidth × stageHeight)
  └── sceneContainer[] (씬별)
        ├── blackBg
        └── sprite (이미지/비디오)
subtitleContainer      ← 항상 최상위
transitionQuadContainer ← 항상 최상위
```

---

## 5. 편집 모드 (Fabric.js)

편집 모드 활성화 시 Fabric.js 캔버스가 PixiJS 위에 오버레이.

관련 훅: `pro/step3/hooks/editing/`
- `useProEditModeManager.ts` — 편집 모드 진입/해제
- `useProFabricResizeDrag.ts` — 드래그·리사이즈
- `useProSubtitleTextBounds.ts` — 자막 텍스트 경계

---

## 6. 미디어 타입 지원

`TimelineScene`에 `mediaType: 'image' | 'video'` 필드 존재.
- 이미지: 일반 PIXI.Sprite
- 비디오: `pro/step3/hooks/playback/media/videoSpriteAdapter.ts`로 처리
- HTMLVideoElement 참조: `pro/step3/hooks/playback/media/videoSpriteAdapter.ts`
