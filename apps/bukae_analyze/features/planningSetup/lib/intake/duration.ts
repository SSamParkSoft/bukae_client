import type { PlanningSetupAnswers } from '@/lib/types/domain'

function trim(value: string): string {
  return value.trim()
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

export function resolveTargetDurationSec(answers: PlanningSetupAnswers): number | null {
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
