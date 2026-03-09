# 전환 효과 깜빡거림 문제 해결 계획

## Context

Step3 재생 모드에서 전환 효과가 진행될 때 프레임들이 겹쳐서 캔버스 위에 프레임이 깜빡거리는 현상을 해결합니다.

**문제 원인**: Play 모드에서 렌더링 룹프(60fps)가 `transitionProgress`를 실시간으로 증가시키며 비동기 로딩과 경쟁할 때, 이전 스프라이트가 아직 로드되지 않았음에도 현재 스프라이트가 계속 렌더링되어 깜빡거림 발생

**의도된 결과**: 전환 효과 중 깜빡거림 없이 부드러운 프레임 전환

## 접근 방식

**선택된 방식**: "Pre-loading + Loading State Tracking" 방식

**이유**:
1. 전환 시작 시점 이전에 이전 스프라이트가 로드되도록 예측 로딩
2. 비동기 로딩 완료 상태를 명시적으로 추적하여 안정적인 렌더링 보장
3. Seek와 Play 모드 모두에서 일관된 품질 제공
4. 기존 구조 최소 변경

## 구현 단계

### 단계 1: 스프라이트 로딩 상태 추적 시스템 구축

- [x] `sceneLoadingStateRef`: 각 씬의 로딩 상태 추적 (Map<number, LoadingState>)
- [x] `LoadingState` 타입 정의: `{ status: 'not-loaded' | 'loading' | 'ready' | 'failed', timestamp: number, videoReady: boolean, spriteReady: boolean }`
- [x] `isSpriteReady` 유틸리티 함수: 스프라이트와 비디오 모두 준비되었는지 체크

**파일**: `useProTransportRenderer.ts`

### 단계 2: 사전 로딩(Pre-loading) 로직 구현

- [x] `preloadScenesForTransition`: 전환 예상 시점 이전에 관련 씬들 미리 로드
- [x] `getUpcomingScenes`: 현재 시점에서 전환 예상되는 씬들 식별
- [x] `bufferTimeSec`: 전환 시작 N초 전부터 미리 로드 시작 (예: 1.5초)
- [x] `useEffect`: 200ms마다 사전 로딩 체크

**파일**: `useProTransportRenderer.ts`

### 단계 3: 렌더링 타이밍 개선

- [x] `applyVisualState` 호출 전 로딩 상태 체크
- [x] 스프라이트 준비되지 않았을 때 `null`을 `fromSprite`로 전달
- [x] 비동기 로딩 완료 후 즉시 렌더링 재시도

**파일**: `useProTransportRenderer.ts`

### 단계 4: loadVideoAsSprite에 로딩 상태 업데이트

- [x] 로딩 시작 시 상태 업데이트 (`status: 'loading'`)
- [x] 스프라이트 생성 완료 시 상태 업데이트 (`status: 'ready'`, `spriteReady: true`)
- [x] 로딩 실패 시 상태 업데이트 (`status: 'failed'`)

**파일**: `useProStep3Container.ts`

### 단계 5: 기능 테스트

- [ ] Play 모드 전환 테스트: 여러 전환 효과 적용 시 깜빡거림 확인
- [x] Seek 모드 전환 테스트: 씬 경계로 seek 시 깜빡거림 확인
- [ ] 비동기 로딩 테스트: 느린 네트워크 환경 시뮬레이션

## Critical Files

### 수정할 파일:
1. `/Users/phw/bukae_client/apps/bukae_creator/app/video/create/pro/step3/hooks/playback/useProTransportRenderer.ts`
   - 범위: 스프라이트 로딩 상태 추적, 사전 로딩 로직, 렌더링 타이밍 개선
   - 변경량: 약 150-200 라인 추가/수정

2. `/Users/phw/bukae_client/apps/bukae_creator/app/video/create/pro/step3/hooks/useProStep3Container.ts`
   - 범위: `loadVideoAsSprite` 함수에 로딩 상태 업데이트 로직 추가
   - 변경량: 약 20-30 라인 수정

### 참조할 기존 구현:
- `useRenderLoop.ts`: `requestAnimationFrame` 기반 60fps 렌더링 룹프
- `transitionFrameState.ts`: `getTransitionFrameState` 전환 프레임 상태 계산
- `ensureSceneLoaded`: 기존 비동기 로딩 로직
- `applyVisualState`: 기존 렌더링 로직

## Verification

- [ ] **기능 테스트**: 여러 전환 효과로 재생 시 깜빡거림 없는지 확인
- [ ] **성능 테스트**: 전환 중 60fps 유지 확인
- [ ] **일관성 테스트**: Seek와 Play 모드에서 동일한 품질 확인

## 진행 상태

- [x] 단계 1: 스프라이트 로딩 상태 추적 시스템 구축
- [x] 단계 2: 사전 로딩(Pre-loading) 로직 구현
- [x] 단계 3: 렌더링 타이밍 개선
- [x] 단계 4: loadVideoAsSprite에 로딩 상태 업데이트
- [ ] 단계 5: 기능 테스트

## Notes

- 각 체크박스를 클릭하여 완료 상태를 표시할 수 있습니다
- 모든 단계가 완료되면 전환 효과의 깜빡거림 문제가 해결되어야 합니다
- 문제 발생 시 각 단계의 구현 내용을 확인하고 디버깅이 필요할 수 있습니다

## 구현 완료 (2026-03-09)

모든 코딩 작업이 완료되었습니다. 테스트 항목은 사용자가 직접 확인해야 합니다.

### 완료된 내용:

1. **로딩 상태 추적 시스템**: 각 씬의 로딩 상태를 `sceneLoadingStateRef`로 추적
2. **사전 로딩 로직**: 전환 시작 1.5초 전부터 관련 씬들을 미리 로드
3. **렌더링 타이밍 개선**: 로딩 상태 체크 후 스프라이트 준비 시 렌더링
4. **loadVideoAsSprite 업데이트**: 로딩 시작/완료/실패 시 상태 업데이트

### 테스트 방법:

1. 개발 서버 시작: `pnpm dev`
2. Step3 페이지 이동
3. Play 모드로 재생하고 전환 효과 확인
4. Seek 모드로 씬 경계로 이동하고 전환 효과 확인
