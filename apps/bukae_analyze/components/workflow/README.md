# Analyze Workflow Components

이 폴더 최상위 파일은 shell layout이 직접 사용하는 워크플로우 UI와 다음 단계 orchestration이다.

- `AnalyzeWorkflowProgressSidebar.tsx`: 좌측 진행 상태와 이전 단계 이동 UI
- `AnalyzeWorkflowNextStepSidebar.tsx`: 우측 다음 단계 이동 UI
- `useAnalyzeWorkflowNextStep.ts`: 현재 route와 단계별 command를 조합하는 다음 단계 실행 hook

하위 폴더는 최상위 파일을 받치는 구현이다.

- `commands/`: 단계 이동 중 실행되는 서버 mutation 또는 workflow command
- `hooks/`: pathname/searchParams 기반 route state 계산
- `lib/`: 단계 목록과 URL 생성 helper
- `ui/`: sidebar 내부에서 재사용하는 작은 UI 조각
