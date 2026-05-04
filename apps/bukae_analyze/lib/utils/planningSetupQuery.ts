import type {
  FaceExposure,
  PlanningSetupAnswers,
  ShootingAvailability,
  VideoCategory,
  VideoLength,
} from '@/lib/types/domain'

export const EMPTY_PLANNING_SETUP_ANSWERS: PlanningSetupAnswers = {
  category: null,
  categoryCustom: '',
  faceExposure: null,
  faceExposureCustom: '',
  videoLength: null,
  videoLengthCustom: '',
  shooting: null,
  shootingEnvironment: '',
  coreMaterial: '',
}

const VIDEO_CATEGORIES = new Set<VideoCategory | 'custom'>([
  'product-promo',
  'information',
  'review',
  'vlog',
  'self-narrative',
  'challenge-meme',
  'interview-talk',
  'tutorial',
  'custom',
])

const FACE_EXPOSURES = new Set<FaceExposure | 'custom'>([
  'face-cam',
  'part-shot',
  'voiceover',
  'no-face',
  'custom',
])

const VIDEO_LENGTHS = new Set<VideoLength | 'custom'>([
  'under-15s',
  '15-30s',
  '30-45s',
  '45-60s',
  'custom',
])

const SHOOTING_AVAILABILITY = new Set<ShootingAvailability>(['yes', 'no'])

function sanitizeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function sanitizeNullableEnum<T extends string>(
  value: unknown,
  allowed: Set<T>
): T | null {
  return typeof value === 'string' && allowed.has(value as T)
    ? (value as T)
    : null
}

function sanitizeFaceExposure(value: unknown): FaceExposure | null {
  if (value === 'voice-over') return 'voiceover'
  if (value === 'custom') return null

  return sanitizeNullableEnum(value, FACE_EXPOSURES) as FaceExposure | null
}

export function parsePlanningSetupAnswers(
  serialized: string | null
): PlanningSetupAnswers {
  if (!serialized) return EMPTY_PLANNING_SETUP_ANSWERS

  try {
    const parsed = JSON.parse(serialized)

    if (!parsed || typeof parsed !== 'object') {
      return EMPTY_PLANNING_SETUP_ANSWERS
    }

    return {
      category: sanitizeNullableEnum(parsed.category, VIDEO_CATEGORIES),
      categoryCustom: sanitizeString(parsed.categoryCustom),
      faceExposure: sanitizeFaceExposure(parsed.faceExposure),
      faceExposureCustom: sanitizeString(parsed.faceExposureCustom),
      videoLength: sanitizeNullableEnum(parsed.videoLength, VIDEO_LENGTHS),
      videoLengthCustom: sanitizeString(parsed.videoLengthCustom),
      shooting: sanitizeNullableEnum(parsed.shooting, SHOOTING_AVAILABILITY),
      shootingEnvironment: sanitizeString(parsed.shootingEnvironment),
      coreMaterial: sanitizeString(parsed.coreMaterial),
    }
  } catch {
    return EMPTY_PLANNING_SETUP_ANSWERS
  }
}
