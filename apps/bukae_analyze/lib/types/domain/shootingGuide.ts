export interface ShootingScene {
  sceneNumber: number
  sceneName: string
  startTimeSec: number
  endTimeSec: number
  description: string
  visualGuide: string
  subtitleScript: string
  audioScript: string
  planningBasis: string
}

export interface ShootingGuide {
  scenes: ShootingScene[]
}
