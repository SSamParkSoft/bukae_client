# Domain Entity Normalization Plan

## 목표

서버가 내려주는 상태 문자열을 feature 로직에서 직접 비교하지 않고, `http -> domain mapper`와 domain predicate를 통해 안정적인 프론트 entity로 사용한다.

백엔드 enum 이름, 단계명, casing이 바뀌더라도 mapper와 predicate 일부만 수정하면 되도록 영향 범위를 줄인다.

## 원칙

- 분기 조건에 쓰는 서버 필드는 domain entity로 감싼다.
- raw 값은 디버깅과 fallback 메시지용으로만 보존한다.
- feature, hook, component는 raw enum 문자열을 직접 비교하지 않는다.
- 알 수 없는 서버 값은 throw하지 않고 `unknown`으로 매핑한다.
- 화면 표시만 하는 문자열은 우선순위를 낮추고, 라우팅/폴링/상태 전환에 쓰는 값부터 정리한다.

## 1차 완료 범위

1. `ProjectWorkflow`
   - `projectStatus/currentStep` raw 값을 `status/step` domain 값으로 매핑한다.
   - `isProjectPlanningWorkflow`, `isProjectFinalizedForGeneration`, `isProjectCategorySelectionWorkflow`, `isProjectFailedWorkflow` predicate를 사용한다.
   - planning finalize, analysis polling, workflow mismatch 판단에서 raw 비교를 제거했다.

2. `GenerationWorkflow`
   - `generationStatus` raw 값을 domain status로 매핑한다.
   - generation 완료/실패/진행 문구 판단을 domain predicate와 domain status 기반으로 바꿨다.
   - project generation 완료 상태는 `ProjectWorkflow` predicate로 판단한다.

## 남은 작업

1. Analysis 상태 entity
   - 대상: `submissionStatus`, `analysisStatus`
   - 후보 타입: `AnalysisWorkflow`, `AnalysisSubmissionStatus`, `BenchmarkAnalysisStatus`
   - 필요한 predicate:
     - `isAnalysisCompleted`
     - `isAnalysisFailed`
     - `isAnalysisNotSubmitted`
   - 현재 `analysisResource`에는 아직 `FAILED`, `COMPLETED` 같은 analysis raw 값 비교가 남아 있다.

2. Planning 상태 entity
   - 대상: `planningStatus`, `readyForApproval`, `ready_to_finalize`, `detail_gap_state.is_sufficient`
   - 현재 raw 접근은 대부분 `planningPredicates`에 모여 있지만, `ready_to_finalize` 같은 artifact key 접근은 mapper/domain entity로 옮기는 것이 좋다.
   - 필요한 predicate:
     - `isPlanningFinalizeStarted`
     - `isPlanningReadyForApproval`
     - `isPlanningReadyToFinalize`

3. Brief 상태 entity
   - 대상: `Brief.status`, `briefStatus`
   - 현재는 전달/저장 중심이지만 승인/수정/재생성 분기가 생기면 raw string이 퍼질 가능성이 높다.
   - store에는 raw `briefStatus: string | null` 대신 안정적인 domain status를 저장하는 방향을 검토한다.

4. Raw 필드 축소
   - 호환성을 위해 `projectStatus/currentStep/generationStatus` raw 필드는 당분간 유지한다.
   - feature 코드에서 raw 접근이 사라진 뒤, raw 값은 `workflow.rawStatus/rawStep`처럼 entity 내부로만 접근하게 줄인다.

## 검증 기준

- `rg`로 feature/hook/component의 raw enum 직접 비교가 남았는지 확인한다.
- mapper 또는 domain entity 파일 내부의 `switch/case` raw 비교는 허용한다.
- 매 단계마다 아래 명령을 통과시킨다.
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm exec next build --webpack`
