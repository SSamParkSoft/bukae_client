# 디버깅 유틸리티 사용 가이드

이 문서는 `lib/utils/debug.ts`에서 제공하는 디버깅 유틸리티 함수의 사용 방법을 설명합니다.

## 기본 사용법

### 방법 1: 직접 사용

```typescript
import { debug } from '@/lib/utils/debug'

debug.debug('씬 표시 시작', { index: 5 }, { tag: 'scene-renderer' })
debug.warn('캐시 없음', { sceneIndex: 2 }, { tag: 'playSceneLogic' })
debug.error('에러 발생', error, { tag: 'api' })
```

### 방법 2: 태그별 디버거 생성 (권장)

```typescript
import { createDebugger } from '@/lib/utils/debug'

const sceneDebug = createDebugger('scene-renderer')
sceneDebug.debug('씬 표시 시작', { index: 5 })
sceneDebug.warn('스프라이트 없음', { index: 3 })
```

## 주요 기능

### 로그 레벨

- **debug**: 개발 환경에서만 출력되는 상세한 디버그 정보
- **info**: 일반적인 정보성 로그
- **warn**: 경고 메시지
- **error**: 에러 메시지

```typescript
const debugger = createDebugger('my-module')

debugger.debug('디버그 메시지', { data: 'value' })
debugger.info('정보 메시지', { data: 'value' })
debugger.warn('경고 메시지', { data: 'value' })
debugger.error('에러 메시지', error)
```

### 성능 측정

```typescript
const perfDebug = createDebugger('performance')

perfDebug.time('렌더링')
// ... 렌더링 코드 ...
perfDebug.timeEnd('렌더링')
```

### 그룹화된 로그

```typescript
const sceneDebug = createDebugger('scene-renderer')

sceneDebug.group('씬 로드', true) // collapsed 옵션
sceneDebug.debug('텍스처 로드', { url: 'image.png' })
sceneDebug.debug('스프라이트 생성', { width: 1920, height: 1080 })
sceneDebug.groupEnd()
```

### 조건부 로깅

```typescript
debug.debug('복잡한 계산 결과', result, {
  tag: 'calculation',
  condition: result.length > 100, // 조건이 true일 때만 출력
})
```

### 테이블 형태 출력

```typescript
const debugger = createDebugger('data')

debugger.table([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
])
```

## 브라우저에서 디버깅 제어

개발 중 브라우저 콘솔에서 다음 명령어로 디버깅을 제어할 수 있습니다:

### 특정 태그만 활성화

```javascript
localStorage.setItem('debug:tags', 'scene-renderer,playback-controls')
```

### 로그 레벨 설정

```javascript
// warn 이상만 출력
localStorage.setItem('debug:level', 'warn')
```

### 모든 태그 활성화

```javascript
localStorage.removeItem('debug:tags')
```

### 레벨 초기화

```javascript
localStorage.removeItem('debug:level')
```

## 마이그레이션 가이드

### 기존 console.log 패턴

```typescript
console.log(`[scene-renderer] 씬 표시 시작 | index: ${index}`)
console.warn(`[scene-renderer] appRef 또는 containerRef가 없습니다. | index: ${index}`)
```

### 변경 후

```typescript
import { createDebugger } from '@/lib/utils/debug'

const sceneDebug = createDebugger('scene-renderer')

sceneDebug.debug('씬 표시 시작', { index })
sceneDebug.warn('appRef 또는 containerRef가 없습니다', { index })
```

### 에러 로깅

```typescript
// 기존
console.error(`[useTtsPreview] 씬 미리보기 실패 | sceneIndex: ${sceneIndex}`, error)

// 변경 후
const ttsPreviewDebug = createDebugger('useTtsPreview')
ttsPreviewDebug.error('씬 미리보기 실패', error, { sceneIndex })
```

## 주요 특징

1. **환경별 로깅**: 개발 환경에서만 출력 가능 (devOnly 옵션)
2. **태그 필터링**: localStorage로 특정 태그만 활성화
3. **로그 레벨**: debug/info/warn/error 레벨 지원
4. **성능 측정**: time/timeEnd로 성능 측정
5. **그룹화**: group/groupEnd로 로그 그룹화
6. **안전한 직렬화**: 순환 참조 방지, Map/Set 지원
7. **조건부 로깅**: 특정 조건에서만 출력

## 주의사항

- `debug` 레벨은 기본적으로 개발 환경에서만 출력됩니다
- `info`, `warn`, `error` 레벨은 프로덕션에서도 출력됩니다 (devOnly: false)
- 프로덕션 빌드에서는 webpack 설정에 의해 console이 제거될 수 있습니다

