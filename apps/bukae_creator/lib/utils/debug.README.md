# 디버그 유틸 요약

`lib/utils/debug.ts`는 기존 호출부 호환을 유지하기 위한 래퍼입니다.

## 현재 동작

- `debug.debug`, `debug.info`, `time`, `timeEnd`, `group`, `groupEnd`, `table`:
  - **no-op** (출력하지 않음)
- `debug.warn`, `debug.error`:
  - 콘솔에 출력

## 설정

- `debug:tags`, `debug:level` 같은 `localStorage` 기반 설정은 더 이상 사용하지 않습니다.
- 런타임 메서드(`enableTags`, `enableAllTags`, `setMinLevel`)는 메모리 내에서만 적용됩니다.

## 사용 예시

```typescript
import { createDebugger } from '@/lib/utils/debug'

const sceneDebug = createDebugger('scene')

sceneDebug.warn('fallback image 사용', { sceneId: 3 })
sceneDebug.error('렌더 실패', error)
```
