# 전환 효과가 나타나지 않는 가능한 원인 리스트

## 1. 조건 체크 실패로 인한 문제

### 1.1 `updateCurrentScene` 호출 전 조건 체크 실패
- **위치**: `useSceneManager.ts` line 69-71
- **조건**: `!containerRef.current || !timeline || !appRef.current`
- **문제**: 이 중 하나라도 false면 함수가 조기 종료되어 전환 효과가 적용되지 않음

### 1.2 `currentSprite`가 없는 경우
- **위치**: `useSceneManager.ts` line 126
- **문제**: `currentSprite`가 없으면 전환 효과 로직 자체가 실행되지 않음
- **원인**: 스프라이트가 아직 로드되지 않았거나 `spritesRef`에 없음

### 1.3 재생 중 씬 전환 useEffect 조건 체크
- **위치**: `step4/page.tsx` line 825-826
- **조건**: `!timeline || timeline.scenes.length === 0 || isManualSceneSelectRef.current`
- **문제**: `isManualSceneSelectRef.current`가 true면 useEffect가 실행되지 않음

### 1.4 씬 변경 감지 실패
- **위치**: `step4/page.tsx` line 834
- **조건**: `lastRenderedIndex !== currentSceneIndex`
- **문제**: `lastRenderedSceneIndexRef.current`가 이미 `currentSceneIndex`와 같으면 전환 효과가 적용되지 않음

## 2. `skipAnimation` 파라미터 문제

### 2.1 `updateCurrentScene(true)` 호출
- **위치**: 여러 곳에서 호출
  - `step4/page.tsx` line 863: 재생 중이 아닐 때
  - `step4/page.tsx` line 1270: 고급 효과 변경 시
  - `step4/page.tsx` line 1313: 타임라인 클릭 시
  - `step4/page.tsx` line 1345: 타임라인 드래그 시
- **문제**: `skipAnimation: true`로 전달되면 전환 효과 없이 즉시 표시됨

## 3. Timeline 생성 및 시작 문제

### 3.1 Timeline에 애니메이션이 추가되지 않음
- **위치**: `usePixiEffects.ts` line 786-787
- **조건**: `childrenCount === 0 || timelineDuration === 0`
- **문제**: Timeline에 애니메이션이 없으면 즉시 표시되고 전환 효과가 실행되지 않음

### 3.2 Timeline이 시작되지 않음
- **위치**: `usePixiEffects.ts` line 798-799
- **문제**: `tl.restart()`가 호출되지 않거나, 호출되기 전에 다른 로직이 실행됨
- **원인**: `requestAnimationFrame` 내에서 호출되므로 타이밍 이슈 가능

### 3.3 Timeline이 paused 상태로 남아있음
- **위치**: `usePixiEffects.ts` line 118
- **초기 상태**: `paused: true`
- **문제**: `tl.restart()`가 호출되지 않으면 Timeline이 시작되지 않음

## 4. 렌더링 문제

### 4.1 PixiJS 캔버스가 숨겨져 있음
- **위치**: `step4/page.tsx` line 959-973
- **조건**: `isPlaying || isPreviewingTransition`이 false이고 `useFabricEditing && fabricReady`가 true면 숨김
- **문제**: 캔버스가 숨겨지면 전환 효과가 보이지 않음

### 4.2 GSAP ticker가 렌더링하지 않음
- **위치**: `usePixiEffects.ts` line 771-775
- **조건**: `tl.isActive() && !tl.paused()`
- **문제**: Timeline이 활성화되지 않았거나 paused 상태면 렌더링되지 않음

### 4.3 PixiJS ticker가 렌더링을 건너뜀
- **위치**: `usePixiFabric.ts` line 172-180
- **조건**: `activeAnimationsRef.current.size > 0`이고 Timeline이 활성화되어 있으면 건너뜀
- **문제**: Timeline이 아직 시작되지 않았는데 PixiJS ticker가 건너뛰면 아무것도 렌더링되지 않음

### 4.4 `app.render()`가 호출되지 않음
- **위치**: 여러 곳
- **문제**: 렌더링이 호출되지 않으면 화면에 반영되지 않음

## 5. 스프라이트/텍스트 상태 문제

### 5.1 스프라이트가 컨테이너에 없음
- **위치**: `useSceneManager.ts` line 165-170
- **문제**: 스프라이트가 컨테이너에 추가되지 않으면 화면에 표시되지 않음

### 5.2 스프라이트의 `visible` 또는 `alpha` 설정 문제
- **위치**: `useSceneManager.ts` line 172-177
- **초기 상태**: `visible: true, alpha: 0`
- **문제**: 초기 상태가 잘못 설정되면 전환 효과가 보이지 않음

### 5.3 이전 애니메이션이 kill되지 않음
- **위치**: `useSceneManager.ts` line 132-138
- **문제**: 이전 애니메이션이 남아있으면 새로운 전환 효과와 충돌할 수 있음

## 6. 타이밍 문제

### 6.1 `requestAnimationFrame` 중첩
- **위치**: 여러 곳에서 `requestAnimationFrame` 내부에 또 다른 `requestAnimationFrame` 호출
- **문제**: 타이밍이 맞지 않아 전환 효과가 지연되거나 실행되지 않을 수 있음

### 6.2 `setTimeout` 타이밍 문제
- **위치**: `step4/page.tsx` line 853-857
- **문제**: `transitionDuration * 1000 + 100` 후에 `lastRenderedSceneIndexRef`를 업데이트하는데, 이 시간이 정확하지 않으면 다음 씬 전환이 감지되지 않을 수 있음

### 6.3 `lastRenderedSceneIndexRef` 업데이트 타이밍
- **위치**: `step4/page.tsx` line 855
- **문제**: 전환 효과가 완료되기 전에 업데이트되면 다음 씬 전환이 감지되지 않을 수 있음

## 7. 상태 동기화 문제

### 7.1 `currentSceneIndexRef`와 `currentSceneIndex` 불일치
- **위치**: `step4/page.tsx` line 819-820
- **문제**: ref와 state가 동기화되지 않으면 잘못된 씬 인덱스로 전환 효과가 적용될 수 있음

### 7.2 `previousSceneIndexRef` 잘못된 값
- **위치**: 여러 곳
- **문제**: 이전 씬 인덱스가 잘못 설정되면 전환 효과가 제대로 작동하지 않을 수 있음

## 8. 전환 효과 설정 문제

### 8.1 `transition` 값이 없거나 잘못됨
- **위치**: `useSceneManager.ts` line 127
- **기본값**: `'fade'`
- **문제**: 전환 효과 값이 잘못되면 switch 문에서 default로 처리되어 예상과 다르게 동작할 수 있음

### 8.2 `transitionDuration`이 0
- **위치**: `useSceneManager.ts` line 128
- **기본값**: `1.0`
- **문제**: duration이 0이면 전환 효과가 즉시 완료되어 보이지 않을 수 있음

## 9. GSAP 관련 문제

### 9.1 GSAP ticker가 등록되지 않음
- **위치**: `usePixiEffects.ts` line 771
- **문제**: `gsap.ticker.add()`가 호출되지 않으면 렌더링이 되지 않음

### 9.2 GSAP ticker가 제거됨
- **위치**: `usePixiEffects.ts` line 781
- **문제**: `onComplete`에서 ticker가 제거되기 전에 다른 로직이 실행되면 문제가 될 수 있음

### 9.3 `gsap.ticker.wake()`가 호출되지 않음
- **위치**: `usePixiEffects.ts` line 795, 803
- **문제**: ticker가 sleep 상태면 애니메이션이 실행되지 않을 수 있음

## 10. 디버깅 체크리스트

### 확인해야 할 사항:
1. ✅ `updateCurrentScene(false, prevIndex)`가 호출되는가?
2. ✅ `currentSprite`가 존재하는가?
3. ✅ `containerRef.current`, `timeline`, `appRef.current`가 모두 존재하는가?
4. ✅ `isPreviewingTransition`이 true로 설정되는가?
5. ✅ PixiJS 캔버스가 보이는가? (`opacity: 1`)
6. ✅ Timeline에 애니메이션이 추가되는가? (`childrenCount > 0`)
7. ✅ `tl.restart()`가 호출되는가?
8. ✅ Timeline이 활성화되는가? (`isActive() && !paused()`)
9. ✅ GSAP ticker가 렌더링하는가?
10. ✅ `lastRenderedSceneIndexRef.current !== currentSceneIndex`가 true인가?
11. ✅ `isManualSceneSelectRef.current`가 false인가?
12. ✅ `skipAnimation`이 false인가?

