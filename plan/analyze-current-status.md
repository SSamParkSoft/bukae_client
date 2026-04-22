# analyze 앱 — 현재 작업 상태

> 마지막 업데이트: 2026-04-22

---

## 완료된 작업 (갭 1~6)

갭 1~6 전체 구현 완료. 상세 내용은 `analyze-api-checklist.md` 참조.

- Zod 설치 / 백엔드 URL 라우팅 / 인증 플로우
- URL 제출 → 프로젝트 생성 API 연동
- 분석 대기 폴링 (2.5초 간격, COMPLETED/FAILED 종료)
- DTO 타입 + Zod 스키마 + Mapper + Domain Model 연결

---

## 현재 작업 중 — 갭 6 후속 디버깅

### 문제

`/analysis` 페이지에서 실제 API 데이터 대신 **mock 데이터**가 표시됨.

### 원인 분석

- `useAnalysisPolling`은 `storedStatus === 'COMPLETED' && videoAnalysis === null` 분기(새로고침 경로)를 타고 있음
- `getBenchmarkAnalysis()` 가 반환한 `data` 객체에서 `!!data.normalized_analysis_tabs === false`
- 즉 `/api/v1/projects/{id}/benchmark-analysis` 엔드포인트 응답에 `normalized_analysis_tabs`가 없거나 null

### 확인 필요 (백엔드)

- [ ] Network 탭에서 `/benchmark-analysis` 응답 body 직접 확인
  - `normalized_analysis_tabs` 키가 없는가? → 엔드포인트가 다른 것
  - 키는 있지만 `null`인가? → Zod `.nullable()` 추가 필요
- [ ] `normalized_analysis_tabs`를 포함한 전체 응답을 반환하는 **올바른 엔드포인트 URL** 확인
  - 현재 사용 중: `GET /api/v1/projects/{id}/benchmark-analysis`
  - 실제 전체 응답 엔드포인트가 다를 수 있음 (백엔드 확인 필요)

### 확인 결과에 따른 다음 조치

| 확인 결과 | 조치 |
|-----------|------|
| 다른 엔드포인트에 `normalized_analysis_tabs` 있음 | `lib/services/endpoints.ts`의 `benchmarkAnalysis` URL 수정 |
| 같은 엔드포인트지만 `null`로 옴 | `NormalizedAnalysisTabsDto.nullable().optional()`로 스키마 변경 |
| 폴링 endpoint와 전체조회 endpoint가 분리됨 | 폴링은 기존 endpoint 유지, COMPLETED 시 별도 endpoint로 1회 full-fetch |

---

## 이후 남은 작업

### 디버그 로그 제거

갭 6 디버깅 중 추가한 임시 `console.warn` 2개 제거 (API 연동 확인 완료 후)

- `useAnalysisPolling.ts` — polling 분기 COMPLETED 로그
- `useAnalysisPolling.ts` — refresh-fetch 분기 로그

### 폴링 무한 재실행 방지

현재 refresh-fetch 분기가 여러 번 호출되고 있음 (스크린샷 기준 4회).  
`videoAnalysis`가 null로 유지되는 동안 effect가 재실행되는 것으로 보임.  
원인 파악 후 `useRef` 플래그로 중복 실행 방지 필요.

---

## 참고 파일

| 파일 | 역할 |
|------|------|
| `lib/services/endpoints.ts` | API 엔드포인트 상수 — URL 변경 시 여기만 수정 |
| `lib/services/benchmarkAnalysis.ts` | fetch + Zod safeParse + fallback |
| `lib/types/api/benchmarkAnalysis.ts` | Zod 스키마 (BenchmarkAnalysisResponseSchema) |
| `lib/services/mappers/benchmarkAnalysisMapper.ts` | DTO → VideoAnalysis 변환 |
| `features/analysisPage/hooks/state/useAnalysisPolling.ts` | 폴링 훅 — 상태 판별 + setAnalysisResult 호출 |
| `store/useProjectStore.ts` | videoAnalysis / videoSrc / referenceUrl 인메모리 저장 |
