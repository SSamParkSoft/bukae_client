/**
 * 분석 워크플로우 실행 지도
 *
 * app/(shell)/layout.tsx
 *   -> components/layout/AppShell
 *      -> AnalyzeWorkflowProgressSidebar
 *         - 분석 워크플로우의 좌측 진행 상태 영역을 렌더링한다.
 *         - AnalyzeWorkflowStepList를 표시한다.
 *         - project/planning query를 유지한 채 이전 단계로 이동한다.
 *
 *      -> AnalyzeWorkflowNextStepSidebar
 *         - 우측 다음 단계 버튼을 렌더링한다.
 *         - 다음 단계 이동 동작은 useAnalyzeWorkflowNextStep에 위임한다.
 *
 * AnalyzeWorkflowNextStepSidebar
 *   -> useAnalyzeWorkflowNextStep
 *      - 라우트 상태, 단계별 command, 버튼 상태를 조합한다.
 *      - API 상세 로직은 직접 소유하지 않는다.
 *
 *      -> useAnalyzeWorkflowRouteState
 *         - pathname/searchParams를 읽는다.
 *         - projectId, planning query, mode, 현재 단계를 계산한다.
 *
 *      -> usePlanningSetupStepSubmission
 *         - 기획 프리셋 입력값을 검증한다.
 *         - localStorage에 현재 projectId의 intake 제출 기록이 없을 때만 intake를 제출한다.
 *
 *      -> useAiPlanningStepAdvance
 *         - 필요할 때 후속 질문 챗봇 workspace에 진입한다.
 *         - brief가 준비되면 촬영가이드 생성을 시작한다.
 *         - 캐시된 chatbot session과 generation request를 재사용한다.
 *
 * 단계별 동작:
 *
 *        /analysis
 *          -> 서버 action 없이 라우팅만 수행
 *          -> /planning-setup
 *
 *        /planning-setup
 *          -> 기획 프리셋 입력값 검증
 *          -> localStorage에 현재 projectId의 intake 제출 기록이 없을 때 intake 제출
 *          -> /ai-planning으로 이동
 *
 *        /ai-planning?mode=default
 *          -> PT1 이후 추가 정보가 필요하면 후속 질문 챗봇 workspace 진입
 *          -> /ai-planning?mode=chatbot으로 이동
 *
 *        /ai-planning?mode=chatbot
 *          -> brief가 준비되면 촬영가이드 생성 시작
 *          -> /shooting-guide로 이동
 *
 *        /shooting-guide
 *          -> 마지막 워크플로우 단계
 *          -> 다음 버튼 숨김
 *
 * 공용 helper:
 *   -> analyzeWorkflowSteps
 *      - 워크플로우 단계 목록을 정의한다.
 *      - project/planning query를 포함한 단계 URL을 만든다.
 *      - pathname에서 현재 단계 index를 계산한다.
 *
 *   -> store/useAnalyzeWorkflowStore
 *      - 제출된 intake draft, chatbot session, generation request를 저장하는
 *        mutation cache다.
 */
