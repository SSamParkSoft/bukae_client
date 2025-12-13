# 렌더링 흐름 분석

## 1. 재생 버튼 클릭 시 (`handlePlayPause`)

### 흐름:
1. **PixiJS 준비 확인** (line 706-709)
   - `pixiReady`와 `spritesRef.current.size` 확인
   - 준비되지 않으면 재생하지 않음

2. **현재 씬 시작 시간 설정** (line 712-713)
   - `getSceneStartTime(currentSceneIndex)`로 씬 시작 시간 계산
   - `setCurrentTime(sceneStartTime)` 호출

3. **PixiJS Ticker 시작** (line 716-718)
   - `appRef.current.ticker.start()` 호출
   - PixiJS 자동 렌더링 시작

4. **이전 씬 인덱스 설정** (line 722-724)
   - `lastRenderedSceneIndexRef.current` 사용
   - 없으면 `currentSceneIndex - 1` 사용

5. **전환 효과 미리보기 활성화** (line 727)
   - `setIsPreviewingTransition(true)` 호출
   - → PixiJS 캔버스 표시 (line 959-962)

6. **수동 씬 선택 플래그 설정** (line 730)
   - `isManualSceneSelectRef.current = true`
   - 재생 중 씬 전환 useEffect가 실행되지 않도록 함

7. **전환 효과 적용** (line 733-748)
   - `requestAnimationFrame` 내에서:
     - `currentSceneIndexRef.current = currentSceneIndex`
     - `updateCurrentScene(false, prevIndex)` 호출
     - → `useSceneManager.updateCurrentScene` 실행
     - → `usePixiEffects.applyEnterEffect` 실행
     - → GSAP Timeline 생성 및 시작
     - → GSAP ticker에 렌더링 콜백 추가 (line 771-775)
     - → `appRef.current.render()` 매 프레임 호출

8. **전환 효과 완료 후 재생 시작** (line 741-747)
   - `setTimeout`으로 전환 효과 duration 후:
     - `lastRenderedSceneIndexRef.current = currentSceneIndex`
     - `isManualSceneSelectRef.current = false`
     - `setIsPlaying(true)` → 재생 루프 시작
     - `setIsPreviewingTransition(false)`

### 렌더링:
- **PixiJS 캔버스**: 표시됨 (opacity: 1, zIndex: 10)
- **Fabric 캔버스**: 숨김 (opacity: 0)
- **렌더링 방식**: 
  - GSAP ticker가 매 프레임 `appRef.current.render()` 호출
  - PixiJS ticker도 기본 렌더링 콜백 실행 (usePixiFabric line 169-172)

---

## 2. 다음 씬으로 넘어갈 때

### 흐름:

#### A. `useTimelinePlayer` 재생 루프 (line 72-135)

1. **requestAnimationFrame 루프** (line 73)
   - 매 프레임마다 실행

2. **시간 업데이트** (line 81-94)
   - delta 계산
   - `setCurrentTime(clampedTime)` 호출

3. **현재 시간에 맞는 씬 찾기** (line 98-121)
   - 절대 시간 기준으로 씬 계산
   - `targetSceneIndex` 결정

4. **씬 변경 감지 및 업데이트** (line 124-132)
   - `targetSceneIndex !== currentSceneIdx` 확인
   - `isManualSceneSelectRef.current`가 false일 때만:
     - `currentSceneIndexRef.current = targetSceneIndex`
     - `setCurrentSceneIndex(targetSceneIndex)` 호출
     - → `currentSceneIndex` state 변경
     - → `step4/page.tsx`의 재생 중 씬 전환 useEffect 트리거 (line 823)

#### B. `step4/page.tsx` 재생 중 씬 전환 useEffect (line 823-866)

1. **조건 확인** (line 824-825)
   - `timeline` 존재 확인
   - `isManualSceneSelectRef.current`가 false인지 확인

2. **씬 변경 감지** (line 833)
   - `lastRenderedIndex !== currentSceneIndex` 확인

3. **이전 씬 인덱스 설정** (line 836-838)
   - `lastRenderedIndex` 사용
   - 없으면 `currentSceneIndex - 1` 사용

4. **전환 효과 미리보기 활성화** (line 841)
   - `setIsPreviewingTransition(true)` 호출
   - → PixiJS 캔버스 표시 (line 959-962)

5. **전환 효과 적용** (line 844-857)
   - `requestAnimationFrame` 내에서:
     - `currentSceneIndexRef.current = currentSceneIndex`
     - `updateCurrentScene(false, prevIndex)` 호출
     - → `useSceneManager.updateCurrentScene` 실행
     - → `usePixiEffects.applyEnterEffect` 실행
     - → GSAP Timeline 생성 및 시작
     - → GSAP ticker에 렌더링 콜백 추가 (line 771-775)
     - → `appRef.current.render()` 매 프레임 호출

6. **전환 효과 완료 후 업데이트** (line 852-856)
   - `setTimeout`으로 전환 효과 duration 후:
     - `lastRenderedSceneIndexRef.current = currentSceneIndex`
     - `setIsPreviewingTransition(false)`

### 렌더링:
- **PixiJS 캔버스**: 표시됨 (opacity: 1, zIndex: 10)
- **Fabric 캔버스**: 숨김 (opacity: 0)
- **렌더링 방식**: 
  - GSAP ticker가 매 프레임 `appRef.current.render()` 호출
  - PixiJS ticker도 기본 렌더링 콜백 실행 (usePixiFabric line 169-172)

---

## 3. 렌더링 메커니즘

### PixiJS Ticker (usePixiFabric.ts line 169-172)
```typescript
app.ticker.add(() => {
  app.render()
})
```
- 매 프레임마다 자동으로 `app.render()` 호출
- 재생 중에도 계속 실행

### GSAP Ticker (usePixiEffects.ts line 771-775)
```typescript
const renderTicker = gsap.ticker.add(() => {
  if (tl.isActive() && !tl.paused() && appRef.current) {
    appRef.current.render()
  }
})
```
- 전환 효과 애니메이션 중에만 실행
- Timeline이 활성화되어 있을 때만 렌더링
- 애니메이션 완료 시 제거 (line 779-783)

### 수동 렌더링
- `updateCurrentScene` 내에서 여러 곳에서 `appRef.current.render()` 호출
- 초기 상태 설정 후 즉시 렌더링

---

## 4. 잠재적 문제점

1. **중복 렌더링**
   - PixiJS ticker와 GSAP ticker가 동시에 렌더링
   - 성능에 영향은 미미하지만 중복

2. **타이밍 이슈**
   - `lastRenderedSceneIndexRef.current` 업데이트 타이밍
   - 전환 효과 완료 후 업데이트하므로 다음 씬 전환이 정확히 감지됨

3. **상태 동기화**
   - `currentSceneIndexRef.current`와 `currentSceneIndex` state 동기화
   - `useEffect`로 동기화 (line 819-820)

