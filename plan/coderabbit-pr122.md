# CodeRabbit PR #122 이슈 정리

> PR: [analyze] api 작업 (ai분석)  
> 리뷰어: coderabbitai[bot] — CHANGES_REQUESTED

---

## 🔴 Critical (즉시 수정)

### 1. Tailwind arbitrary 값 내부 공백 → 스타일 미적용
`VideoStructurePrimitives.tsx` 38행, 57행

```diff
- min-w-[clamp(120px, 8.33vw, 150px)]   ← 공백 때문에 클래스 3개로 쪼개짐
+ min-w-[clamp(120px,8.33vw,150px)]

- w-[clamp(5rem, 18vw, 10rem)]
+ w-[clamp(5rem,18vw,10rem)]
```

---

## 🟠 Major — 보안/기능 이슈 (머지 전 수정 필요)

### 2. accessToken을 localStorage에 저장 + 로그아웃 불완전
`store/useAuthStore.ts:17-28`
- `persist` 기본값이 localStorage → XSS 탈취 위험
- `clearToken()`이 메모리만 초기화, localStorage 항목 잔존
- **⏸ 보류** — 현재는 localStorage 유지. 추후 보안 강화 시 재검토

### 3. accessToken이 URL query string에 노출
`app/oauth/callback/page.tsx:15`
- 브라우저 히스토리/서버 로그 유출 위험
- **백엔드 협의 필요** — OAuth 콜백 방식(fragment, code exchange 등) 변경은 백엔드가 지원해야 함

### 4. fetchCurrentUser 실패 시 인증 상태 불일치
`app/oauth/callback/page.tsx:21-26`
- 토큰은 저장됐는데 user는 null인 상태 발생 가능
- **프론트 단독 수정 가능**: 실패 시 `clearToken()` 호출 후 `/login`으로 이동

### 5. createProject + submitBenchmark 비원자적 → 중복 프로젝트
`app/_hooks/useUrlInput.ts:22-35`
- submitBenchmark 실패 후 재시도하면 프로젝트가 계속 생성됨
- **백엔드 협의 필요** — 단일 엔드포인트 또는 idempotency key 지원이 백엔드에 있어야 함

---

## 🟠 Major — 아키텍처 위반 (머지 전 수정 필요)

### 6. Service 함수가 DTO를 그대로 반환 (Domain Model 미변환)
`lib/services/benchmarkAnalysis.ts:59-77`, `lib/services/projects.ts:3-8`
- 가이드라인: Service = HTTP 호출 → Zod 검증 → mapper → Domain Model 반환
- **조치**: `getBenchmarkAnalysis`, `createProject`, `submitBenchmark` 에서 mapper 호출 후 Domain Model 반환
- ⚠️ **배포 파괴 위험**: `getBenchmarkAnalysis`를 Domain Model 반환으로 바꾸면 `useAnalysisPolling`이 읽는 `data.submissionStatus`, `data.failure`, `data.normalized_analysis_tabs` 필드가 사라져 폴링 전체가 동작 불가 → 분석 화면 무한 로딩.  
  폴링 훅 구조를 함께 변경하지 않으면 절대 건드리지 말 것.

### 7. DTO 스키마가 snake_case 아닌 camelCase 사용
`lib/types/api/project.ts:3-48`, `lib/types/api/auth.ts:3-9`
- CodeRabbit은 API가 snake_case를 응답한다고 가정했으나, 현재 URL 제출 흐름이 정상 동작 중인 것은 실제 API가 camelCase(`projectId`, `submissionStatus` 등)를 내려주고 있다는 의미일 가능성이 높음
- **조치 전 필수 확인**: Network 탭에서 `/projects` POST 응답 필드명이 snake_case인지 camelCase인지 확인
- ⚠️ **배포 파괴 위험**: API가 실제로 camelCase를 응답하는데 DTO를 snake_case로 바꾸면 Zod parse 실패 → URL 제출 불가 → 분석 시작 안 됨

### 8. CurrentUser 스키마 snake_case 불일치 + 엔드포인트 하드코딩
`lib/services/auth.ts:18-37`
- `profileImageUrl` → `profile_image_url` 로 수정 필요
- `/api/v1/users/me` 하드코딩 → `endpoints.ts`로 이동

---

## 🟠 Major — 버그/품질

### 9. AuthGuard hydrated 플래그가 Zustand persist 완료를 보장하지 않음
`components/layout/AuthGuard.tsx:10-23`
- `useEffect`의 setHydrated는 클라이언트 마운트 시점, persist rehydration 완료 시점과 다름
- 유효한 토큰이 있어도 초기값 null로 읽혀 `/login` 리다이렉트 될 수 있음
- **조치**: `useAuthStore.persist.hasHydrated()` + `onFinishHydration` 사용

### 10. HookMetrics 아이콘 컨테이너 < 아이콘 크기
`HookMetrics.tsx:13-15`
- 컨테이너 max 20px, 아이콘 32px → 아이콘 잘림
- **조치**: 컨테이너를 32px 이상으로 키우거나 아이콘 크기를 같이 줄임

### 11. `bg-black/0.3` 잘못된 Tailwind 문법
`components/loading/AnalysisLoadingOverlay.tsx:15`
```diff
- bg-black/0.3
+ bg-black/30   (또는 bg-black/[0.3])
```

### 12. useHeaderProfile에서 user를 getState()로 읽어 stale 값
`features/auth/hooks/state/useHeaderProfile.ts:16`
```diff
- const { accessToken, user, clearToken } = useAuthStore.getState()
+ const user = useAuthStore((s) => s.user)
+ const { accessToken, clearToken } = useAuthStore.getState()
```

### 13. HookCoreCard 필드가 필수인데 mapper는 optional로 처리
`lib/types/api/benchmarkAnalysis.ts:38-57`
- `pacing`, `hookRange`, `openingType`, `emotionTrigger`, `coreCard`, `evidence`, `coreAnalysis`를 `.optional()`로 변경
- 현재 필수로 되어 있어 부분 응답 오면 Zod 검증 실패

### 14. useVideoAnalysisViewModel에 useMemo 누락
`features/videoAnalysis/hooks/viewmodel/useVideoAnalysisViewModel.ts:97-103`
- 매 렌더마다 새 객체 생성 → 하위 memo/useEffect 불필요한 재실행
- **조치**: `useMemo(() => ({ thumbnail, hook, structure }), [domain])` 으로 감싸기

### 15. apiClient 헤더 병합 버그
`lib/services/apiClient.ts:9-15`
- `Headers` 인스턴스를 object spread로 병합하면 빈 객체가 됨
- Content-Type 항상 강제 → FormData 사용 시 boundary 깨짐
- **조치**: `new Headers(options.headers)` 사용

### 16. logout API 실패 무시
`lib/services/auth.ts:5-10`
```diff
- await fetch(...)
+ const res = await fetch(...)
+ if (!res.ok) throw new Error('로그아웃 실패')
```

### 17. Header 드롭다운 hover 전용 → 키보드/터치 접근 불가
`components/layout/Header.tsx:14-38`
- **조치**: trigger를 `<button>`으로 변경, `group-focus-within` 추가 또는 Radix DropdownMenu 사용

---

## 🟡 Minor — 타이포그래피/글래스 토큰 위반 (스타일 정리)

다수 파일에서 `style={{ fontSize: 'clamp(...)' }}`, `leading-[1.4]`, `tracking-[-0.04em]`, `font-medium/semibold`, `backdrop-blur-[2px]` 직접 지정 → globals.css 프리셋으로 교체 필요

| 파일 | 위반 내용 |
|------|-----------|
| `HookOptionalFields.tsx:12-31` | fontSize 인라인, backdrop-blur 직접 지정 |
| `PageTitle.tsx:10` | fontSize 인라인 |
| `AnalysisInsightPanel.tsx:11` | fontSize 인라인 + font-medium/tracking |
| `DirectorComment.tsx:11-22` | fontSize 인라인 + font-16-md 충돌 |
| `AnalysisPrimitives.tsx:28-29` | fontSize 인라인 + font-medium/tracking |
| `TrendContextSection.tsx:18-36` | fontSize 인라인 + font-medium/semibold/tracking |
| `VideoTargetCard.tsx:10-22` | fontSize 인라인 + 패딩 clamp + font-16-rg 충돌 |
| `VideoStructurePrimitives.tsx:28-90` | 다수 fontSize 인라인 + backdrop-blur-[2px] |

교체 방향: 
- `font-medium tracking-[-0.04em] style={{fontSize:'clamp(14px,0.9vw,16px)'}}` → `font-16-md` 또는 `font-14-md`
- `backdrop-blur-[2px]` → `backdrop-glass-soft`
- `backdrop-blur-[2.667px]` → `backdrop-glass-soft`

---

## 완료된 작업

- [x] #1 Tailwind 공백 버그 (`VideoStructurePrimitives.tsx`)
- [x] #4 fetchCurrentUser 실패 시 clearToken + /login 리다이렉트 (`oauth/callback/page.tsx`)
- [x] #8 `/users/me` 엔드포인트 상수화 (`endpoints.ts`, `auth.ts`)
- [x] #9 AuthGuard persist rehydration 완료 시점 보장 (`AuthGuard.tsx`)
- [x] #10 HookMetrics 아이콘 컨테이너 크기 수정 (`HookMetrics.tsx`)
- [x] #11 `bg-black/0.3` → `bg-black/30` (`AnalysisLoadingOverlay.tsx`)
- [x] #12 useHeaderProfile `user` selector 구독 (`useHeaderProfile.ts`)
- [x] #13 HookCoreCard 필드 `.optional()` 처리 (`benchmarkAnalysis.ts`)
- [x] #14 `useVideoAnalysisViewModel` useMemo 적용
- [x] #15 apiClient 헤더 병합 `new Headers()` 방식으로 수정
- [x] #16 logout API 실패 throw 추가 (`auth.ts`)
- [x] #17 Header 드롭다운 `<button>` + `group-focus-within` 적용
- [x] 타이포그래피 전체 — font preset 교체, backdrop-blur → backdrop-glass-soft/strong

## 보류 / 미완료

- ⏸ #2 accessToken localStorage — 의도적 유지
- ⏳ #3 accessToken URL 노출 — 백엔드 협의 필요
- ⏳ #5 createProject 중복 — 백엔드 협의 필요
- ⏳ #6 Service → Domain Model 반환 — 폴링 구조 전체 리팩터 필요, 별도 작업
- ⏳ #7 DTO snake_case — 실제 API 응답 형식 확인 후 결정
