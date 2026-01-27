# 캔버스 렌더링 로직 설명

## 개요

이 문서는 Bukae Creator의 Step 3(영상 편집)에서 캔버스 위에 렌더링이 어떻게 이루어지는지 설명합니다.

핵심 원칙:
- **Transport 기반 결정적 렌더링**: 타임라인 시간 `t`를 중심으로 한 결정적 렌더링 시스템
- **이중 렌더링 루프**: Transport 루프(씬 상태 업데이트) + PixiJS Ticker(실제 캔버스 렌더링)
- **순수 함수적 렌더링**: 같은 `t`에 대해 항상 같은 결과를 보장

⸻

## 전체 렌더링 아키텍처

### 1. 렌더링 파이프라인 초기화 (`usePixiFabric`)

**위치**: `hooks/video/pixi/usePixiFabric.ts`

PixiJS Application을 초기화하고, Ticker에 렌더링 콜백을 등록합니다.

```typescript
// PixiJS Application 초기화
const app = new PIXI.Application()
app.init({
  width,
  height,
  backgroundColor: 0x000000,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  autoStart: true,
})

// Ticker에 렌더링 콜백 추가 (유일한 렌더링 지점)
const tickerCallback = () => {
  const currentApp = appRef.current
  if (!currentApp || !currentApp.canvas) {
    return
  }
  
  // 컨테이너의 모든 자식 객체가 유효한지 확인 (destroyed된 객체 제거)
  if (containerRef.current) {
    const children = Array.from(containerRef.current.children)
    children.forEach((child) => {
      if (child && 'destroyed' in child && child.destroyed) {
        containerRef.current?.removeChild(child)
      }
    })
  }
  
  // Canvas 렌더링 (유일한 렌더링 지점)
  currentApp.render()
}

app.ticker.add(tickerCallback)
```

**핵심 포인트**:
- PixiJS Ticker가 매 프레임(약 60fps)마다 `app.render()`를 호출하여 실제 캔버스에 그립니다
- 이 콜백이 실제 캔버스 렌더링의 유일한 진입점입니다
- 컨테이너의 destroyed된 객체를 정리하여 메모리 누수를 방지합니다

⸻

### 2. Transport 기반 렌더링 (`useTransportRenderer`)

**위치**: `hooks/video/renderer/useTransportRenderer.ts`

Transport의 시간 `t`를 기준으로 씬 상태를 업데이트합니다.

#### 2.1 재생 중 렌더링 루프

재생 중일 때 `requestAnimationFrame` 루프에서 매 프레임마다 `renderAt(t)`를 호출합니다.

```typescript
const renderLoop = () => {
  const currentTransportState = transport?.getState()
  if (!transport || !currentTransportState?.isPlaying) {
    renderLoopRef.current = null
    return
  }

  const currentTime = transport.getTime()
  const totalDuration = currentTransportState.totalDuration
  
  // 재생이 끝났는지 확인
  if (totalDuration > 0 && currentTime >= totalDuration) {
    transport.pause()
    renderLoopRef.current = null
    return
  }
  
  // renderAt 호출
  renderAt(currentTime, { skipAnimation: false })
  
  renderLoopRef.current = requestAnimationFrame(renderLoop)
}

renderLoopRef.current = requestAnimationFrame(renderLoop)
```

**핵심 포인트**:
- 재생 중일 때만 렌더링 루프가 실행됩니다
- 매 프레임마다 `transport.getTime()`으로 현재 시간 `t`를 가져옵니다
- `renderAt(t)`를 호출하여 해당 시간의 프레임을 렌더링합니다

#### 2.2 `renderAt(t)` - 결정적 렌더링 함수

타임라인 시간 `t`에 해당하는 프레임을 결정적으로 렌더링합니다.

**핵심 원칙**:
1. 매 프레임마다 canvas를 비우고 현재 씬/구간만 새로 렌더링 (결정적 렌더링)
2. 씬이 로드되지 않았으면 사전 로드
3. 씬이 로드된 후에만 이미지/자막 렌더링
4. GSAP 애니메이션을 Transport `t`에 동기화

**렌더링 단계**:

**1단계: 씬/구간 계산**
```typescript
// t에서 씬과 구간 계산
let sceneIndex: number
let partIndex: number = 0

if (options?.forceSceneIndex !== undefined) {
  sceneIndex = options.forceSceneIndex
  // 해당 씬 범위 내에서 partIndex 계산
} else {
  const calculated = calculateSceneFromTime(timeline, tSec, {
    ttsCacheRef,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
  })
  sceneIndex = calculated.sceneIndex
  partIndex = calculated.partIndex
}
```

**2단계: 중복 렌더링 방지**
```typescript
// segmentChanged 또는 sceneChanged 체크
let segmentChanged = false
if (getActiveSegment) {
  const activeSegment = getActiveSegment(tSec)
  if (activeSegment) {
    currentSegmentIndex = activeSegment.segmentIndex
    segmentChanged = currentSegmentIndex !== lastRenderedSegmentIndexRef.current
  }
}

const sceneChanged = sceneIndex !== lastRenderedSceneIndexRef.current
const needsRender = shouldRender || sceneChanged

// 중복 렌더링 방지 (전환 효과 진행 중이 아닐 때만)
const isDuplicateRender = !isTransitionInProgress && 
  (!needsRender || 
   (lastRenderedSceneIndexRef.current === sceneIndex && 
    Math.abs(tSec - lastRenderedTRef.current) < TIME_EPSILON_STRICT))

if (isDuplicateRender && !isTransitionInProgress) {
  return // 조기 반환
}
```

**3단계: 씬 로딩 확인**
```typescript
// 씬이 로드되었는지 확인
const sprite = spritesRef.current.get(sceneIndex)
const sceneText = textsRef.current.get(sceneIndex)
const sceneLoaded = sprite !== undefined || sceneText !== undefined

// 씬이 로드되지 않았으면 사전 로드
if (!sceneLoaded) {
  const loadingState = sceneLoadingStates.get(sceneIndex)
  if (loadingState !== 'loading' && loadingState !== 'loaded') {
    loadScene(sceneIndex).catch(() => {
      // 씬 로드 실패 처리
    })
  }
  return
}
```

**4단계: 컨테이너 정리**
```typescript
// 전환 효과가 진행 중이 아니고 씬이 변경되었을 때만 컨테이너 정리
const isTransitioning = activeAnimationsRef && (
  activeAnimationsRef.current.has(sceneIndex) || 
  (previousRenderedSceneIndex !== null && activeAnimationsRef.current.has(previousRenderedSceneIndex))
)

if (!isTransitioning && previousRenderedSceneIndex !== null && 
    previousRenderedSceneIndex !== sceneIndex && containerRef.current) {
  // 이전 씬의 스프라이트와 텍스트만 제거
  const previousSprite = spritesRef.current.get(previousRenderedSceneIndex)
  const previousText = textsRef.current.get(previousRenderedSceneIndex)
  
  if (previousSprite && !previousSprite.destroyed && 
      previousSprite.parent === containerRef.current && !previousSpriteInTransition) {
    containerRef.current.removeChild(previousSprite)
  }
  if (previousText && !previousText.destroyed && 
      previousText.parent === containerRef.current) {
    containerRef.current.removeChild(previousText)
  }
}
```

**5단계: 스프라이트 렌더링**
```typescript
// 현재 씬의 이미지 렌더링
if (sprite && !sprite.destroyed && containerRef.current) {
  const container = containerRef.current
  
  // 스프라이트가 컨테이너에 없으면 추가
  if (sprite.parent !== container) {
    if (sprite.parent) {
      sprite.parent.removeChild(sprite)
    }
    container.addChild(sprite)
  }
  
  // 스프라이트를 맨 아래 레이어로 설정
  container.setChildIndex(sprite, 0)
  
  // 씬이 변경되었을 때만 전환 효과 적용
  if (sceneChanged && applyEnterEffect && !options?.skipAnimation) {
    applyEnterEffect(
      sprite,
      sceneText || null,
      transition,
      transitionDuration || 0.5,
      stageDimensions.width,
      stageDimensions.height,
      sceneIndex,
      undefined,
      undefined,
      previousRenderedSceneIndex,
      undefined,
      currentScene.sceneId,
      isPlaying,
      previousSprite
    )
  } else {
    // 씬이 변경되지 않았거나 skipAnimation이면 즉시 표시
    const isInTransition = activeAnimationsRef && 
      activeAnimationsRef.current.has(sceneIndex)
    if (!isInTransition) {
      sprite.visible = true
      sprite.alpha = 1
    }
  }
}
```

**6단계: 텍스트 렌더링**
```typescript
// 현재 씬의 텍스트 객체를 컨테이너에 추가
if (sceneText && !sceneText.destroyed && containerRef.current) {
  const container = containerRef.current
  
  if (sceneText.parent !== container) {
    if (sceneText.parent) {
      sceneText.parent.removeChild(sceneText)
    }
    container.addChild(sceneText)
  }
  
  // 텍스트는 항상 최상위 레이어
  const maxIndex = container.children.length - 1
  if (maxIndex > 0 && container.getChildIndex(sceneText) !== maxIndex) {
    container.setChildIndex(sceneText, maxIndex)
  }
}

// 다른 씬의 텍스트 객체 숨기기 (자막 누적 방지)
textsRef.current.forEach((textObj, textSceneIndex) => {
  if (textSceneIndex !== sceneIndex && !textObj.destroyed) {
    textObj.visible = false
    textObj.alpha = 0
  }
})

// 자막 렌더링
renderSubtitlePart(sceneIndex, partIndex, {
  skipAnimation: options?.skipAnimation,
  onComplete: () => {
    // 자막 렌더링 완료 후 추가 처리
  },
})
```

**7단계: 전환 효과 애니메이션 동기화**
```typescript
// 전환 효과 애니메이션 seek (매 프레임마다)
if (!options?.skipAnimation) {
  const currentScene = timeline.scenes[sceneIndex]
  const transitionDuration = isSameSceneId ? 0 : (currentScene?.transitionDuration || 0.5)
  
  // 씬 시작 시간 계산
  let sceneStartTime = 0
  for (let i = 0; i < sceneIndex; i++) {
    // TTS duration 계산
    let sceneDuration = 0
    // ... duration 계산 로직
    
    sceneStartTime += sceneDuration + prevTransitionDuration
  }
  
  // 전환 효과 시작 시간
  const transitionStartTime = sceneStartTime - transitionDuration
  const relativeTime = Math.max(0, tSec - transitionStartTime)
  
  // 전환 효과 진행 중일 때만 동기화
  if (transitionDuration > 0 && relativeTime >= 0 && relativeTime <= transitionDuration) {
    const animation = activeAnimationsRef?.current.get(sceneIndex)
    const progress = Math.min(1, relativeTime / transitionDuration)
    
    // GSAP 애니메이션이 있으면 동기화
    if (animation) {
      animation.time(relativeTime)
      animation.invalidate()
      gsap.updateRoot(Date.now() / 1000)
    }
    
    // 단순 효과는 직접 계산하여 업데이트
    if (currentTransition === 'fade') {
      currentSprite.alpha = progress
      currentSprite.visible = true
      
      // 이전 씬의 스프라이트 페이드 아웃
      if (previousSprite) {
        previousSprite.alpha = 1 - progress
        previousSprite.visible = previousSprite.alpha > 0
      }
    }
    // slide, zoom, rotate, blur 등도 직접 계산
  }
}
```

⸻

## 렌더링 흐름 다이어그램

```
1. 초기화 단계
   └─ usePixiFabric: PixiJS Application 생성 + Ticker 콜백 등록
   
2. 재생 중 (isPlaying = true)
   └─ requestAnimationFrame 루프
      └─ transport.getTime() → 현재 시간 t 가져오기
      └─ renderAt(t) 호출
         ├─ 씬/part 계산
         ├─ 중복 렌더링 방지 체크
         ├─ 씬 로딩 확인
         ├─ 컨테이너 정리
         ├─ 스프라이트/텍스트 상태 업데이트
         ├─ 전환 효과 적용 (GSAP timeline.seek(t))
         └─ PixiJS 객체 속성 변경 (alpha, position, scale 등)
   
3. 실제 캔버스 렌더링 (매 프레임)
   └─ PixiJS Ticker 콜백 (60fps)
      └─ app.render() → WebGL로 캔버스에 그리기
```

⸻

## 핵심 원칙

### 1. 결정적 렌더링 (Deterministic Rendering)

- 같은 `t`를 입력하면 항상 같은 결과를 보장합니다
- 이전 프레임의 상태를 누적하지 않고, 매 프레임마다 `t`에서 상태를 재계산합니다
- 상태 관리가 단순해지고 누적 문제를 방지합니다

### 2. 이중 루프 구조

- **Transport 루프**: `renderAt(t)`로 씬 상태 업데이트
- **PixiJS Ticker**: 실제 캔버스 렌더링

이 구조로 인해:
- Transport의 시간 `t`가 단일 기준(SSOT)이 됩니다
- Seek/Pause/Resume이 안정적으로 동작합니다
- 렌더링과 상태 업데이트가 분리되어 유지보수가 쉬워집니다

### 3. 상태 기반 렌더링

- 이전 프레임의 상태를 기준으로 조금씩 업데이트하지 않습니다
- 매 프레임마다 `t`에서 상태를 재계산합니다
- 순수 함수처럼 동작하여 디버깅이 쉬워집니다

⸻

## 주요 함수

### `loadScene(sceneIndex: number)`

씬의 이미지와 텍스트를 로드하고 PixiJS 객체를 생성합니다.

**처리 과정**:
1. 이미지 URL 유효성 검사
2. 텍스처 로드 (캐시 사용)
3. PIXI.Sprite 생성 및 Transform 적용
4. PIXI.Text 생성 및 스타일 적용
5. 컨테이너에 추가

**최적화**:
- 같은 그룹(sceneId) 내 씬들은 첫 번째 씬의 이미지와 스프라이트를 공유합니다
- 텍스처 캐싱을 통해 중복 로딩을 방지합니다

### `renderSubtitlePart(sceneIndex, partIndex, options)`

자막의 특정 부분을 렌더링합니다.

**처리 과정**:
1. 자막 텍스트를 구분자(`|||`)로 분할
2. 해당 partIndex의 텍스트 추출
3. 같은 그룹 내 다른 텍스트 숨김 (겹침 방지)
4. 텍스트 객체 업데이트 및 표시

⸻

## 전환 효과 처리

### 단순 효과 (수식 기반)

페이드, 슬라이드, 줌, 회전, 블러 등은 수식으로 직접 계산합니다.

**예시: 페이드 효과**
```typescript
const progress = Math.min(1, relativeTime / transitionDuration)
currentSprite.alpha = progress
currentSprite.visible = true

// 이전 씬 페이드 아웃
if (previousSprite) {
  previousSprite.alpha = 1 - progress
  previousSprite.visible = previousSprite.alpha > 0
}
```

### 복잡한 효과 (GSAP 기반)

글리치, 원형 등 복잡한 효과는 GSAP timeline을 사용하되, Transport의 `t`에 동기화합니다.

```typescript
if (animation) {
  // GSAP timeline의 time을 Transport 시간 t와 직접 동기화
  animation.time(relativeTime)
  animation.invalidate()
  gsap.updateRoot(Date.now() / 1000)
}
```

**핵심**: GSAP가 시간을 흘려가게 하는 것이 아니라, Transport의 `t`에 맞춰 GSAP가 그 시간 상태를 보여주는 것입니다.

⸻

## 성능 최적화

### 1. 중복 렌더링 방지

- 같은 `t`와 같은 `sceneIndex`로 렌더링하는 경우 스킵합니다
- 전환 효과 진행 중일 때는 매 프레임마다 업데이트합니다

### 2. 씬 로딩 최적화

- 필요한 씬만 사전 로드합니다
- 같은 그룹 내 씬들은 리소스를 공유합니다
- 텍스처 캐싱을 통해 중복 로딩을 방지합니다

### 3. 객체 재사용

- 스프라이트와 텍스트 객체를 재사용합니다
- 매 프레임마다 새로 생성하지 않고, 기존 객체의 속성만 업데이트합니다

⸻

## 디버깅

### 주요 로그 포인트

1. **씬 변경 감지**: `[useTransportRenderer] Render start`
2. **컨테이너 상태**: `[useTransportRenderer] Container state`
3. **전환 효과 업데이트**: `[useTransportRenderer] Transition update`
4. **중복 렌더링 방지**: `[useTransportRenderer] Duplicate render prevented`

### 디버깅 팁

- `lastRenderedTRef`, `lastRenderedSceneIndexRef`를 확인하여 렌더링 상태를 추적할 수 있습니다
- 전환 효과 진행 중일 때는 `relativeTime`과 `progress`를 확인합니다
- 컨테이너의 자식 객체 수를 확인하여 누적 문제를 감지할 수 있습니다

⸻

## 참고 문서

- `ANIMATION.md`: 애니메이션 렌더링 재구현 가이드
- `ARCHITECTURE.md`: 전체 시스템 아키텍처
- `hooks/video/renderer/useTransportRenderer.ts`: 실제 구현 코드
