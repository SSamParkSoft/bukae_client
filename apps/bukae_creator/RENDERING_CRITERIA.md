# 렌더링 변경 기준

## 1. `renderAt` 함수 내부의 렌더링 변경 기준

`useTransportRenderer.ts`의 `renderAt` 함수에서 실제 렌더링이 실행되는 조건:

### 기준 1: 시간 변경 (`timeChanged`)
```typescript
const timeChanged = Math.abs(tSec - lastRenderedTRef.current) >= TIME_EPSILON
```
- `TIME_EPSILON = 0.001` (1ms)
- 현재 시간(`tSec`)과 마지막 렌더링 시간(`lastRenderedTRef.current`)의 차이가 1ms 이상이면 렌더링

### 기준 2: 씬 변경 (`sceneChanged`)
```typescript
const sceneChanged = sceneIndex !== lastRenderedSceneIndexRef.current
```
- 계산된 씬 인덱스가 마지막 렌더링 씬 인덱스와 다르면 렌더링

### 최종 조건
```typescript
if (!timeChanged && !sceneChanged) {
  return // 둘 다 변경되지 않았으면 렌더링하지 않음
}
```
- **시간이 변경되었거나 씬이 변경되었을 때만 렌더링**

---

## 2. `renderAt` 호출 트리거

### 트리거 1: Transport 시간 자동 업데이트 (재생 중)
**위치**: `useTransportRenderer.ts` (line 900-915)

```typescript
useEffect(() => {
  if (!transport || !transportState.isPlaying) {
    return
  }
  
  // throttle: 마지막 렌더링 이후 16ms 이상 지났을 때만 호출 (~60fps)
  const now = Date.now()
  if (now - lastRenderTimeRef.current >= RENDER_THROTTLE_MS) {
    lastRenderTimeRef.current = now
    requestAnimationFrame(() => {
      renderAt(transportCurrentTime, { skipAnimation: false })
    })
  }
}, [transport, transportCurrentTime, transportState.isPlaying, renderAt])
```

- **조건**: `transportState.isPlaying === true`
- **주기**: `transportCurrentTime`이 변경될 때마다 (최대 60fps로 throttle)
- **옵션**: `{ skipAnimation: false }` (애니메이션 포함)

### 트리거 2: 시간 이동 (Seek)
**위치**: `useStep3Container.ts` (line 615-627)

```typescript
const setCurrentTime = ((time: number | ((prev: number) => number)) => {
  const targetTime = typeof time === 'function' ? time(transport.currentTime) : time
  transport.seek(targetTime)
  // ...
  if (renderAtRef.current) {
    renderAtRef.current(targetTime, { skipAnimation: true })
  }
})
```

- **조건**: 사용자가 타임라인을 클릭하거나 시간을 이동할 때
- **옵션**: `{ skipAnimation: true }` (애니메이션 없이 즉시 렌더링)

### 트리거 3: 재생/일시정지
**위치**: `useStep3Container.ts` (line 704-799)

#### 재생 시작 시 (line 785-787)
```typescript
if (renderAtRef.current) {
  renderAtRef.current(currentT, { skipAnimation: false })
}
```

#### 일시정지 시 (line 795-797)
```typescript
if (renderAtRef.current) {
  renderAtRef.current(currentT, { skipAnimation: true })
}
```

### 트리거 4: 디버그 도구 Step
**위치**: `useStep3Container.ts` (line 1834-1840)

```typescript
onStep: (deltaSec: number) => {
  const newTime = Math.max(0, Math.min(transport.currentTime + deltaSec, transport.totalDuration))
  setCurrentTime(newTime)
  if (renderAtRef.current) {
    renderAtRef.current(newTime, { skipAnimation: true })
  }
}
```

---

## 3. 최적화 메커니즘

### Throttle (렌더링 빈도 제한)
- **값**: `RENDER_THROTTLE_MS = 16ms` (~60fps)
- **목적**: 너무 자주 렌더링되는 것을 방지하여 성능 최적화

### RequestAnimationFrame
- **위치**: 자동 렌더링 트리거에서만 사용
- **목적**: React 렌더링 사이클과 분리하여 cascading renders 방지

### 중복 렌더링 방지
- **위치**: `renderAt` 함수 내부
- **조건**: 같은 시간(`tSec`)과 같은 씬(`sceneIndex`)이면 렌더링하지 않음

---

## 4. 렌더링 흐름 요약

```
1. Transport 시간 변경 (재생 중)
   ↓
2. useEffect 트리거 (throttle 적용)
   ↓
3. renderAt(transportCurrentTime) 호출
   ↓
4. calculateSceneFromTime으로 씬/구간 계산
   ↓
5. timeChanged 또는 sceneChanged 확인
   ↓
6. 변경이 있으면 렌더링 실행
   ↓
7. lastRenderedTRef, lastRenderedSceneIndexRef 업데이트
```

---

## 5. 주요 상수

- `TIME_EPSILON = 0.001` (1ms) - 시간 비교 정밀도
- `RENDER_THROTTLE_MS = 16` (~60fps) - 렌더링 빈도 제한
