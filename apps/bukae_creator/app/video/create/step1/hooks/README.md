# Step1 Hooks 디렉토리

## 목적

이 디렉토리는 **step1 페이지에만 특화된 통합/컨테이너 훅**을 포함합니다.

## 포함 기준

다음 조건을 모두 만족하는 훅은 이 디렉토리에 위치해야 합니다:

1. ✅ **페이지 특화**: step1 페이지에서만 사용되는 로직
2. ✅ **통합/조합**: 전역 훅들(`hooks/video/`)을 조합하여 step1에 특화된 로직 제공
3. ✅ **UI 상태 관리**: step1 페이지의 UI 상태를 관리
4. ✅ **이벤트 핸들러 통합**: step1 페이지의 이벤트 핸들러를 통합

## 포함 대상

### 통합 컨테이너 훅
- `useStep1Container.ts` - step1 페이지의 모든 비즈니스 로직을 통합하는 컨테이너 훅
  - step1 페이지의 상태 관리
  - step1 페이지의 이벤트 핸들러 통합
  - 상품 검색, 플랫폼 선택, Extension Storage 이미지 크롤링 등

## 제외 대상

다음과 같은 훅은 이 디렉토리에 포함하지 **않습니다**:

- ❌ 여러 페이지에서 재사용 가능한 순수 비즈니스 로직
- ❌ 다른 페이지에서도 사용될 수 있는 로직
- ❌ 특정 페이지 UI에 의존하지 않는 순수 로직

## 폴더 구조 예시

```
app/video/create/step1/hooks/
├── README.md                    # 이 파일
└── useStep1Container.ts         # step1 전용 통합 컨테이너 훅
```

## 사용 예시

### 올바른 사용
```typescript
// ✅ step1 페이지에서 사용
// app/video/create/step1/page.tsx
import { useStep1Container } from './hooks/useStep1Container'

export default function Step1Page() {
  const container = useStep1Container()
  // ...
}
```

### 잘못된 사용
```typescript
// ❌ 전역 훅을 여기에 두면 안 됨
// 대신 hooks/video/에 위치해야 함
```

## useStep1Container의 역할

`useStep1Container`는 step1 페이지의 모든 비즈니스 로직을 통합하는 컨테이너 훅입니다.

### 주요 책임
1. **상태 통합**: step1 페이지에 필요한 모든 상태를 통합 관리
2. **이벤트 핸들러 통합**: step1 페이지의 이벤트 핸들러를 통합 제공
3. **Props 제공**: step1 페이지 컴포넌트에 필요한 모든 props 제공

## 새 훅 추가 시 체크리스트

새로운 훅을 이 디렉토리에 추가하기 전에 다음을 확인하세요:

- [ ] step1 페이지에서만 사용되는가?
- [ ] step1 페이지의 UI 상태를 관리하는가?
- [ ] 다른 페이지에서도 사용될 수 있는 순수 로직이 아닌가?

모든 항목이 체크되면 이 디렉토리에 추가하세요.

---

## 캐시/저장 정책

### 사용처

- `useStep1Container.ts`
  - `step1SearchCache`를 통해 검색어/검색결과/페이지네이션 상태를 저장
  - 저장 위치는 `useVideoCreateStore` 상태이며, `persist` 대상에서는 제외됨

### 왜 필요한가

- 같은 제작 프로세스 안에서 Step1로 되돌아올 때 검색 맥락 유지
- Step1 반복 탐색 시 API 재호출/재입력 부담 감소

### 초기화 규칙

- 플랫폼이 실제로 변경되면 검색 캐시 초기화(`resetSearchData` + `clearStep1SearchCache`)
- 드래프트 전체 초기화(`clearVideoCreateDraft`) 시 함께 제거
- 새 세션/새 작업에서는 복원되지 않음(`persist partialize`에서 제외)
