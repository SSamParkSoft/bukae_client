import type { PlanningSetupAnswers } from '@/lib/types/domain'

function trim(value: string): string {
  return value.trim()
}

function parseCustomDurationToSeconds(value: string): number | null {
  const normalized = trim(value).toLowerCase()
  if (!normalized) return null

  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:분|min|minutes?)/)
  const secondMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:초|sec|seconds?)/)

  if (minuteMatch || secondMatch) {
    const minutes = minuteMatch ? Number(minuteMatch[1]) : 0
    const seconds = secondMatch ? Number(secondMatch[1]) : 0
    const totalSeconds = Math.round(minutes * 60 + seconds)

    return totalSeconds > 0 ? totalSeconds : null
  }

  const raw = Number(normalized.match(/\d+(?:\.\d+)?/)?.[0])
  if (!Number.isFinite(raw) || raw <= 0) return null

  const seconds = Math.round(raw)
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
