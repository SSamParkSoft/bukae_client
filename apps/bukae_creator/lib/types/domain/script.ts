/**
 * Script 도메인 모델
 * 비디오 스크립트 관련 도메인 모델을 정의합니다.
 */

/**
 * Scene Script
 * 씬별 대본 정보를 나타냅니다.
 */
export interface SceneScript {
  sceneId: number
  script: string
  imageUrl?: string
  /** 이 스크립트가 마지막으로 AI에 의해 생성/갱신되었는지 여부 */
  isAiGenerated?: boolean
  /** 씬 분할 시 하위 번호 (1, 2, 3...) */
  splitIndex?: number
  /** TTS 오디오 데이터 (base64 인코딩된 문자열) - Step2에서 합성된 오디오를 Step3에서 사용하기 위해 저장 */
  ttsAudioBase64?: string
}

