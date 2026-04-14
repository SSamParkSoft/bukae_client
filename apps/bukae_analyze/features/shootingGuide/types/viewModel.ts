export interface SceneContentItemViewModel {
  title: string
  content: string
}

export interface ShootingSceneViewModel {
  sceneLabel: string
  durationLabel: string
  description: string
  contentItems: SceneContentItemViewModel[]
}

export interface ShootingGuideViewModel {
  scenes: ShootingSceneViewModel[]
}
