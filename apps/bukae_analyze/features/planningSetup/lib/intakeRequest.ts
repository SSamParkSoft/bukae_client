import type { PlanningSetupAnswers } from '@/lib/types/domain'

const FACE_EXPOSURE_PLAN_MAP: Record<Exclude<PlanningSetupAnswers['faceExposure'], null>, string> = {
  'face-cam': 'face-cam',
  'part-shot': 'hands-only',
  voiceover: 'voiceover',
  'no-face': 'custom',
}

function trim(value: string): string {
  return value.trim()
}

function isNonEmpty(value: string): boolean {
  return trim(value).length > 0
}

function parseCustomDurationToSeconds(value: string): number | null {
  const normalized = trim(value).toLowerCase()
  if (!normalized) return null

  const numbers = normalized.match(/\d+(?:\.\d+)?/g)
  if (!numbers || numbers.length === 0) return null

  const raw = Number(numbers[numbers.length - 1])
  if (!Number.isFinite(raw) || raw <= 0) return null

  const usesMinutes =
    normalized.includes('분') ||
    normalized.includes('min') ||
    normalized.includes('minute')

  const seconds = usesMinutes ? Math.round(raw * 60) : Math.round(raw)
  return seconds > 0 ? seconds : null
}

function resolveTargetDurationSec(answers: PlanningSetupAnswers): number | null {
  switch (answers.videoLength) {
    case 'under-15s':
      return 15
    case '15-30s':
      return 30
    case '30-45s':
      return 45
    case '45-60s':
      return 60
    case 'custom':
      return parseCustomDurationToSeconds(answers.videoLengthCustom)
    default:
      return null
  }
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

export function validatePlanningSetupAnswers(
  answers: PlanningSetupAnswers
): string | null {
  if (answers.category === null) {
    return '카테고리를 선택해 주세요.'
  }

  if (answers.category === 'custom' && !isNonEmpty(answers.categoryCustom)) {
    return '카테고리를 직접 입력해 주세요.'
  }

  if (answers.faceExposure === null) {
    return '영상 노출 범위를 선택해 주세요.'
  }

  if (answers.faceExposure === 'no-face' && !isNonEmpty(answers.faceExposureCustom)) {
    return '영상 노출 범위를 직접 입력해 주세요.'
  }

  if (resolveTargetDurationSec(answers) === null) {
    return answers.videoLength === 'custom'
      ? '목표 영상 길이를 초 또는 분 단위로 입력해 주세요.'
      : '목표 영상 길이를 선택해 주세요.'
  }

  if (answers.shooting === null) {
    return '촬영 가능 여부를 선택해 주세요.'
  }

  if (!isNonEmpty(answers.shootingEnvironment)) {
    return '촬영 환경을 입력해 주세요.'
  }

  if (!isNonEmpty(answers.coreMaterial)) {
    return '영상 소스를 입력해 주세요.'
  }

  return null
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
      shootEnvironment: trim(answers.shootingEnvironment),
      coreMaterial: trim(answers.coreMaterial),
    },
  }
}
