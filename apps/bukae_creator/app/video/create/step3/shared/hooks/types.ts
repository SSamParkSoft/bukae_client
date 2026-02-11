export interface Step3SegmentScene {
  id: string
  script: string
  mediaUrl?: string | null
  selectionStartSeconds: number
  selectionEndSeconds: number
  ttsDuration?: number
  voiceTemplate?: string | null
  voiceLabel?: string
}

export interface Step3MediaAdapter {
  loadFrame: (sceneIndex: number, scene: Step3SegmentScene) => Promise<void>
  renderSubtitle: (sceneIndex: number, text: string) => void
  playVoice: (sceneIndex: number, scene: Step3SegmentScene, speed: number) => Promise<void>
  stopAll: () => void
}

export interface Step3PlaybackState {
  isPlaying: boolean
  currentTime: number
  totalDuration: number
  playbackSpeed: number
}
