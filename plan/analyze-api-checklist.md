# analyze 앱 API 연동 체크리스트

> 각 항목을 완료하면 알려주세요. 모두 체크되면 이 파일을 삭제합니다.

---

## 사전 확인 (코드 작업 전)

- [ ] **백엔드 API base URL 확인** — 개발/스테이징 서버 주소
- [ ] **`normalized_analysis_tabs` JSON 스키마 확인** — 백엔드에서 Swagger 또는 실제 샘플 응답 수령. 현재 UI 탭(thumbnail / hook / structure)과 필드 매핑 가능 여부 검증

---

## 갭 1 — zod 설치

- [x] `pnpm add zod` (bukae_analyze 앱)

---

## 갭 2 — 백엔드 URL 라우팅

- [x] 환경변수 `NEXT_PUBLIC_API_BASE_URL` 추가 (`.env.local`)
- [x] `next.config.ts`에 `rewrites` 추가 또는 fetch base URL 설정

---

## 갭 3 — 인증 플로우

- [x] `store/useAuthStore.ts` 생성 — `accessToken` 저장/갱신/초기화
- [x] `login/page.tsx` Google 버튼에 `onClick` 연결 → `GET /oauth2/authorization/google?redirect_uri=...` 리다이렉트
- [x] OAuth 콜백 처리 — URL query에서 `accessToken` 파싱 후 store 저장, query param 제거
- [x] `lib/services/auth.ts` 생성 — `POST /api/v1/auth/refresh` (토큰 재발급)
- [x] 미인증 시 `/login` 리다이렉트 처리 (미들웨어 또는 layout)

---

## 갭 4 — URL 제출 → API 연동

- [x] `lib/services/apiClient.ts` 생성 — Authorization 헤더 자동 주입, 401 시 refresh → 재시도
- [x] `lib/types/api/project.ts` 생성 — `ProjectDto`, `BenchmarkSubmissionDto` DTO 타입
- [x] `lib/services/projects.ts` 생성 — `createProject`, `submitBenchmark` 함수
- [x] `store/useProjectStore.ts` 생성 — `projectId`, `projectStatus`, `currentStep` 저장
- [x] `useUrlInput.ts` 수정 — submit 시 프로젝트 생성 → URL 제출 → `projectId` store 저장 → `/analysis` 라우팅

---

## 갭 5 — 분석 대기 화면

- [x] `/analysis` 페이지에 `analysisStatus` 기반 분기 추가 (로딩 UI / 결과 UI)
- [x] `lib/services/benchmarkAnalysis.ts` 생성 — `GET /projects/{id}/benchmark-analysis` 함수
- [x] polling 로직 구현 — 2.5초 간격, `COMPLETED` 또는 `FAILED` 시 중단
- [x] 실패 상태 UI — `project.failure` / `lastErrorMessage` 표시

---

## 갭 6 — Domain Model ↔ API 응답 매핑

> 사전 확인에서 `normalized_analysis_tabs` 스키마 확인 후 진행

- [x] `lib/types/api/benchmarkAnalysis.ts` 생성 — `BenchmarkAnalysisResponse` DTO 타입 (Zod 스키마 포함)
- [x] `lib/types/domain/videoAnalysis.ts` 검토 — 현재 UI 필드와 API 응답 필드 일치 여부 확인 후 필요 시 수정
- [x] `lib/services/mappers/benchmarkAnalysisMapper.ts` 생성 — `BenchmarkAnalysisResponse` → `VideoAnalysis` 변환
- [x] `/analysis` 페이지에서 mock 데이터 → 실제 API 데이터로 교체
