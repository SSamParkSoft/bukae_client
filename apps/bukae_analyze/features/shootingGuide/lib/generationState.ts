import {
  isGenerationWorkflowCompleted,
  isGenerationWorkflowFailed,
  type Generation,
} from '@/lib/types/domain'

export function isGenerationCompleted(generation: Generation | null): boolean {
  return isGenerationWorkflowCompleted(generation)
}

export function getGenerationFailureMessage(generation: Generation | null): string | null {
  if (!generation) return null
  if (
    !generation.failure &&
    !isGenerationWorkflowFailed(generation) &&
    !generation.lastErrorCode &&
    !generation.lastErrorMessage
  ) {
    return null
  }

  return (
    generation.failure?.summary ??
    generation.lastErrorMessage ??
    generation.lastErrorCode ??
    '촬영가이드 생성에 실패했습니다.'
  )
}

export function getGenerationStatusMessage(generation: Generation | null): string {
  switch (generation?.workflow.status) {
    case 'generatingGuide':
      return '촬영가이드를 생성 중입니다.'
    case 'generatingScript':
      return '스크립트를 생성 중입니다.'
    case 'reviewing':
      return '생성 결과를 검토 중입니다.'
    case 'preparing':
    default:
      return '촬영가이드와 스크립트 생성을 준비 중입니다.'
  }
}
