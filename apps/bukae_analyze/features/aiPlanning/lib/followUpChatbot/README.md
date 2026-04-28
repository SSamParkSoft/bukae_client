# Follow-Up Chatbot Helpers

후속 질문 챗봇의 표시/복구/질문 변환 helper를 모아둔다.

- `messages.ts`: 챗봇 메시지, stage 문구, ready brief view model 생성
- `questions.ts`: planning session의 active question을 챗봇용 질문 형태로 변환
- `recovery.ts`: 이미 완료된 프로젝트나 단계 불일치 상태를 복구 메시지로 변환

상호작용 흐름 자체는 `features/aiPlanning/hooks/state/useFollowUpChatbot.ts`에서 시작한다.
