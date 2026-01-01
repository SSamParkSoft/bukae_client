# 재생 중 Canvas 깜빡임 문제 해결

## 문제 원인

재생 중에 canvas가 꺼졌다 켜졌다 하는 문제의 주요 원인:

### 1. useEffect 의존성 배열 문제
**위치**: `app/video/create/step4/page.tsx:2562-2584`

**문제**:
- 재생 중이어도 `useFabricEditing`, `fabricReady`, `pixiReady`, `editMode`가 변경되면 canvas의 opacity가 변경됩니다.
- 재생 중에 이 값들이 변경되면 canvas가 숨겨질 수 있습니다.

**기존 코드**:
```typescript
if (isPlaying || isPreviewingTransition) {
  pixiCanvas.style.opacity = '1'
  // ...
} else if (useFabricEditing && fabricReady) {
  // 재생 중이 아니어도 useFabricEditing이 변경되면 여기로 올 수 있음
  pixiCanvas.style.opacity = '0'
  // ...
}
```

**문제점**:
- `isPlaying`이 true여도 `useFabricEditing`이나 `fabricReady`가 변경되면 useEffect가 다시 실행됩니다.
- 재생 중에 다른 상태가 변경되면 canvas가 깜빡일 수 있습니다.

### 2. 재생 중 씬 전환 시 스프라이트/텍스트 visible/alpha 변경
**위치**: `hooks/video/useSceneManager.ts:171-212`

**문제**:
- 재생 중 씬이 전환될 때 `updateCurrentScene`이 호출됩니다.
- 이 과정에서 이전 씬을 숨기고(`visible = false`, `alpha = 0`) 새 씬을 보여주는 과정에서 깜빡임이 발생할 수 있습니다.

**기존 코드**:
```typescript
// 이전 씬 숨기기
if (previousSprite && previousIndex !== null && previousIndex !== sceneIndex) {
  previousSprite.visible = false
  previousSprite.alpha = 0
}
// 현재 씬 표시
if (currentSprite) {
  currentSprite.visible = true
  currentSprite.alpha = 1
}
```

**문제점**:
- 이전 씬을 숨기고 새 씬을 보여주는 사이에 짧은 시간 동안 화면이 비어 보일 수 있습니다.
- 전환 효과가 적용되기 전에 깜빡임이 발생할 수 있습니다.

## 해결 방법

### 1. 재생 중 canvas visibility 고정
**수정 위치**: `app/video/create/step4/page.tsx:2562-2584`

**수정 내용**:
- 재생 중이면 다른 상태 변경에 영향받지 않도록 early return 추가
- 재생 중일 때는 canvas visibility를 변경하지 않음

**수정된 코드**:
```typescript
useEffect(() => {
  if (!pixiContainerRef.current) return
  const pixiCanvas = pixiContainerRef.current.querySelector('canvas:not([data-fabric])') as HTMLCanvasElement
  if (!pixiCanvas) return
  
  // 재생 중이거나 전환 효과 미리보기 중이면 항상 PixiJS 보이기
  // 재생 중에는 isPreviewingTransition이 false여도 PixiJS를 보여야 함
  // 재생 중일 때는 다른 상태 변경에 영향받지 않도록 먼저 체크
  if (isPlaying || isPreviewingTransition) {
    pixiCanvas.style.opacity = '1'
    pixiCanvas.style.pointerEvents = 'none'
    pixiCanvas.style.zIndex = '10'
    return // 재생 중이면 여기서 종료하여 다른 조건에 영향받지 않도록 함
  }
  
  // 재생 중이 아닐 때만 편집 모드에 따라 canvas 표시/숨김 처리
  if (useFabricEditing && fabricReady) {
    // Fabric.js 편집 활성화 시 PixiJS 캔버스 숨김
    pixiCanvas.style.opacity = '0'
    pixiCanvas.style.pointerEvents = 'none'
    pixiCanvas.style.zIndex = '1'
  } else {
    // PixiJS 편집 모드: editMode가 'none'이 아니어도 보임 (편집 중에도 보여야 함)
    pixiCanvas.style.opacity = '1'
    pixiCanvas.style.pointerEvents = 'auto'
    pixiCanvas.style.zIndex = '10'
  }
}, [useFabricEditing, fabricReady, pixiReady, isPlaying, isPreviewingTransition, editMode])
```

**효과**:
- 재생 중에는 `useFabricEditing`, `fabricReady`, `editMode` 등이 변경되어도 canvas visibility가 변경되지 않습니다.
- 재생 중 canvas 깜빡임이 방지됩니다.

### 2. 추가 개선 사항 (선택적)

재생 중 씬 전환 시 깜빡임을 더 줄이려면:

1. **전환 효과 적용 전에 새 씬 미리 표시**:
   - `updateCurrentScene`에서 전환 효과를 적용하기 전에 새 씬을 미리 표시 (alpha를 0으로 시작)
   - 전환 효과가 시작되면 alpha를 1로 증가

2. **이전 씬을 즉시 숨기지 않기**:
   - 전환 효과가 완료될 때까지 이전 씬을 유지
   - 전환 효과가 완료된 후에 이전 씬을 숨김

## 테스트 방법

1. 재생 버튼 클릭
2. 재생 중에 다른 UI 요소와 상호작용 (편집 모드 변경 등)
3. 재생 중 씬 전환 시 canvas가 깜빡이지 않는지 확인
4. 재생 중 일시정지 후 재개 시에도 문제가 없는지 확인

## 관련 파일

- `app/video/create/step4/page.tsx:2562-2584` - Canvas visibility 제어
- `hooks/video/useSceneManager.ts:171-212` - 씬 전환 로직
- `hooks/video/useVideoPlayback.ts:480-497` - 재생 중 씬 전환

