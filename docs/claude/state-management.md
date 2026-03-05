# 상태 관리 (Zustand)

> 기준일: 2026-03-05

---

## 퍼시스트 스토어 (localStorage)

| 스토어 | localStorage 키 | 비고 |
|--------|----------------|------|
| `useVideoCreateStore` | `bookae-video-create-storage` | `File` 객체·`step1SearchCache` 제외(`partialize`). `autoSaveEnabled === false`면 쓰기 차단 |
| `useUserStore` | `bookae-user-storage` | `onRehydrateStorage`에서 토큰 재검증. 토큰 없으면 `useVideoCreateStore` + `currentVideoJobId` 초기화 |
| `useThemeStore` | `bookae-theme` | light/dark 설정만 |

---

## 드래프트 라이프사이클

```
clearVideoCreateDraft()
  ├── useVideoCreateStore.reset()
  ├── persist.clearStorage()          ← localStorage 항목 삭제
  └── removes currentVideoJobId
```

호출 시점:
- 새 영상 제작 시작
- Step4 완료
- 로그아웃

---

## useVideoCreateStore 필드 추가 시 체크리스트

1. **직렬화 가능 여부** — `File`, `Blob`, `HTMLElement` 등은 직렬화 불가
2. **세션 간 유지 필요 여부** — 필요 없으면 `partialize`에서 제외
3. `reset()` 초기값 포함 여부 확인

---

## 비퍼시스트 스토어

| 스토어 | 용도 |
|--------|------|
| `useAppStore` | 전역 앱 상태 (로딩, 모달 등) |
| `useSceneStructureStore` | 씬 구조 (순서, 선택 상태) |

---

## API 서버 상태

서버 데이터는 **TanStack React Query 5**로 관리. Zustand와 혼용하지 않는다.

- API 클라이언트: `lib/api/client.ts` (`ApiError`, 401 자동 토큰 갱신)
- 서버사이드 Supabase: `lib/api/supabase-server.ts`
