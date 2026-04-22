export interface ShootingSceneViewModel {
  sceneLabel: string
  durationLabel: string
  description: string
  visualGuide: string
  audioScript: string
  subtitleScript: string
  planningBasis: string
}

export interface ShootingGuideViewModel {
  scenes: ShootingSceneViewModel[]
}
