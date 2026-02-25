# Video Create 진입 캐시 정책

이 폴더는 드래프트 진입 UX와 이탈 시 정리 정책을 담당합니다.

## 사용처

### `page.tsx`
- 트랙(Fast/Pro) 선택 시 `hasVideoCreateDraft()` 확인
- 드래프트가 있으면 다이얼로그 노출:
  - `새로 시작`: `clearVideoCreateDraft()` 후 Step1 이동
  - `이어서 작업`: 기존 상태 유지

### `layout.tsx`
- "저장 안 함" 선택 시 `clearVideoCreateDraft()` 실행 후 페이지 이동

## 왜 필요한가

- 작업 간 상태 오염(이전 상품/스타일 잔존) 방지
- 사용자가 의도적으로 이어하기를 선택할 때만 복원
