# Planning Setup Feature

UI가 직접 닿는 파일은 form hook과 page client다.

- `hooks/form/usePlanningSetupForm.ts`: 기획 프리세팅 입력 draft 상태를 관리하고 store에 동기화한다.
- `app/(shell)/planning-setup/_components/PlanningSetupPageClient.tsx`: 질문 UI를 조합한다.
- `lib/createPlanningSetupViewModel.ts`: form 상태를 질문 컴포넌트용 view model로 변환한다.

`lib/intake/` 하위 파일은 다음 단계 이동 시 실행되는 intake 제출 command를 받친다.

- `validation.ts`: 제출 전 입력값 검증
- `duration.ts`: 목표 영상 길이 해석
- `requestMapper.ts`: domain answer를 intake command payload로 변환
