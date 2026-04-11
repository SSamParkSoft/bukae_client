export type VideoCategory =
  | 'product-promo'
  | 'information'
  | 'review'
  | 'vlog'
  | 'self-narrative'
  | 'challenge-meme'
  | 'interview-talk'
  | 'tutorial'

export type FaceExposure = 'face-cam' | 'part-shot' | 'voice-over' | 'no-face'

export type VideoLength = 'under-15s' | '15-30s' | '30-45s' | '45-60s'

export type ShootingAvailability = 'yes' | 'no'

export interface PlanningSetupAnswers {
  category: VideoCategory | 'custom' | null
  categoryCustom: string
  faceExposure: FaceExposure | 'custom' | null
  faceExposureCustom: string
  videoLength: VideoLength | 'custom' | null
  videoLengthCustom: string
  shooting: ShootingAvailability | null
  shootingEnvironment: string
  coreMaterial: string
}
