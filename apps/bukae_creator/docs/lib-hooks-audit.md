# lib/hooks/ 감사 및 통합 검토

> 작성일: 2026-04-02
> 결론: lib/hooks/ ↔ hooks/ 통합 불필요. 미사용 파일 3개 삭제 권장.

---

## 결론: 통합하지 않음

두 디렉토리는 기술 스택과 역할이 근본적으로 달라 분리가 올바른 설계.

| | `lib/hooks/` | `hooks/video/` |
|--|--|--|
| 기술 | React Query (`useQuery`/`useMutation`) | `useSyncExternalStore`, `useRef`, 로컬 상태 |
| 역할 | 서버 API 캐싱 레이어 | 비디오 편집 엔진 지원 |
| 소비자 | 페이지/컴포넌트 전반 | 비디오 편집 페이지 한정 |
| 문서 | `lib/hooks/README.md` (캐시 전략) | `hooks/video/README.md` (page-agnostic 원칙) |

두 디렉토리 간 교차 import는 단 1개 (`hooks/useVideoCreateAuth.ts → lib/hooks/useAuth.ts`). 통합 실익 없음.

---

## 할 작업: lib/hooks/ 미사용 파일 삭제

탐색 결과 `lib/hooks/`에 외부 import가 0인 파일 3개 발견.

### 삭제 대상

| 파일 | import 수 | 삭제 이유 |
|------|-----------|-----------|
| `lib/hooks/useMediaAssets.ts` | 0 | 미사용 + `lib/api/client.ts` 우회해 `fetch()` 직접 호출 → 인증 불일치 |
| `lib/hooks/useStudio.ts` | 0 | step4가 직접 api 호출 방식으로 전환하면서 대체됨 |
| `lib/hooks/useYouTubeVideos.ts` | 0 | 미사용 |

### 작업 순서

```bash
# 1. 삭제 전 import 재확인
grep -r "useMediaAssets\|useStudio\|useYouTubeVideos" \
  apps/bukae_creator --include="*.{ts,tsx}" -l

# 2. 삭제
rm apps/bukae_creator/lib/hooks/useMediaAssets.ts \
   apps/bukae_creator/lib/hooks/useStudio.ts \
   apps/bukae_creator/lib/hooks/useYouTubeVideos.ts

# 3. 검증
pnpm typecheck
```

---

## 변경하지 않는 것

- `hooks/useVideoCreateAuth.ts` 위치: 현재 `hooks/` 루트가 적합 (단일 파일을 위한 `auth/` 디렉토리 불필요)
- `lib/hooks/` ↔ `hooks/` 통합: 하지 않음
