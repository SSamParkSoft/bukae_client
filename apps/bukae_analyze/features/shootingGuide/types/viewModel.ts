export interface ShootingSceneContentItemViewModel {
  label: string
  lines: string[]
  withBullet?: boolean
  withLeading?: boolean
}

export interface ShootingSceneViewModel {
  sceneLabel: string
  durationLabel: string
  description: string
  visualGuideItems: ShootingSceneContentItemViewModel[]
  audioScriptItems: ShootingSceneContentItemViewModel[]
  subtitleScriptItems: ShootingSceneContentItemViewModel[]
  planningBasisItems: ShootingSceneContentItemViewModel[]
}

export interface ShootingGuideViewModel {
  scenes: ShootingSceneViewModel[]
}
