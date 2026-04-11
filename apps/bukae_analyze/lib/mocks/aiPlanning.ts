import type { AiPlanningInput } from '@/lib/types/domain'

export const MOCK_AI_PLANNING_INPUT: AiPlanningInput = {
  category: 'self-narrative',
  coreMaterial: '대학생 때 창업 도전해서 2년 만에 포르쉐를 샀다',
  referenceContext: {
    hookingStyleLabel: '어린 나이 + 고급차 소유 사실 직접 공개 → 시선 집중',
    storyPatternLabel: '자수성가 서사 — 부모 도움 없이 스스로 이룬 성취',
    emotionTriggerLabel: '부러움 + "나도 할 수 있다"는 동기 자극',
    ctaStyleLabel: '팔로우 유도 + 다음 편 예고',
  },
}
