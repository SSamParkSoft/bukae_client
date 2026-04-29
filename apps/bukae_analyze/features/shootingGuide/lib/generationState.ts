import type { Generation } from '@/lib/types/domain'

export function isGenerationCompleted(generation: Generation | null): boolean {
  return (
    generation?.generationStatus === 'COMPLETED' ||
    generation?.projectStatus === 'GENERATION_COMPLETED'
  )
}

export function getGenerationFailureMessage(generation: Generation | null): string | null {
  if (!generation) return null
  if (
    !generation.failure &&
    generation.generationStatus !== 'FAILED' &&
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
  switch (generation?.generationStatus) {
    case 'GENERATING_GUIDE':
      return '촬영가이드를 생성 중입니다.'
    case 'GENERATING_SCRIPT':
      return '스크립트를 생성 중입니다.'
    case 'REVIEWING':
      return '생성 결과를 검토 중입니다.'
    case 'PREPARING':
    default:
      return '촬영가이드와 스크립트 생성을 준비 중입니다.'
  }
}
