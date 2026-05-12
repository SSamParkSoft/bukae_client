# AI Planning Hook Refactor Plan

## 목적

이 문서는 `features/aiPlanning`의 hook 리팩토링 계획을 정리한다.

목표는 hook을 폴더로만 나누는 것이 아니라, hook 본문이 흐름의 연결처럼 읽히게 만드는 것이다.

```txt
hook = orchestration
lib function = 순수 판단/변환
side-effect hook = 이름에 부작용이 드러나는 effect
```

## 문제 인식

현재 가장 큰 대상은 다음 파일이다.

```txt
features/aiPlanning/hooks/state/useFollowUpChatbot.ts
features/aiPlanning/hooks/state/followUpChatbot/useFollowUpPlanningEffects.ts
```

`useFollowUpChatbot.ts`는 후속 질문 챗봇의 핵심 hook이지만, 아래 책임을 한 파일에서 직접 조합한다.

```txt
- planning session 상태 보관
- follow-up question queue 관리
- answer input 상태 관리
- chat history localStorage load/save
- server transcript merge
- question/status/error/readyBrief message append
- PT2 답변 제출
- 제출 실패 recovery
- 다음 질문 polling
- 최종 기획안 finalize
- sidebar가 읽을 readyBrief/viewModel 생성
```

문제는 helper가 없는 것이 아니다. 이미 `features/aiPlanning/lib/followUpChatbot/*`에 helper는 나뉘어 있다.

```txt
messages.ts
chatHistoryStorage.ts
questions.ts
recovery.ts
workflow.ts
```

하지만 hook이 낮은 레벨 helper를 모두 직접 import하므로, 파일을 읽는 사람이 import 맥락을 계속 기억해야 한다.

## 리팩토링 원칙

```txt
1. hook은 orchestration을 보여준다.
2. 순수 판단/변환은 lib 함수로 뺀다.
3. side effect는 이름에 드러나는 hook/function으로 둔다.
4. 동작 변경은 하지 않는다.
5. 한 번에 구조를 갈아엎지 않고, 읽기 어려운 부분부터 작게 나눈다.
```

좋은 최종 형태의 예시는 다음과 같다.

```ts
export function useFollowUpChatbot(...) {
  const sessionState = useFollowUpSessionState(...)
  const chatHistory = useFollowUpChatHistory(...)
  const lifecycle = useFollowUpPlanningLifecycle(...)
  const submitAnswer = useSubmitFollowUpAnswer(...)

  return createFollowUpChatbotViewModel(...)
}
```

## 작업 범위

직접 건드릴 가능성이 높은 파일:

```txt
features/aiPlanning/hooks/state/useFollowUpChatbot.ts
features/aiPlanning/hooks/state/followUpChatbot/useFollowUpPlanningEffects.ts
features/aiPlanning/lib/followUpChatbot/messages.ts
features/aiPlanning/lib/followUpChatbot/chatHistoryStorage.ts
features/aiPlanning/lib/followUpChatbot/questions.ts
features/aiPlanning/lib/followUpChatbot/recovery.ts
features/aiPlanning/lib/followUpChatbot/workflow.ts
features/aiPlanning/types/chatbotViewModel.ts
```

새로 만들 가능성이 높은 파일:

```txt
features/aiPlanning/lib/followUpChatbot/chatHistoryFlow.ts
features/aiPlanning/lib/followUpChatbot/sessionFlow.ts
features/aiPlanning/lib/followUpChatbot/answerFlow.ts

features/aiPlanning/hooks/state/followUpChatbot/useFollowUpChatHistory.ts
features/aiPlanning/hooks/state/followUpChatbot/useSubmitFollowUpAnswer.ts
```

처음부터 전부 만들지 않는다. 변경 단위는 작게 가져간다.

## 1차 작업: chat history 흐름 정리

현재 `useFollowUpChatbot.ts` 안에는 chat history 관련 로직이 흩어져 있다.

현재 직접 조합하는 함수:

```txt
getStoredFollowUpChatHistory
storeFollowUpChatHistory
mergeChatMessages
appendUniqueChatMessages
createQuestionChatMessage
createAnswerChatMessage
createStatusChatMessage
createErrorChatMessage
createReadyBriefChatMessage
```

이를 별도 hook으로 분리한다.

```txt
features/aiPlanning/hooks/state/followUpChatbot/useFollowUpChatHistory.ts
```

예상 반환값:

```ts
{
  chatHistory,
  isCurrentChatHistoryLoaded,
  appendChatMessages,
  appendQuestionMessage,
  appendStatusMessage,
  appendErrorMessage,
  appendReadyBriefMessage,
}
```

이렇게 하면 `useFollowUpChatbot.ts`는 localStorage와 chat message 생성 세부사항을 덜 알게 된다.

주의할 점:

```txt
- 같은 탭 지연 실행용 setTimeout(..., 0) 동작 유지
- server transcript merge 순서 유지
- question/status/error/readyBrief message append 순서 유지
- localStorage persist 조건 유지
```

## 2차 작업: answer submit 흐름 정리

현재 `submitCurrentAnswer` callback은 아래 일을 모두 한다.

```txt
- answer trim
- currentQuestion guard
- input clear
- submitting true
- stageMessage 변경
- question/answer message append
- submitPt2FreeText API 호출
- next session apply
- unresolved question 계산
- recovery 처리
- finalized project 처리
- errorMessage 설정
- submitting false
```

이를 별도 hook/function으로 분리한다.

```txt
features/aiPlanning/hooks/state/followUpChatbot/useSubmitFollowUpAnswer.ts
```

예상 사용 형태:

```ts
const submitCurrentAnswer = useSubmitFollowUpAnswer(...)
```

주의할 점:

```txt
- applySession 흐름 유지
- applyFinalizedProject 흐름 유지
- getUnresolvedNextQuestions 결과 처리 유지
- resolvePlanningRecovery가 finalizedProject를 반환하는 경로 유지
- stale closure가 생기지 않도록 의존성 유지
```

## 3차 작업: planning lifecycle effects 파일 분리

현재 파일:

```txt
features/aiPlanning/hooks/state/followUpChatbot/useFollowUpPlanningEffects.ts
```

이 파일은 400줄 이상이며 아래 hook들을 모두 포함한다.

```txt
useMountedRef
useSyncInitialPlanningSession
useRefreshPlanningSessionOnChatbotEntry
usePollNextFollowUpQuestion
useFinalizePlanningWhenReady
```

처음에는 로직 변경 없이 파일만 분리한다.

예상 구조:

```txt
features/aiPlanning/hooks/state/followUpChatbot/
  useMountedRef.ts
  useSyncInitialPlanningSession.ts
  useRefreshPlanningSessionOnChatbotEntry.ts
  usePollNextFollowUpQuestion.ts
  useFinalizePlanningWhenReady.ts
```

주의할 점:

```txt
- polling cleanup 유지
- finalize 중복 실행 방지 ref 유지
- entry refresh guard 유지
- debug log 유지 여부는 별도 판단
```

## 4차 작업: lib facade 정리

1~3차 후에도 hook이 낮은 레벨 helper를 너무 많이 import하면 facade/use-case 파일을 둔다.

후보:

```txt
features/aiPlanning/lib/followUpChatbot/chatHistoryFlow.ts
features/aiPlanning/lib/followUpChatbot/sessionFlow.ts
features/aiPlanning/lib/followUpChatbot/answerFlow.ts
```

역할 예시:

```txt
chatHistoryFlow.ts
- loadFollowUpChatHistory
- mergeFollowUpTranscriptMessages
- createQuestionHistoryUpdate
- createStatusHistoryUpdate
- createErrorHistoryUpdate
- createReadyBriefHistoryUpdate
- shouldAppendFinalizeProgressMessages

sessionFlow.ts
- createFollowUpSessionState
- createFinalizedReadyBriefState
- mapFollowUpCurrentQuestion
- mapFollowUpSessionQuestions

answerFlow.ts
- createPt2AnswerCommand
- resolveAnswerSubmissionRecovery
```

주의할 점:

```txt
- facade가 새로운 쓰레기통이 되면 안 된다.
- 같은 흐름에서 같이 바뀌는 함수만 묶는다.
- 순수 함수만 lib에 둔다.
- API 호출, localStorage write, store sync는 이름에 side effect가 드러나는 hook/function으로 둔다.
```

## 이번 작업에서 하지 않을 것

```txt
- UI 변경 안 함
- API 동작 변경 안 함
- store 제거 안 함
- React Query 전환 안 함
- 폴더 구조 대규모 변경 안 함
- chatbot polling/finalize 로직 재설계 안 함
```

## 리스크

```txt
1. chat history 순서가 바뀔 수 있음
   - question -> answer -> status -> readyBrief 순서 유지 필요

2. cleanup 누락 위험
   - setTimeout, setInterval, polling cleanup 유지 필요

3. stale closure 위험
   - answer, currentQuestion, isSubmitting, projectId 의존성 유지 필요

4. recovery 경로 손상 위험
   - resolvePlanningRecovery가 finalizedProject를 반환하는 경우 유지 필요

5. viewmodel shape 유지 필요
   - FollowUpChatbotViewModel 반환 구조는 바꾸지 않음
```

## 검증 방법

각 작은 단계 후 최소:

```txt
pnpm --filter bukae_analyze typecheck
pnpm --filter bukae_analyze test
```

마지막 전체 검증:

```txt
pnpm --filter bukae_analyze lint
pnpm --filter bukae_analyze exec next build --webpack
```

가능하면 추가 테스트는 순수 함수에만 붙인다. hook 자체 테스트는 현재 환경에서 비용이 크므로 우선 피한다.

## 완료 기준

```txt
1. useFollowUpChatbot.ts가 의미 있게 짧아진다.
2. import가 낮은 레벨 helper 다발이 아니라 flow/hook 중심으로 줄어든다.
3. hook 본문이 다음 순서로 읽힌다.
   - state 선언
   - derived state
   - chat history hook
   - planning lifecycle hooks
   - answer submit hook
   - viewmodel return
4. test/typecheck/lint/build가 통과한다.
```

## 커밋 단위

```txt
[analyze] refactor: 후속 질문 채팅 히스토리 흐름 분리
[analyze] refactor: 후속 질문 답변 제출 흐름 분리
[analyze] refactor: 후속 질문 planning effect 분리
```

이 단위로 나누면 중간에 작업이 끊겨도 이어받기 쉽다.
