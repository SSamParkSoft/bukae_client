export interface ProStep3Scene {
  id: string
  script: string
  videoUrl?: string | null
  selectionStartSeconds: number
  selectionEndSeconds: number
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number
  ttsAudioBase64?: string
}
