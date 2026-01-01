# Step4 Canvas 렌더링 방법 정리

## 개요
Step4 페이지에서는 **PixiJS**와 **Fabric.js** 두 가지 Canvas 라이브러리를 사용하여 비디오 편집 인터페이스를 구현합니다.

---

## 재생 버튼 클릭 시 실행되는 함수

### 호출 흐름

1. **재생 버튼 클릭** (`app/video/create/step4/page.tsx:3643`)
   ```tsx
   <Button onClick={videoPlayback.toggle}>
   ```

2. **`videoPlayback.toggle`** → **`handlePlayPause`** 함수 호출
   - 위치: `hooks/video/useVideoPlayback.ts:1005-1280`
   - 반환값: `{ toggle: handlePlayPause }` (1296줄)

### `handlePlayPause` 함수 동작

**재생 중이 아닐 때 (재생 시작)**:
1. 준비 상태 확인 (`isPreparing` 체크)
2. 필수 조건 검증:
   - `timeline` 존재 확인
   - `voiceTemplate` 선택 확인 (미선택 시 alert)
   - `pixiReady` 확인
   - 스프라이트 로드 확인
3. 전환 효과 미리보기 중지
4. TTS 합성 시작:
   - `setIsPreparingLocal(true)`
   - `setIsTtsBootstrapping(true)`
   - 현재 씬부터 마지막 씬까지 모든 TTS 배치 합성 (동시성 제한: 3개씩, 1초 딜레이)
   - 캐시된 씬은 스킵
5. BGM 로드 (재생은 하지 않음)
6. 모든 준비 완료 후 → **`startPlayback()`** 호출

**재생 중일 때 (일시정지)**:
- **`pauseAll()`** 함수 호출

### `startPlayback` 함수 (`useVideoPlayback.ts:303-955`)

실제 재생 로직을 처리하는 핵심 함수입니다.

**주요 동작**:
1. 재생 상태 설정:
   - `isPlayingRef.current = true`
   - `setIsPlaying(true)`

2. Timeline duration 업데이트:
   - 모든 씬의 TTS duration 계산 (캐시에서)
   - Timeline의 `scene.duration`을 실제 TTS duration으로 업데이트

3. BGM 페이드 아웃 설정:
   - Timeline 총 길이 기반으로 종료 시점에 페이드 아웃 적용

4. **`playNextScene()`** 함수 호출:
   - 재귀적으로 각 씬을 순차적으로 재생
   - 씬 전환: `selectScene()` 호출하여 전환 효과 적용
   - TTS 재생: 각 `|||` 구간별로 순차 재생
   - 자막 렌더링: `renderSceneContent()` 호출하여 자막 업데이트
   - 재생바 업데이트: 100ms마다 `setCurrentTime()` 호출
   - BGM 재생: 첫 번째 씬의 첫 번째 구간 재생 시작 시 BGM 시작

**`playNextScene` 내부 흐름**:
```typescript
playNextScene(sceneIndex) {
  1. 씬 전환 (selectScene 호출, 전환 효과 적용)
  2. TTS 재생 (playTts 함수)
     - 각 ||| 구간별로:
       a. renderSceneContent() 호출 (자막 렌더링)
       b. TTS 파일 가져오기 (캐시에서)
       c. Audio 객체 생성 및 재생
       d. 재생 완료 대기 (onended 이벤트)
       e. 다음 구간 또는 다음 씬으로 이동
  3. 재생 완료 시: 모든 오디오 정지, 상태 초기화
}
```

### `pauseAll` 함수 (`useVideoPlayback.ts:958-1002`)

일시정지 시 모든 재생 관련 로직을 정지합니다.

**주요 동작**:
1. 모든 timeout/interval 정리
2. 재생 상태 해제:
   - `isPlayingRef.current = false`
   - `setIsPlaying(false)`
   - `setTimelineIsPlaying(false)`
3. 오디오 정지:
   - `stopTtsAudio()`
   - `stopBgmAudio()`
4. 준비 상태 초기화:
   - `setIsPreparingLocal(false)`
   - 부트스트래핑 상태 초기화
5. TTS 세션 리셋: `resetTtsSession()`

---

## 렌더링 관련 함수 호출 위치

---

## 1. PixiJS 렌더링

### 1.1 자동 렌더링 (Ticker 기반)
**위치**: `hooks/video/usePixiFabric.ts`

PixiJS는 **Ticker**를 통해 자동으로 렌더링됩니다. 이는 가장 기본적이고 지속적인 렌더링 방식입니다.

```164:173:hooks/video/usePixiFabric.ts
          // Ticker에 렌더링 콜백 추가 (유일한 렌더링 지점)
          const tickerCallback = () => {
            // appRef.current가 null이거나 destroy되었는지 확인
            if (!appRef.current || !appRef.current.canvas) {
              return
            }
            
            // Canvas 렌더링 (유일한 렌더링 지점)
            appRef.current.render()
          }
          app.ticker.add(tickerCallback)
```

**특징**:
- `app.ticker`가 자동으로 실행되어 매 프레임마다 `app.render()` 호출
- 가장 효율적인 렌더링 방식 (필요할 때만 업데이트)
- 코드에서 "렌더링은 PixiJS ticker가 처리" 주석이 있는 곳은 이 방식을 의미

### 1.2 수동 렌더링 (필요 시)
직접 `app.render()`를 호출할 수도 있지만, 현재 코드에서는 Ticker를 통한 자동 렌더링만 사용합니다.

---

## 2. Fabric.js 렌더링

### 2.1 `renderAll()` - 즉시 전체 렌더링
**위치**: 여러 곳에서 사용

Fabric Canvas의 모든 객체를 즉시 렌더링합니다.

```290:291:app/video/create/step4/page.tsx
    fabricCanvas.discardActiveObject()
    fabricCanvas.renderAll()
```

**사용 사례**:
- 편집 모드 변경 시 (`editMode`, `useFabricEditing` 변경)
- Fabric 오브젝트 선택 해제 시

### 2.2 `requestRenderAll()` - 다음 프레임에 렌더링
**위치**: 여러 곳에서 사용

다음 애니메이션 프레임에 렌더링을 요청합니다. `renderAll()`보다 성능이 좋습니다.

```513:513:app/video/create/step4/page.tsx
        fabricCanvasRef.current?.requestRenderAll()
```

**사용 사례**:
- Fabric 오브젝트 수정 후 (`object:modified` 이벤트)
- 텍스트 내용 변경 후 (`text:changed` 이벤트)
- Fabric Canvas 크기 변경 후

```337:337:hooks/video/usePixiFabric.ts
      fabricCanvasRef.current?.requestRenderAll()
```

---

## 3. 씬 콘텐츠 렌더링 함수

### 3.1 `renderSceneContent()` - 통합 렌더링 함수
**위치**: `hooks/video/useSceneManager.ts` (1212-1346줄)

모든 canvas 렌더링 경로를 통합한 메인 렌더링 함수입니다.

```1212:1336:hooks/video/useSceneManager.ts
  // 통합 렌더링 함수: 모든 canvas 렌더링 경로를 통합
  const renderSceneContent = useCallback((
    sceneIndex: number,
    partIndex?: number | null,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      updateTimeline?: boolean
    }
  ) => {
    if (!timeline || !appRef.current) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    
    const {
      skipAnimation = false,
      forceTransition,
      previousIndex,
      onComplete,
      updateTimeline = true,
    } = options || {}
    
    // 구간 인덱스가 있으면 해당 구간의 텍스트 추출
    let partText: string | null = null
    if (partIndex !== undefined && partIndex !== null) {
      // 원본 텍스트에서 구간 추출
      const originalText = scene.text?.content || ''
      const scriptParts = originalText.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
      partText = scriptParts[partIndex]?.trim() || null
    }
    
    // timeline 업데이트 (필요한 경우)
    if (updateTimeline && partText && setTimeline) {
      const updatedTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((s, i) =>
          i === sceneIndex
            ? {
                ...s,
                text: {
                  ...s.text,
                  content: partText,
                },
              }
            : s
        ),
      }
      setTimeline(updatedTimeline)
    }
    
    // 텍스트 객체 찾기
    let targetTextObj: PIXI.Text | null = textsRef.current.get(sceneIndex) || null
    
    // 같은 그룹 내 첫 번째 씬의 텍스트 사용 (필요한 경우)
    if (!targetTextObj || (!targetTextObj.visible && targetTextObj.alpha === 0)) {
      const sceneId = scene.sceneId
      if (sceneId !== undefined) {
        const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
        if (firstSceneIndexInGroup >= 0) {
          targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
        }
      }
    }
    
    // 텍스트 객체 업데이트
    if (targetTextObj && partText) {
      targetTextObj.text = partText
      targetTextObj.visible = true
      targetTextObj.alpha = 1
    }
    
    // 스프라이트 표시
    const currentSprite = spritesRef.current.get(sceneIndex)
    if (currentSprite) {
      currentSprite.visible = true
      currentSprite.alpha = 1
    }
    
    // 같은 씬 내 구간 전환인지 확인
    // previousIndex가 제공되면 다른 씬으로 전환하는 것이므로 전환 효과 적용
    // previousIndex가 null이거나 제공되지 않고, partIndex가 제공되면 같은 씬 내 구간 전환
    const isSameSceneTransition = 
      currentSceneIndexRef.current === sceneIndex && 
      previousIndex === undefined && 
      partIndex !== undefined && 
      partIndex !== null &&
      partIndex > 0 // 첫 번째 구간(partIndex: 0)은 씬 전환과 함께 처리되므로 제외
    
    // 같은 씬 내 구간 전환인 경우: 자막만 업데이트 (전환 효과 없음)
    if (isSameSceneTransition) {
      // 렌더링은 PixiJS ticker가 처리
      if (onComplete) {
        onComplete()
      }
      return
    }
    
    // 다른 씬으로 이동하는 경우: 씬 전환
    if (setCurrentSceneIndex) {
      currentSceneIndexRef.current = sceneIndex
      setCurrentSceneIndex(sceneIndex)
    }
    
    // updateCurrentScene 호출하여 씬 전환
    // onComplete를 onAnimationComplete로 변환 (sceneIndex를 인자로 받음)
    updateCurrentScene(
      skipAnimation,
      previousIndex !== undefined ? previousIndex : currentSceneIndexRef.current,
      forceTransition,
      (completedSceneIndex: number) => {
        // 전환 완료 후 구간 텍스트가 올바르게 표시되었는지 확인
        if (partText && targetTextObj) {
          const finalText = textsRef.current.get(sceneIndex)
          if (finalText && finalText.text !== partText) {
            finalText.text = partText
            // 렌더링은 PixiJS ticker가 처리
          }
        }
        if (onComplete) {
          onComplete()
        }
      }
    )
  }, [
    timeline,
    appRef,
    textsRef,
    spritesRef,
    currentSceneIndexRef,
    updateCurrentScene,
    setTimeline,
    setCurrentSceneIndex,
  ])
```

**기능**:
- 씬 인덱스와 구간 인덱스를 받아 해당 콘텐츠 렌더링
- 같은 씬 내 구간 전환 시 자막만 업데이트 (전환 효과 없음)
- 다른 씬으로 전환 시 `updateCurrentScene()` 호출하여 전환 효과 적용
- PixiJS 객체(스프라이트, 텍스트)의 `visible`, `alpha` 속성 업데이트
- 실제 렌더링은 PixiJS Ticker가 처리

**호출 위치**:
- `app/video/create/step4/page.tsx` (873-1006줄): 래퍼 함수
- `hooks/video/useVideoPlayback.ts`: 재생 중 씬 전환
- `hooks/video/useSceneNavigation.ts`: 씬 네비게이션
- `hooks/video/useSceneHandlers.ts`: 씬 선택 핸들러

### 3.2 `updateCurrentScene()` - 씬 전환 렌더링
**위치**: `hooks/video/useSceneManager.ts` (84-919줄)

씬 전환 시 PixiJS 객체들을 업데이트하고 전환 효과를 적용합니다.

**주요 기능**:
- 이전 씬 숨기기 (`visible = false`, `alpha = 0`)
- 현재 씬 표시 (`visible = true`, `alpha = 1`)
- 전환 효과 적용 (`applyEnterEffect()` 호출)
- 고급 효과 적용 (`applyAdvancedEffects()` 호출)

**렌더링 방식**:
- PixiJS 객체의 속성만 변경
- 실제 렌더링은 Ticker가 처리

### 3.3 `loadAllScenes()` - 모든 씬 로드 및 렌더링
**위치**: `hooks/video/useSceneManager.ts` (1014-1209줄)

모든 씬의 이미지와 텍스트를 미리 로드하고 PixiJS 객체로 생성합니다.

**주요 기능**:
- 모든 씬의 이미지를 텍스처로 로드
- 모든 씬의 텍스트를 PIXI.Text 객체로 생성
- `spritesRef`, `textsRef`에 저장
- 로드 완료 후 현재 씬 표시 (`updateCurrentScene(true)`)

**렌더링 방식**:
- PixiJS 객체 생성 및 컨테이너에 추가
- 실제 렌더링은 Ticker가 처리

---

## 4. Fabric.js 동기화 렌더링

### 4.1 `syncFabricWithScene()` - Fabric과 PixiJS 동기화
**위치**: `hooks/video/useSceneManager.ts` (922-1011줄)

현재 씬의 PixiJS 상태를 Fabric Canvas에 동기화합니다.

```922:1011:hooks/video/useSceneManager.ts
  // Fabric 오브젝트를 현재 씬 상태에 맞게 동기화
  const syncFabricWithScene = useCallback(async () => {
    if (!useFabricEditing || !fabricCanvasRef.current || !timeline) return
    const fabricCanvas = fabricCanvasRef.current
    const sceneIndex = currentSceneIndexRef.current
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    const scale = fabricScaleRatioRef.current
    fabricCanvas.clear()

    const { width, height } = stageDimensions

    // 이미지 (좌표를 스케일 비율에 맞게 조정)
    if (scene.image) {
      const img = await (fabric.Image.fromURL as (url: string, options?: { crossOrigin?: string }) => Promise<fabric.Image>)(scene.image, { crossOrigin: 'anonymous' }) as fabric.Image
      if (img) {
        const transform = scene.imageTransform
        let left: number, top: number, imgScaleX: number, imgScaleY: number, angleDeg: number
        
        if (transform) {
          angleDeg = (transform.rotation || 0) * (180 / Math.PI)
          const effectiveWidth = transform.width * (transform.scaleX || 1)
          const effectiveHeight = transform.height * (transform.scaleY || 1)
          imgScaleX = (effectiveWidth / img.width) * scale
          imgScaleY = (effectiveHeight / img.height) * scale
          left = transform.x * scale
          top = transform.y * scale
        } else {
          // 초기 contain/cover 계산과 동일하게 배치
          const params = calculateSpriteParams(img.width, img.height, width, height, scene.imageFit || 'contain')
          imgScaleX = (params.width / img.width) * scale
          imgScaleY = (params.height / img.height) * scale
          left = params.x * scale
          top = params.y * scale
          angleDeg = 0
        }
        
        img.set({
          originX: 'left',
          originY: 'top',
          left,
          top,
          scaleX: imgScaleX,
          scaleY: imgScaleY,
          angle: angleDeg,
          selectable: true,
          evented: true,
        })
        ;(img as fabric.Image & { dataType?: 'image' | 'text' }).dataType = 'image'
        fabricCanvas.add(img)
      }
    }

    // 텍스트 (좌표를 스케일 비율에 맞게 조정)
    if (scene.text?.content) {
      const transform = scene.text.transform
      const angleDeg = (transform?.rotation || 0) * (180 / Math.PI)
      const baseFontSize = scene.text.fontSize || 48
      const scaledFontSize = baseFontSize * scale
      const fontFamily = resolveSubtitleFontFamily(scene.text.font)
      const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
      
      const textObj = new fabric.Textbox(scene.text.content, {
        left: (transform?.x ?? width / 2) * scale,
        top: (transform?.y ?? height * 0.9) * scale,
        originX: 'center',
        originY: 'center',
        fontFamily,
        fontSize: scaledFontSize,
        fill: scene.text.color || '#ffffff',
        fontWeight,
        fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
        underline: scene.text.style?.underline || false,
        textAlign: scene.text.style?.align || 'center',
        selectable: true,
        evented: true,
        angle: angleDeg,
      })
      if (transform) {
        // width가 있으면 박스 크기 반영
        if (transform.width) {
          textObj.set({ width: transform.width * scale })
        }
        // scaleX/scaleY는 이미 fontSize와 width에 반영됨
      }
      ;(textObj as fabric.Textbox & { dataType?: 'image' | 'text' }).dataType = 'text'
      fabricCanvas.add(textObj)
    }

    fabricCanvas.renderAll()
  }, [useFabricEditing, fabricCanvasRef, fabricScaleRatioRef, currentSceneIndexRef, timeline, stageDimensions])
```

**기능**:
- 현재 씬의 이미지와 텍스트를 Fabric Canvas에 추가
- 좌표를 스케일 비율에 맞게 조정
- `fabricCanvas.renderAll()` 호출하여 즉시 렌더링

**호출 시점**:
- 씬 변경 시
- 편집 모드 전환 시

---

## 5. 렌더링 흐름 요약

### 5.1 초기화 흐름
1. `usePixiFabric` 훅에서 PixiJS Application 생성
2. Ticker 콜백 등록 (`app.render()` 자동 호출)
3. Fabric Canvas 초기화 (편집 모드인 경우)
4. `loadAllScenes()` 호출하여 모든 씬 로드
5. 현재 씬 표시 (`updateCurrentScene(true)`)

### 5.2 씬 전환 흐름
1. `renderSceneContent()` 호출
2. 같은 씬 내 구간 전환인지 확인
   - 같은 씬: 텍스트만 업데이트 → Ticker가 렌더링
   - 다른 씬: `updateCurrentScene()` 호출
3. `updateCurrentScene()`에서:
   - 이전 씬 숨기기
   - 현재 씬 표시
   - 전환 효과 적용 (`applyEnterEffect()`)
   - 고급 효과 적용 (`applyAdvancedEffects()`)
4. Ticker가 자동으로 렌더링

### 5.3 편집 모드 흐름
1. `syncFabricWithScene()` 호출
2. Fabric Canvas에 현재 씬 콘텐츠 동기화
3. `fabricCanvas.renderAll()` 호출하여 즉시 렌더링
4. 사용자가 Fabric 오브젝트 수정
5. `object:modified` 이벤트 발생
6. `fabricCanvas.requestRenderAll()` 호출하여 다음 프레임에 렌더링

---

## 6. 렌더링 최적화

### 6.1 PixiJS
- **Ticker 기반 자동 렌더링**: 변경사항이 있을 때만 자동으로 렌더링
- **객체 속성 변경**: `visible`, `alpha` 등 속성만 변경하면 Ticker가 자동 렌더링
- **명시적 렌더링 불필요**: 대부분의 경우 Ticker가 처리

### 6.2 Fabric.js
- **`requestRenderAll()` 우선 사용**: `renderAll()`보다 성능이 좋음
- **이벤트 기반 렌더링**: 오브젝트 수정 시에만 렌더링 요청
- **`renderAll()`은 즉시 렌더링이 필요한 경우에만 사용**

---

## 7. 주요 렌더링 함수 호출 위치

| 함수 | 위치 | 용도 |
|------|------|------|
| `app.render()` | `usePixiFabric.ts` (Ticker) | PixiJS 자동 렌더링 |
| `fabricCanvas.renderAll()` | 여러 곳 | Fabric 즉시 렌더링 |
| `fabricCanvas.requestRenderAll()` | 여러 곳 | Fabric 다음 프레임 렌더링 |
| `renderSceneContent()` | 여러 hooks | 씬 콘텐츠 렌더링 |
| `updateCurrentScene()` | `useSceneManager.ts` | 씬 전환 렌더링 |
| `syncFabricWithScene()` | `useSceneManager.ts` | Fabric 동기화 렌더링 |
| `loadAllScenes()` | `useSceneManager.ts` | 모든 씬 로드 |

---

## 8. 주의사항

1. **PixiJS는 Ticker가 자동 렌더링하므로 명시적 `app.render()` 호출 불필요**
2. **Fabric.js는 수동 렌더링 필요**
3. **`renderSceneContent()`는 통합 함수이므로 가능하면 이 함수 사용 권장**
4. **같은 씬 내 구간 전환 시 전환 효과 없이 텍스트만 업데이트**
5. **편집 모드에서는 Fabric Canvas가 최상위에 표시되어야 함**

