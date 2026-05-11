import { describe, expect, it } from 'vitest'
import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { mapPlanningSetupAnswersToIntakeRequest } from './requestMapper'

function createValidAnswers(overrides: Partial<PlanningSetupAnswers> = {}): PlanningSetupAnswers {
  return {
    category: 'product-promo',
    categoryCustom: '',
    faceExposure: 'voiceover',
    faceExposureCustom: '',
    videoLength: '15-30s',
    videoLengthCustom: '',
    shooting: null,
    shootingEnvironment: '',
    coreMaterial: '핵심 소재',
    ...overrides,
  }
}

describe('mapPlanningSetupAnswersToIntakeRequest', () => {
  it('uses the selected frontend category key as the intake category', () => {
    expect(mapPlanningSetupAnswersToIntakeRequest(createValidAnswers({
      category: 'review',
    })).category).toBe('review')

    expect(mapPlanningSetupAnswersToIntakeRequest(createValidAnswers({
      category: 'tutorial',
    })).category).toBe('tutorial')
  })

  it('rejects custom category because intake category must be canonical', () => {
    expect(() => mapPlanningSetupAnswersToIntakeRequest(createValidAnswers({
      category: 'custom',
      categoryCustom: '직접 입력',
    }))).toThrow('기획 프리세팅 입력값이 올바르지 않습니다.')
  })
})
