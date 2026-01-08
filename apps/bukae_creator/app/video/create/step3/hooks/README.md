# Step3 Hooks 디렉토리

## 목적

이 디렉토리는 **step3 페이지에만 특화된 통합/컨테이너 훅**을 포함합니다.

## 포함 기준

다음 조건을 모두 만족하는 훅은 이 디렉토리에 위치해야 합니다:

1. ✅ **페이지 특화**: step3 페이지에서만 사용되는 로직
2. ✅ **통합/조합**: 전역 훅들(`hooks/video/`)을 조합하여 step3에 특화된 로직 제공
3. ✅ **UI 상태 관리**: step3 페이지의 UI 상태를 관리
4. ✅ **이벤트 핸들러 통합**: step3 페이지의 이벤트 핸들러를 통합

## 포함 대상

### 통합 컨테이너 훅
- `useStep3Container.ts` - step3 페이지의 모든 비즈니스 로직을 통합하는 컨테이너 훅
  - 전역 훅들을 조합하여 step3에 필요한 기능 제공
  - step3 페이지의 상태 관리
  - step3 페이지의 이벤트 핸들러 통합

## 제외 대상

다음과 같은 훅은 이 디렉토리에 포함하지 **않습니다**:

- ❌ 여러 페이지에서 재사용 가능한 순수 비즈니스 로직
  - 예: 씬 관리, 편집, 재생 로직 → `hooks/video/`로 이동
- ❌ 다른 페이지에서도 사용될 수 있는 로직
- ❌ 특정 페이지 UI에 의존하지 않는 순수 로직

## 폴더 구조 예시

```
app/video/create/step3/hooks/
├── README.md                    # 이 파일
└── useStep3Container.ts         # step3 전용 통합 컨테이너 훅
```

## 사용 예시

### 올바른 사용
```typescript
// ✅ step3 페이지에서 사용
// app/video/create/step3/page.tsx
import { useStep3Container } from './hooks/useStep3Container'

export default function Step3Page() {
  const container = useStep3Container()
  // ...
}
```

### 잘못된 사용
```typescript
// ❌ 전역 훅을 여기에 두면 안 됨
// 대신 hooks/video/에 위치해야 함
```

## useStep3Container의 역할

`useStep3Container`는 step3 페이지의 모든 비즈니스 로직을 통합하는 컨테이너 훅입니다.

### 주요 책임
1. **전역 훅 조합**: `hooks/video/`의 여러 훅들을 조합
2. **상태 통합**: step3 페이지에 필요한 모든 상태를 통합 관리
3. **이벤트 핸들러 통합**: step3 페이지의 이벤트 핸들러를 통합 제공
4. **Props 제공**: step3 페이지 컴포넌트에 필요한 모든 props 제공

### 구조 예시
```typescript
export function useStep3Container() {
  // 전역 훅들 사용
  const sceneManager = useSceneManager({...})
  const pixiEditor = usePixiEditor({...})
  const fullPlayback = useFullPlayback({...})
  // ...
  
  // step3에 특화된 로직
  const handlePlayPause = useCallback(() => {
    // step3 특화 로직
  }, [])
  
  // 통합된 반환값
  return {
    // 전역 훅에서 가져온 값들
    ...sceneManager,
    ...pixiEditor,
    // step3 특화 핸들러들
    handlePlayPause,
    // ...
  }
}
```

## 새 훅 추가 시 체크리스트

새로운 훅을 이 디렉토리에 추가하기 전에 다음을 확인하세요:

- [ ] step3 페이지에서만 사용되는가?
- [ ] 전역 훅들을 조합하여 step3에 특화된 로직을 제공하는가?
- [ ] step3 페이지의 UI 상태를 관리하는가?
- [ ] 다른 페이지에서도 사용될 수 있는 순수 로직이 아닌가?

모든 항목이 체크되면 이 디렉토리에 추가하세요.

## 전역 훅과의 관계

이 디렉토리의 훅은 `hooks/video/`의 전역 훅들을 **사용**하지만, 전역 훅은 이 디렉토리의 훅에 **의존하지 않아야** 합니다.

```
┌─────────────────────────┐
│ hooks/video/            │  (전역 훅)
│ - useSceneManager       │
│ - usePixiEditor         │
│ - useFullPlayback       │
└───────────┬─────────────┘
            │ 사용
            ▼
┌─────────────────────────┐
│ app/.../step3/hooks/    │  (페이지 훅)
│ - useStep3Container     │
└─────────────────────────┘
```

## 관련 문서

- 전역 훅: `hooks/video/README.md`
- 전체 리팩토링 계획: `.cursor/plans/video_hooks_리팩토링_및_최적화_*.plan.md`

