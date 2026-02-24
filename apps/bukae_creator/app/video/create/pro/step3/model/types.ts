export interface ProStep3Scene {
  id: string
  script: string
  videoUrl?: string | null
  selectionStartSeconds: number
  selectionEndSeconds: number
  /** 업로드된 원본 영상 길이(초). TTS보다 짧을 때 이어붙여 격자 배경 길이를 계산하는 데 사용 */
  originalVideoDurationSeconds?: number
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number
  ttsAudioBase64?: string
}
