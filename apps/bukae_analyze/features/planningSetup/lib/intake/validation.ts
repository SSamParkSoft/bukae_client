import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { resolveTargetDurationSec } from './duration'

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

export function validatePlanningSetupAnswers(
  answers: PlanningSetupAnswers
): string | null {
  if (answers.category === null) {
    return '카테고리를 선택해 주세요.'
  }

  if (answers.category === 'custom') {
    return '지원하는 카테고리 중 하나를 선택해 주세요.'
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

  if (answers.shooting === 'yes' && !isNonEmpty(answers.shootingEnvironment)) {
    return '촬영 환경을 입력해 주세요.'
  }

  if (!isNonEmpty(answers.coreMaterial)) {
    return '영상 소스를 입력해 주세요.'
  }

  return null
}
