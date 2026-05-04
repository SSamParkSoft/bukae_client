# Analyze Cache Strategy

이 문서는 `apps/bukae_analyze`에서 사용하는 캐시의 목적, 저장 위치, key 규칙, 디버깅 방법을 정리한다. 캐시는 중복 서버 액션을 줄이고 이전/다음 단계 이동을 빠르게 만들기 위한 장치지만, stale data나 누락된 invalidate로 디버깅 비용을 만들 수 있으므로 새 캐시를 추가할 때 이 문서를 함께 갱신한다.

## 캐시 종류

### 1. Workflow mutation cache

저장 위치:

- `store/useAnalyzeWorkflowStore.ts`

목적:

- 사용자가 워크플로우 이전/다음 단계를 오가도 이미 실행한 mutation을 반복하지 않는다.
- 같은 입력 또는 같은 brief에 대해 서버 액션을 다시 일으키지 않고 기존 결과로 라우팅한다.

현재 저장하는 값:

- `chatbotSessionByPlanningSessionId`
  - follow-up chatbot workspace 진입 결과
  - 사용 위치: `components/workflow/useAiPlanningStepAdvance.ts`
- `planningSessionByProjectId`
  - AI 기획 PT1 질문/세션 복원용
  - 사용 위치: `app/(shell)/ai-planning/_components/AiPlanningPageClient.tsx`
- `pt1AnswerDraftByKey`
  - 사용자가 입력한 PT1 선택/커스텀/필드 답변 draft
  - 사용 위치: `features/aiPlanning/hooks/state/usePt1AnswerDrafts.ts`
  - localStorage snapshot: `bukae_analyze:pt1-planning:{projectId}:{planningHash}`
  - 서버 질문 세션과 사용자 PT1 답변 draft를 함께 저장해 새로고침/재진입 시 복원한다.
- `generationRequestIdByBriefVersionId`
  - 촬영가이드 generation 시작 결과
  - 사용 위치: `components/workflow/useAiPlanningStepAdvance.ts`

주의:

- 이 캐시는 "프론트에서 불필요한 호출을 줄이는 장치"다.
- 서버도 같은 요청을 안전하게 처리할 수 있도록 idempotency를 지원해야 한다.

## Key 규칙

### 기획 프리셋 intake

```ts
localStorage.setItem(`bukae_analyze:intake-submitted:${projectId}`, '1')
```

- intake 제출 성공 후 project별 localStorage flag를 저장한다.
- 다음 단계 클릭 시 flag가 있으면 저장 중 UI와 intake API 호출 없이 바로 이동한다.
- 사용자가 localStorage를 지우면 같은 project에서 intake API가 다시 호출될 수 있다.

### Chatbot workspace

```ts
planningSessionId
```

- 같은 planning session으로 이미 chatbot workspace에 진입했다면 cached session을 재사용한다.

### AI planning PT1 복원

```ts
projectId
`${projectId}:${planning ?? ''}`
```

- `planningSessionByProjectId`는 project 기준으로 PT1 질문과 session을 복원한다.
- `pt1AnswerDraftByKey`는 project와 planning query를 함께 사용해 입력 draft를 복원한다.
- localStorage PT1 snapshot은 질문 세션과 답변 draft를 함께 저장한다.
- 촬영가이드 화면에서 이전 단계로 돌아오는 경우 `generationRequestId`가 URL에 남아 있으므로 planning API 재조회와 PT1 auto-submit을 수행하지 않고 cached state를 우선 표시한다.

### Shooting guide generation

```ts
briefVersionId
```

- 같은 brief로 이미 generation을 시작했다면 cached `generationRequestId`를 재사용한다.
- 사용자가 이전 단계로 돌아갔다가 다시 다음으로 이동해도 generation을 중복 시작하지 않는다.

## 조회 데이터 캐시

조회성 데이터는 React Query 기반으로 점진 이동한다.

현재 적용:

- `features/shootingGuide/hooks/state/useGenerationPolling.ts`
  - query key: `['generation', projectId, generationRequestId]`
  - 서버 bootstrap 데이터는 `initialData`로 주입한다.
  - 완료/실패 상태가 되면 polling을 중단한다.

추후 대상:

- `features/analysisPage/hooks/state/useAnalysisResource.ts`
- `features/aiPlanning/hooks/state/usePlanningSession.ts`

예상 query key:

```ts
['analysisSnapshot', projectId]
['planningSession', projectId]
['generation', projectId, generationRequestId]
```

상태별 정책:

- 완료 상태
  - `COMPLETED`, `BRIEF_APPROVED`, `GENERATION_COMPLETED`
  - 오래 캐시해도 비교적 안전하다.
- 진행 중 상태
  - `PROCESSING`, `GENERATING`, `PENDING`
  - 짧은 stale time 또는 polling을 유지한다.
- 에러 상태
  - 짧게 유지하거나 재시도를 허용한다.

서버 bootstrap 데이터:

- 서버 컴포넌트에서 최초 조회한 데이터는 React Query의 `initialData`로 주입하는 방향을 우선 검토한다.
- 이후 client polling은 같은 query key를 사용해 cache를 갱신한다.

## Mutation 이후 처리 원칙

mutation 성공 후에는 둘 중 하나를 명시적으로 선택한다.

1. 관련 query invalidate
   - 서버 상태를 다시 확인해야 하는 경우
2. `setQueryData` 또는 Zustand cache patch
   - 서버 응답으로 다음 화면에 필요한 값이 이미 충분한 경우

현재 workflow mutation cache는 Zustand patch 방식을 사용한다.

## 디버깅 가이드

서버 호출이 예상보다 적게 발생할 때:

1. localStorage의 intake submitted flag 또는 `useAnalyzeWorkflowStore`의 key가 이미 저장되어 있는지 확인한다.
2. intake localStorage flag, `chatbotSessionByPlanningSessionId`, `generationRequestIdByBriefVersionId` 중 어떤 캐시가 동작했는지 확인한다.
3. 입력값을 바꿨는데도 intake가 재제출되지 않는다면 현재 정책상 project별 1회 제출이 맞는지 확인한다.

서버 호출이 예상보다 많이 발생할 때:

1. 같은 작업이 동일한 key로 저장되는지 확인한다.
2. page 이동 시 store가 reset되는 코드가 있는지 확인한다.
3. Strict Mode 또는 effect 재실행으로 mutation이 중복 호출되는지 확인한다.

stale data가 의심될 때:

1. 완료 상태인지 진행 중 상태인지 먼저 확인한다.
2. 진행 중 상태라면 polling이 여전히 실행되는지 확인한다.
3. mutation 성공 후 query invalidate 또는 cache patch가 누락되지 않았는지 확인한다.

개발 중 캐시 초기화가 필요할 때:

```ts
useAnalyzeWorkflowStore.getState().resetWorkflowCache()
```

## 새 캐시 추가 체크리스트

- 캐시 목적이 중복 mutation 방지인지, 조회 데이터 재사용인지 구분했는가?
- key가 입력값 변경을 충분히 반영하는가?
- 완료/진행/에러 상태별 정책이 있는가?
- mutation 성공 후 invalidate 또는 patch 기준이 명확한가?
- 이 문서의 "현재 저장하는 값" 또는 "조회 데이터 캐시 계획"을 갱신했는가?
