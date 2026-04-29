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
  visualSubject?: string
  shotType?: string
  cameraAction?: string
  transition?: string
  mustShow?: string[]
  forbiddenMoves?: string[]
  audioNarration?: string
  mustSay?: string[]
  subtitleText?: string
  directorNote?: string
  emotionTarget?: string
  proofRequirement?: string
  proofInsertion?: string
}

export interface ShootingGuide {
  scenes: ShootingScene[]
}
