import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { resolveTargetDurationSec } from './duration'

const FACE_EXPOSURE_PLAN_MAP: Record<Exclude<PlanningSetupAnswers['faceExposure'], null>, string> = {
  'face-cam': 'face-cam',
  'part-shot': 'hands-only',
  voiceover: 'voiceover',
  'no-face': 'custom',
}

function trim(value: string): string {
  return value.trim()
}

function resolveCategoryCustom(): string {
  return ''
}

function resolveFaceExposurePlan(answers: PlanningSetupAnswers): string | null {
  if (!answers.faceExposure) {
    return null
  }

  return FACE_EXPOSURE_PLAN_MAP[answers.faceExposure]
}

function resolveFaceExposureCustom(answers: PlanningSetupAnswers): string {
  if (answers.faceExposure === 'no-face') {
    return trim(answers.faceExposureCustom)
  }

  return ''
}

export function mapPlanningSetupAnswersToIntakeRequest(
  answers: PlanningSetupAnswers
) {
  const targetDurationSec = resolveTargetDurationSec(answers)
  const faceExposurePlan = resolveFaceExposurePlan(answers)

  if (targetDurationSec === null || faceExposurePlan === null) {
    throw new Error('기획 프리세팅 입력값이 올바르지 않습니다.')
  }

  return {
    category: 'PRODUCT_PROMOTION' as const,
    payload: {
      categoryCustom: resolveCategoryCustom(),
      faceExposurePlan,
      faceExposureCustom: resolveFaceExposureCustom(answers),
      targetDurationSec,
      shootPlanned: answers.shooting === 'yes',
      shootEnvironment: answers.shooting === 'yes' ? trim(answers.shootingEnvironment) : '',
      coreMaterial: trim(answers.coreMaterial),
    },
  }
}
