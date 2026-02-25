# Draft Storage 유틸 가이드

## 사용처

### `draft-storage.ts`
- `hasVideoCreateDraft()`
  - `bookae-video-create-storage` 내용 검사
  - `currentVideoJobId` 고아 데이터(실제 드래프트 없이 키만 남은 경우) 자동 정리
- `clearVideoCreateDraft()`
  - `useVideoCreateStore.getState().reset()`
  - `useVideoCreateStore.persist.clearStorage()`
  - `localStorage.removeItem('currentVideoJobId')`

## 왜 필요한가

- 드래프트 존재 판단 로직을 단일화
- 페이지/레이아웃/완료 흐름에서 동일한 초기화 동작 보장
- 고아 `jobId`로 인한 잘못된 이어하기 팝업 방지
