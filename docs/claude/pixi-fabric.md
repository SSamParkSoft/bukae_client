# PixiJS란?

> 브라우저에서 GPU를 쓸 수 있게 해주는 2D 렌더링 엔진
> 
- WebGL / WebGPU 기반으로 GPU 가속 렌더링
- 일반 HTML Canvas(CPU)보다 수십~수백 배 빠름
- Adobe Flash의 현대적 대체제
- 온라인 게임, 인터랙티브 광고, 데이터 시각화, 영상편집기 등에 사용

---

# 핵심 개념 — 텍스처 vs 스프라이트

| 개념 | 정의 | 비유 |
| --- | --- | --- |
| **Texture** | GPU 메모리에 올라간 순수한 픽셀 데이터 | 인쇄소의 원본 필름 |
| **Sprite** | 텍스처를 화면의 특정 위치/크기/각도로 그려주는 오브젝트 | 필름으로 뽑은 출력물 |
- 텍스처 = **"무엇을"** (이미지 데이터, GPU에 1개만 존재)
- 스프라이트 = **"어디에, 어떻게"** (위치, 크기, 회전, 투명도)
- 같은 텍스처로 스프라이트 여러 개 생성 가능 → 메모리는 1개 분량만 사용

## 영상도 스프라이트다

영상은 **"매 프레임마다 텍스처가 바뀌는 스프라이트"**

```jsx
const videoTexture = Texture.from(videoElement); // video 태그 → 텍스처
const videoSprite = new Sprite(videoTexture);     // 텍스처 → 스프라이트

// 이제 일반 이미지 스프라이트와 동일하게 다룰 수 있음
videoSprite.filters = [blurFilter];
videoSprite.mask = circleMask;
```

---

# 영상편집기에 유용한 PixiJS 기능들

## 1. 🎨 Filters — 실시간 영상 효과

영상에 GPU 기반으로 시각 효과를 실시간 적용

### 기본 내장 필터

```jsx
// 가우시안 블러
videoSprite.filters = [new BlurFilter({ strength: 8 })];

// 색상 조정 (밝기 / 대비 / 채도 / 색조)
const colorMatrix = new ColorMatrixFilter();
colorMatrix.brightness(1.3);
colorMatrix.contrast(1.2);
colorMatrix.saturate(0.8);
colorMatrix.hue(30);
videoSprite.filters = [colorMatrix];

// 필름 그레인 (노이즈)
videoSprite.filters = [new NoiseFilter({ noise: 0.15 })];

// 여러 필터 동시 적용 (순서대로 처리됨)
videoSprite.filters = [colorMatrix, bloomFilter, noiseFilter];
```

### pixi-filters 확장 패키지 (`npm install @pixi/filters`)

| 필터 | 용도 |
| --- | --- |
| `AdjustmentFilter` | gamma, saturation, contrast, brightness, R/G/B 개별 조정 |
| `DropShadowFilter` | 자막 그림자 |
| `GlowFilter` | 발광 효과 |
| `AdvancedBloomFilter` | 빛 번짐 (시네마틱) |
| `VignetteFilter` | 비네팅 (모서리 어둡게) |
| `CRTFilter` | 레트로 CRT 모니터 효과 |
| `ColorMapFilter` | LUT 색보정 (인스타 필터) |
| `ColorReplaceFilter` | 크로마키 (특정 색 제거) |
| `MotionBlurFilter` | 모션 블러 |
| `GodrayFilter` | 빛 갈라짐 효과 |

---

## 2. 🖼️ RenderTexture — 프레임 캡처 / 합성

현재 렌더링 결과를 텍스처로 캡처

```jsx
const renderTexture = RenderTexture.create({ width: 1920, height: 1080 });
app.renderer.render({ container: videoContainer, target: renderTexture });

// 활용: 썸네일 추출, 특정 프레임 스냅샷, PiP (화면 속 화면)
const thumbnail = new Sprite(renderTexture);
```

---

## 3. 🎭 Masking — 마스크 / 크롭

```jsx
// 원형 마스크
const mask = new Graphics();
mask.circle(0, 0, 100).fill(0xffffff);
videoSprite.mask = mask;

// 이미지 마스크 (알파 채널 기반)
const alphaMask = Sprite.from('mask_shape.png');
videoSprite.mask = alphaMask;
```

활용: 원형/하트 크롭, 불규칙한 모양 크롭, 와이프 트랜지션

---

## 4. 📐 Graphics — 벡터 도형

```jsx
const g = new Graphics();

// 자막 배경 박스 (둥근 모서리, 반투명)
g.roundRect(0, 0, 400, 60, 10).fill({ color: 0x000000, alpha: 0.6 });

// 타임라인 진행 바
g.rect(0, 0, currentProgress * totalWidth, 4).fill(0xff0000);
```

활용: 자막 배경, 타임라인 UI, 진행 표시바, 워터마크 박스

---

## 5. ✍️ Text — GPU 가속 텍스트

```jsx
const subtitle = new Text({
  text: '자막 내용',
  style: {
    fontFamily: 'Arial',
    fontSize: 36,
    fill: 0xffffff,
    stroke: { color: 0x000000, width: 4 },
    dropShadow: { color: 0x000000, blur: 4, distance: 6 },
  }
});
```

활용: 자막, 워터마크, 타임코드 표시, 챕터 제목

---

## 6. 🪄 Blend Modes — 레이어 합성

Photoshop의 레이어 블렌딩과 동일

```jsx
overlaySprite.blendMode = 'overlay';    // 오버레이
lightLeak.blendMode = 'screen';          // 스크린 (밝게 합성)
shadowLayer.blendMode = 'multiply';      // 곱하기 (어둡게)
glowSprite.blendMode = 'color-dodge';    // 색상 닷지 (빛 번짐)
```

활용: 라이트 누수(Light Leak), 필름 번짐, 오버레이 텍스처 합성

---

## 7. 📦 Container + Scene Graph — 레이어 관리

```jsx
const scene = new Container();

const videoLayer    = new Container(); // zIndex: 0
const effectLayer   = new Container(); // zIndex: 1
const subtitleLayer = new Container(); // zIndex: 10
const uiLayer       = new Container(); // zIndex: 100

scene.addChild(videoLayer, effectLayer, subtitleLayer, uiLayer);
scene.sortableChildren = true;
```

활용: 영상편집기의 트랙 / 레이어 시스템 구현

---

## 8. ⏱️ Ticker — 매 프레임 실행 루프

```jsx
app.ticker.add((ticker) => {
  // 자막 타이밍 동기화
  subtitles.forEach(sub => {
    sub.visible = (currentTime >= sub.startTime && currentTime <= sub.endTime);
  });

  // 필터 실시간 업데이트
  noiseFilter.seed = Math.random();
});
```

활용: 자막 타이밍 동기화, 실시간 필터 업데이트, 애니메이션 루프

---

## 9. ✂️ RenderLayers — 독립 렌더링 레이어 (v8 신기능)

```jsx
// 자막은 항상 맨 위에 렌더링 보장
const subtitleRenderLayer = new RenderLayer();
app.stage.addRenderLayer(subtitleRenderLayer);
subtitleSprite.parentRenderLayer = subtitleRenderLayer;
```

---

## 기능 요약

| 기능 | 영상편집기에서의 역할 |
| --- | --- |
| **Filters** | 색보정, 블러, 글로우, LUT, 크로마키 |
| **RenderTexture** | 프레임 캡처, 썸네일, PiP |
| **Masking** | 크롭, 와이프 트랜지션 |
| **Graphics** | 자막 배경, 타임라인 UI |
| **Text** | 자막, 워터마크 |
| **Blend Modes** | 라이트 누수, 레이어 합성 |
| **Container** | 트랙 / 레이어 시스템 |
| **Ticker** | 자막 타이밍, 프레임 루프 |
| **RenderLayers** | 렌더 순서 독립 제어 |

---

# Fabric.js + PixiJS 연동 구조

## 역할 분담

| 라이브러리 | 역할 | 담당 |
| --- | --- | --- |
| **Fabric.js** | 유저 인터랙션 (드래그, 선택, 핸들) | 입력 |
| **PixiJS** | GPU 기반 실제 렌더링 | 출력 |
| **GSAP** | 타임라인 / 애니메이션 타이밍 | 제어 |

## 레이어 구조

```
┌─────────────────────────┐  ← Fabric canvas (위, 인터랙션)
│  [선택핸들] [자막박스]   │     position: absolute; top: 0;
├─────────────────────────┤
│  PixiJS canvas (아래)   │  ← 영상 + 필터 실제 렌더링
└─────────────────────────┘
```

## 데이터 흐름

```
유저 마우스 조작
      ↓
 Fabric.js (투명 레이어)
 좌표 / 크기 / 회전 계산
      ↓
 PixiJS Sprite 동기화
      ↓
 GPU로 실제 렌더링
```

---

# 실제 연동 코드

## 초기 셋업

```jsx
// 1. PixiJS 앱 생성 (아래 레이어)
const pixiApp = new PIXI.Application();
await pixiApp.init({ width: 1280, height: 720 });
document.getElementById('container').appendChild(pixiApp.canvas);

// 2. Fabric 캔버스 생성 (위 레이어)
const fabricCanvas = new fabric.Canvas('fabricCanvas', {
  width: 1280,
  height: 720,
});
// CSS: position: absolute; top: 0; left: 0;
```

## 오브젝트 추가

```jsx
function addVideoClip(videoElement) {
  // PixiJS 스프라이트 생성
  const videoTexture = PIXI.Texture.from(videoElement);
  const videoSprite = new PIXI.Sprite(videoTexture);
  pixiApp.stage.addChild(videoSprite);

  // Fabric 오브젝트 생성 (투명한 조작용 박스)
  const fabricObj = new fabric.Rect({
    left: 0, top: 0,
    width: 640, height: 360,
    fill: 'transparent',   // 보이는 건 PixiJS가 담당
    stroke: 'transparent',
  });

  // 서로 참조 연결
  fabricObj.pixiSprite = videoSprite;
  fabricCanvas.add(fabricObj);
}
```

## 이벤트 동기화

```jsx
function syncToPixi(e) {
  const obj = e.target;
  const sprite = obj.pixiSprite;
  if (!sprite) return;

  sprite.x        = obj.left;
  sprite.y        = obj.top;
  sprite.width    = obj.width * obj.scaleX;
  sprite.height   = obj.height * obj.scaleY;
  sprite.rotation = (obj.angle * Math.PI) / 180; // 도 → 라디안
}

fabricCanvas.on('object:moving',   syncToPixi);
fabricCanvas.on('object:scaling',  syncToPixi);
fabricCanvas.on('object:rotating', syncToPixi);
fabricCanvas.on('object:modified', syncToPixi);
```

---

# 주의사항

## 좌표 단위 차이

- Fabric.js: `angle` (도, degree)
- PixiJS: `rotation` (라디안, radian)
- 변환: `radians = degrees * Math.PI / 180`

## 좌표 기준점 차이

- Fabric.js: 기본 기준점 = 오브젝트 **중심**
- PixiJS: 기본 기준점 = 오브젝트 **좌상단**
- PixiJS에서 중심 기준으로 맞추려면: `sprite.anchor.set(0.5)`

## 성능 팁

- 필터는 너무 많이 중첩하지 않기
- 사용하지 않는 스프라이트는 `destroy()` 호출로 메모리 해제
- 같은 이미지면 텍스처 1개로 스프라이트 여러 개 생성 (메모리 절약)