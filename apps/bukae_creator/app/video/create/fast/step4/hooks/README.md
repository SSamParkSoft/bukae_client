# Step4 Hooks 디렉토리

## 목적

이 디렉토리는 **step4 페이지에만 특화된 통합/컨테이너 훅**을 포함합니다.

## 포함 기준

다음 조건을 모두 만족하는 훅은 이 디렉토리에 위치해야 합니다:

1. ✅ **페이지 특화**: step4 페이지에서만 사용되는 로직
2. ✅ **통합/조합**: 전역 훅들(`hooks/video/`)을 조합하여 step4에 특화된 로직 제공
3. ✅ **UI 상태 관리**: step4 페이지의 UI 상태를 관리
4. ✅ **이벤트 핸들러 통합**: step4 페이지의 이벤트 핸들러를 통합

## 포함 대상

### 통합 컨테이너 훅
- `useStep4Container.ts` - step4 페이지의 모든 비즈니스 로직을 통합하는 컨테이너 훅
  - step4 페이지의 상태 관리
  - step4 페이지의 이벤트 핸들러 통합
  - 영상 렌더링 진행 상황 모니터링, HTTP 폴링, AI 제목/설명/해시태그 생성 등

## 제외 대상

다음과 같은 훅은 이 디렉토리에 포함하지 **않습니다**:

- ❌ 여러 페이지에서 재사용 가능한 순수 비즈니스 로직
- ❌ 다른 페이지에서도 사용될 수 있는 로직
- ❌ 특정 페이지 UI에 의존하지 않는 순수 로직

## 폴더 구조 예시

```
app/video/create/step4/hooks/
├── README.md                    # 이 파일
└── useStep4Container.ts         # step4 전용 통합 컨테이너 훅
```

## 사용 예시

### 올바른 사용
```typescript
// ✅ step4 페이지에서 사용
// app/video/create/step4/page.tsx
import { useStep4Container } from './hooks/useStep4Container'

export default function Step4Page() {
  const container = useStep4Container()
  // ...
}
```

### 잘못된 사용
```typescript
// ❌ 전역 훅을 여기에 두면 안 됨
// 대신 hooks/video/에 위치해야 함
```

## useStep4Container의 역할

`useStep4Container`는 step4 페이지의 모든 비즈니스 로직을 통합하는 컨테이너 훅입니다.

### 주요 책임
1. **상태 통합**: step4 페이지에 필요한 모든 상태를 통합 관리
2. **이벤트 핸들러 통합**: step4 페이지의 이벤트 핸들러를 통합 제공
3. **Props 제공**: step4 페이지 컴포넌트에 필요한 모든 props 제공

## 새 훅 추가 시 체크리스트

새로운 훅을 이 디렉토리에 추가하기 전에 다음을 확인하세요:

- [ ] step4 페이지에서만 사용되는가?
- [ ] step4 페이지의 UI 상태를 관리하는가?
- [ ] 다른 페이지에서도 사용될 수 있는 순수 로직이 아닌가?

모든 항목이 체크되면 이 디렉토리에 추가하세요.

---

## 캐시/로컬스토리지 정책

### 사용처

- `useStep4Container.ts`
  - 키: `currentVideoJobId`
  - 목적: 렌더링 중 페이지 이탈/새로고침 후 Step4 재진입 시 진행 중 job 복원

### 왜 필요한가

- 장시간 렌더링 작업의 추적 연속성 확보
- 사용자가 다시 들어와도 상태 확인 가능

### 초기화 규칙

- 완료 처리(`handleComplete`)에서 `currentVideoJobId` 제거
- 드래프트 삭제(`clearVideoCreateDraft`)에서도 제거
- `bookae-video-create-storage`가 없는 고아 jobId는 `hasVideoCreateDraft()`에서 자동 정리
