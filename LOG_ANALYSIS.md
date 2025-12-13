# 콘솔 로그 분석 결과

## ✅ 정상 작동하는 부분

1. **Timeline 생성**: 정상
   - `Timeline 생성 시작 - scene: X, transition: Y`
   - `Timeline 상태 - duration: 0.5, children: 2/3, paused: true, isActive: false`

2. **Timeline 시작**: 정상
   - `Timeline 시작 - tl.restart() 호출`
   - `Timeline 시작 후 - paused: false, isActive: false, progress: 0`

3. **애니메이션 실행**: 정상
   - `Timeline onStart 호출 - scene: X`
   - `Fade animation started` / `Rotate animation started`
   - `Timeline 첫 프레임 - paused: false, isActive: true, progress: 0.020/0.022`

4. **애니메이션 완료**: 정상
   - `Timeline onComplete 호출 - scene: X`

## ⚠️ 문제 지점 발견

### 핵심 문제: `tl.restart()` 직후 `isActive: false` 상태

**로그 패턴:**
```
Step4: Timeline 시작 후 - paused: false, isActive: false, progress: 0
Step4: Timeline onStart 호출 - scene: X
Step4: Timeline 첫 프레임 - paused: false, isActive: true, progress: 0.020
```

**문제 분석:**

1. **`tl.restart()` 직후 상태:**
   - `paused: false` ✅
   - `isActive: false` ❌ (문제!)
   - `progress: 0` ✅

2. **렌더링 로직 충돌:**
   - **GSAP ticker** (`usePixiEffects.ts:772`):
     ```typescript
     if (tl.isActive() && !tl.paused() && appRef.current) {
       appRef.current.render()
     }
     ```
     - `isActive: false`이므로 렌더링하지 않음 ❌
   
   - **PixiJS ticker** (`usePixiFabric.ts:178`):
     ```typescript
     if (tl && tl.isActive && tl.isActive() && !tl.paused()) {
       hasActiveAnimation = true
     }
     ```
     - `isActive: false`이므로 `hasActiveAnimation = false`
     - 하지만 `activeAnimationsRef.current.size > 0`이므로 여전히 체크함
     - 결과적으로 렌더링할 수도, 안 할 수도 있음 (불확실)

3. **타이밍 이슈:**
   - `tl.restart()` 호출 → `isActive: false` (짧은 시간)
   - `onStart` 콜백 호출
   - 첫 프레임 → `isActive: true`
   - **이 짧은 시간 동안 아무것도 렌더링되지 않을 수 있음**

## 🔍 체크해야 할 사항

### 1. `tl.restart()` 직후 렌더링 보장
- **현재**: `app.render()`가 `requestAnimationFrame` 내에서 호출됨 (line 806)
- **문제**: GSAP ticker가 `isActive: false`인 동안 렌더링하지 않음
- **해결**: `tl.restart()` 직후 즉시 렌더링하거나, `isActive: false`인 동안에도 PixiJS ticker가 렌더링하도록 수정

### 2. PixiJS ticker 로직 개선
- **현재**: `activeAnimationsRef.current.size > 0`이면 `isActive()` 체크
- **문제**: `isActive: false`인 동안에도 `size > 0`이면 불확실한 동작
- **해결**: `isActive: false`인 동안에는 PixiJS ticker가 렌더링하도록 명확히 처리

### 3. GSAP ticker 등록 타이밍
- **현재**: Timeline 생성 후 즉시 등록
- **문제**: `tl.restart()` 호출 전에 등록되지만, `isActive: false`인 동안에는 작동하지 않음
- **해결**: `tl.restart()` 직후 즉시 한 번 렌더링하거나, `isActive: false`인 동안에도 렌더링하도록 수정

## 💡 해결 방안

### 방안 1: `tl.restart()` 직후 즉시 렌더링
```typescript
requestAnimationFrame(() => {
  tl.restart()
  // 즉시 렌더링 (isActive: false 상태여도)
  if (appRef.current) {
    appRef.current.render()
  }
  // GSAP ticker가 활성화될 때까지 계속 렌더링
})
```

### 방안 2: PixiJS ticker 로직 개선
```typescript
if (activeAnimationsRef && activeAnimationsRef.current.size > 0) {
  let hasActiveAnimation = false
  let hasPausedAnimation = false
  activeAnimationsRef.current.forEach((tl) => {
    if (tl && tl.isActive && tl.isActive() && !tl.paused()) {
      hasActiveAnimation = true
    } else if (tl && !tl.paused()) {
      // paused가 false이지만 아직 isActive가 false인 경우
      hasPausedAnimation = true
    }
  })
  // 실제로 활성화된 애니메이션이 있으면 건너뛰기
  if (hasActiveAnimation) {
    return
  }
  // paused가 false이지만 아직 시작되지 않은 경우는 렌더링
  if (hasPausedAnimation) {
    app.render()
    return
  }
}
```

### 방안 3: GSAP ticker 조건 완화
```typescript
const renderTicker = gsap.ticker.add(() => {
  // isActive가 false여도 paused가 false이면 렌더링
  if (!tl.paused() && appRef.current) {
    appRef.current.render()
  }
})
```

## 📊 결론

**확인된 사실:**
- ✅ Timeline은 정상적으로 생성되고 시작됨
- ✅ `onStart`, `onComplete` 콜백이 정상 호출됨
- ✅ 첫 프레임에서 `isActive: true`가 됨
- ❌ `tl.restart()` 직후 `isActive: false`인 짧은 시간 동안 렌더링이 누락될 수 있음

**추천 해결책:**
방안 1 + 방안 2 조합: `tl.restart()` 직후 즉시 렌더링하고, PixiJS ticker 로직을 개선하여 `isActive: false`인 동안에도 렌더링하도록 수정

