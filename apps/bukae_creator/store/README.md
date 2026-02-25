# Store 캐시/LocalStorage 가이드

이 디렉토리의 상태 저장 정책은 `zustand persist`를 기준으로 관리합니다.

## 사용처

### `useVideoCreateStore.ts`
- 저장 키: `bookae-video-create-storage`
- 저장 이유:
  - 영상 제작 중 새로고침/페이지 이동 후에도 드래프트 복원
  - Step1~Step4 입력값 유지
- 주요 정책:
  - `partialize`로 직렬화 불가능 데이터(`File`) 제외
  - `step1SearchCache`는 **persist 제외** (같은 세션 내 메모리 캐시만 유지)
  - `autoSaveEnabled === false`면 `setItem` 차단

### `useUserStore.ts`
- 저장 키: `bookae-user-storage`
- 저장 이유:
  - 사용자 기본 정보/설정 복원
  - 로그인 직후 UI 상태 빠른 복원
- 주요 정책:
  - `onRehydrateStorage`에서 토큰 유효성 재검증
  - 토큰이 없으면 `useVideoCreateStore`와 `currentVideoJobId`까지 정리

### `useThemeStore.ts`
- 저장 키: `bookae-theme`
- 저장 이유:
  - 테마(light/dark) 선호도 유지

## 초기화 포인트

- `clearVideoCreateDraft()`
  - `useVideoCreateStore.reset()`
  - `useVideoCreateStore.persist.clearStorage()`
  - `currentVideoJobId` 제거
- Step4 완료(`useStep4Container.handleComplete`) 시 위와 동일한 정리 수행
- 인증 해제(`authStorage.clearTokens`, `useUserStore` rehydrate) 시 드래프트/JobId 정리

## 유지보수 규칙

- 새 필드를 `useVideoCreateStore`에 추가할 때:
  - 직렬화 가능한지 먼저 확인
  - persist 필요 여부를 명시
  - 필요 없으면 `partialize`에서 제외
- 작업 간 오염이 생기기 쉬운 값(검색 결과, 임시 UI 상태)은 메모리 캐시로 제한
