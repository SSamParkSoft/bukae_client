function hasMeaningfulText(value: string | null | undefined): value is string {
  return Boolean(value?.trim())
}

export function normalizeFailureMessage(
  message: string | null | undefined
): string | null {
  if (!hasMeaningfulText(message)) return null

  if (
    message.includes('ActivityError') &&
    message.includes('Activity task failed')
  ) {
    return '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.'
  }

  return message
}
