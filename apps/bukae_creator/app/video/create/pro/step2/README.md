# Pro Step2 저장 정책

이 폴더의 상태 변경은 `useVideoCreateStore`를 통해 저장되며, 실제 persist는 `store/useVideoCreateStore.ts`에서 수행됩니다.

## 사용처

- `page.tsx`
  - 씬 편집 결과를 `setScenes`로 store에 반영
- `edit/page.tsx`
  - 가이드/영상 선택 구간 변경을 `setScenes`로 store에 반영

## 왜 필요한가

- Step2 ↔ Step3 이동 시 입력값 유지
- 새로고침 후 작업 복원

## 주의

- 이 폴더는 localStorage를 직접 다루지 않습니다.
- 저장/초기화 정책 변경은 반드시 `useVideoCreateStore`와 `draft-storage.ts`를 함께 검토하세요.
