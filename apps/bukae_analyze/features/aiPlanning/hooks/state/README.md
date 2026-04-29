# AI Planning State Hooks

이 폴더의 최상위 `use...` 파일은 UI 또는 페이지가 직접 호출하는 상호작용 hook이다.

- `usePlanningSession.ts`: AI 기획 세션 조회와 초기 polling 상태
- `usePt1AnswerDrafts.ts`: PT1 질문 답변 draft 입력 상태
- `usePt1AnswerAutoSubmission.ts`: PT1 답변이 모두 준비되었을 때 자동 저장
- `useAiPlanningNavigationStateSync.ts`: 전역 다음 단계 버튼이 읽는 navigation state 동기화
- `useFollowUpChatbot.ts`: 후속 질문 챗봇 UI가 사용하는 view model

`followUpChatbot/` 하위 파일은 `useFollowUpChatbot.ts`를 받치는 내부 effect hook이다. UI 컴포넌트가 직접 import하지 않는다.
