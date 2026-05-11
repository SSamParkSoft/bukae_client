import { describe, expect, it } from 'vitest'
import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { validatePlanningSetupAnswers } from './validation'

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

describe('validatePlanningSetupAnswers', () => {
  it('allows shooting setup to be omitted', () => {
    expect(validatePlanningSetupAnswers(createValidAnswers({
      shooting: null,
      shootingEnvironment: '',
    }))).toBeNull()
  })

  it('requires shooting environment only when direct shooting is enabled', () => {
    expect(validatePlanningSetupAnswers(createValidAnswers({
      shooting: 'yes',
      shootingEnvironment: '',
    }))).toBe('촬영 환경을 입력해 주세요.')
  })

  it('requires core material', () => {
    expect(validatePlanningSetupAnswers(createValidAnswers({
      coreMaterial: ' ',
    }))).toBe('영상 소스를 입력해 주세요.')
  })

  it('does not allow custom category because intake requires a supported category key', () => {
    expect(validatePlanningSetupAnswers(createValidAnswers({
      category: 'custom',
      categoryCustom: '직접 입력',
    }))).toBe('지원하는 카테고리 중 하나를 선택해 주세요.')
  })
})
