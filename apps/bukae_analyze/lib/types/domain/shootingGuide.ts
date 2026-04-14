export interface ShootingScene {
  sceneNumber: number
  startTimeSec: number
  endTimeSec: number
  description: string
  visualGuide: string
  subtitleScript: string
  audioScript: string
}

export interface ShootingGuide {
  scenes: ShootingScene[]
}
