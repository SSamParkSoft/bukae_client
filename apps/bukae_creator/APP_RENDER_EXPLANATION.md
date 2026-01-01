# app.render()와 전환 효과의 관계

## 핵심 답변

**`app.render()`는 전환 효과를 만드는 것이 아니라, GSAP가 만든 전환 효과를 화면에 그리는 역할을 합니다.**

## 작동 원리

### 1. 전환 효과 생성 (GSAP)

전환 효과는 **GSAP Timeline**이 만듭니다:

```typescript
// usePixiEffects.ts:199-238
const tl = gsap.timeline({
  timeScale: playbackSpeed,
  onComplete: () => {
    // 전환 효과 완료 처리
  }
})

// 페이드 효과 예시
const fadeObj = { alpha: 0 }
tl.to(fadeObj, { 
  alpha: 1, 
  duration, 
  onUpdate: function() {
    // GSAP가 매 프레임마다 이 콜백을 호출
    // fadeObj.alpha 값이 0에서 1로 점진적으로 증가
    toSprite.alpha = fadeObj.alpha  // 스프라이트의 alpha 속성 업데이트
  }
})
```

**GSAP의 역할**:
- 매 프레임마다 `onUpdate` 콜백 호출
- 스프라이트/텍스트의 속성(alpha, position, scale 등)을 점진적으로 변경
- 예: `alpha: 0` → `0.1` → `0.2` → ... → `1.0`

### 2. 렌더링 (app.render())

**`app.render()`의 역할**:
- 현재 PixiJS stage의 상태를 canvas에 그립니다
- GSAP가 변경한 속성들을 화면에 반영합니다

```typescript
// usePixiFabric.ts:164-173
const tickerCallback = () => {
  if (!appRef.current || !appRef.current.canvas) {
    return
  }
  // Canvas 렌더링 (유일한 렌더링 지점)
  appRef.current.render()  // 현재 stage 상태를 canvas에 그림
}
app.ticker.add(tickerCallback)  // 매 프레임마다 자동 호출
```

**렌더링 과정**:
1. GSAP가 `toSprite.alpha = 0.5`로 변경
2. `app.render()` 호출
3. PixiJS가 현재 stage 상태를 읽음 (alpha = 0.5)
4. Canvas에 alpha = 0.5인 스프라이트를 그림

### 3. 렌더링 메커니즘

현재 코드에는 **두 가지 렌더링 경로**가 있습니다:

#### A. PixiJS Ticker (기본 렌더링)
```typescript
// usePixiFabric.ts:164-173
app.ticker.add(() => {
  app.render()  // 매 프레임마다 자동 호출
})
```
- **항상 실행**: 재생 중이든 아니든 계속 실행
- **역할**: 기본 렌더링 루프

#### B. GSAP Ticker (전환 효과 중 렌더링)
```typescript
// usePixiEffects.ts:771-775 (참고)
const renderTicker = gsap.ticker.add(() => {
  if (tl.isActive() && !tl.paused() && appRef.current) {
    appRef.current.render()  // 전환 효과 중에만 호출
  }
})
```
- **조건부 실행**: Timeline이 활성화되어 있을 때만 실행
- **역할**: 전환 효과 중 추가 렌더링 보장

## 전체 흐름

```
1. 씬 전환 시작
   ↓
2. applyEnterEffect() 호출
   ↓
3. GSAP Timeline 생성
   ↓
4. tl.restart() 호출 → Timeline 시작
   ↓
5. GSAP ticker가 매 프레임마다:
   - onUpdate 콜백 호출
   - toSprite.alpha = fadeObj.alpha (속성 변경)
   ↓
6. app.render() 호출 (PixiJS Ticker 또는 GSAP Ticker)
   ↓
7. PixiJS가 변경된 속성을 읽어서 canvas에 그림
   ↓
8. 화면에 전환 효과가 보임 (페이드 인, 슬라이드 등)
   ↓
9. Timeline 완료 → onComplete 콜백 호출
```

## 중요한 포인트

### ✅ app.render()는 전환 효과를 만드는 것이 아님
- `app.render()`는 단순히 현재 상태를 그리는 함수입니다
- 전환 효과는 GSAP Timeline이 만듭니다

### ✅ 전환 효과가 보이려면 app.render()가 필요함
- GSAP가 속성을 변경해도 `app.render()`가 호출되지 않으면 화면에 반영되지 않습니다
- 따라서 전환 효과 중에는 반드시 `app.render()`가 호출되어야 합니다

### ✅ 현재 코드의 렌더링 방식
- **PixiJS Ticker**: 항상 실행 (기본 렌더링)
- **GSAP Ticker**: 전환 효과 중 추가 보장 (중복이지만 안전장치)
- 코드 주석: "렌더링은 PixiJS ticker가 처리"

## 예시: 페이드 인 효과

```typescript
// 1. GSAP Timeline 생성
const fadeObj = { alpha: 0 }
const tl = gsap.timeline()
tl.to(fadeObj, {
  alpha: 1,
  duration: 0.5,
  onUpdate: function() {
    toSprite.alpha = fadeObj.alpha  // 속성 변경
    // app.render()는 별도로 호출됨 (Ticker가 처리)
  }
})

// 2. Timeline 시작
tl.restart()

// 3. 매 프레임마다:
// - GSAP: fadeObj.alpha를 0 → 0.02 → 0.04 → ... → 1.0으로 증가
// - onUpdate: toSprite.alpha = fadeObj.alpha (속성 업데이트)
// - PixiJS Ticker: app.render() 호출
// - PixiJS: alpha = 0.02인 스프라이트를 canvas에 그림
// - 화면: 점점 밝아지는 스프라이트가 보임

// 4. 0.5초 후:
// - fadeObj.alpha = 1.0
// - toSprite.alpha = 1.0
// - 화면: 완전히 보이는 스프라이트
```

## 결론

**`app.render()`를 사용하면 전환 효과가 붙어서 렌더링되는 것이 아니라, GSAP가 만든 전환 효과(속성 변경)를 화면에 그리는 것입니다.**

- 전환 효과 생성: **GSAP Timeline**
- 전환 효과 렌더링: **app.render()** (PixiJS Ticker 또는 GSAP Ticker가 호출)

