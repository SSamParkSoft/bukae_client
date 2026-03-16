import type { SceneScript } from '@/store/useVideoCreateStore'

/**
 * Pro step2에서 사용하는 확장된 Scene 타입
 * (대본 작성 페이지와 편집 페이지 공통)
 */
export type ProScene = {
  id: string // 고유 ID (드래그 앤 드롭 시 안정적인 key를 위해)
  script: string
  /** 촬영 지문(액션 가이드) - 2단계 API에서 생성 */
  actionGuide?: string
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number // TTS duration (초)
  ttsAudioBase64?: string // TTS 오디오 데이터 (base64 인코딩된 문자열) - Step2에서 합성된 오디오를 Step3에서 사용하기 위해 저장
  /** ttsAudioBase64가 생성될 당시의 스크립트 (캐시 유효성 검사용) */
  ttsGeneratedFromScript?: string
  /** ttsAudioBase64가 생성될 당시의 보이스 템플릿 (캐시 유효성 검사용) */
  ttsGeneratedFromVoiceTemplate?: string | null
  videoUrl?: string | null // 업로드된 영상 URL
  imageUrl?: string | null // 업로드된 이미지 URL
  selectionStartSeconds?: number // 격자 선택 영역 시작 시간 (초)
  selectionEndSeconds?: number // 격자 선택 영역 끝 시간 (초)
  /** 업로드된 원본 영상 길이(초). TTS보다 짧을 때 이어붙여 격자 배경 길이 계산용 (Step3) */
  originalVideoDurationSeconds?: number
  /** AI 스크립트 생성 버튼으로 생성된 경우 true (teal 뱃지 표시용) */
  scriptGeneratedByAi?: boolean
  /** AI 촬영가이드 생성 버튼으로 생성된 경우 true (teal 뱃지 표시용) */
  guideGeneratedByAi?: boolean
}

/**
 * 확장된 SceneScript 타입 (store 저장용)
 */
export type ExtendedSceneScript = SceneScript & {
  id?: string // 고유 ID (드래그 앤 드롭 시 안정적인 key를 위해)
  actionGuide?: string // 촬영 지문(액션 가이드)
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number // TTS duration (초)
  ttsAudioBase64?: string // TTS 오디오 데이터 (base64 인코딩된 문자열) - Step2에서 합성된 오디오를 Step3에서 사용하기 위해 저장
  ttsGeneratedFromScript?: string
  ttsGeneratedFromVoiceTemplate?: string | null
  videoUrl?: string | null // 업로드된 영상 URL
  imageUrl?: string | null // 업로드된 이미지 URL
  selectionStartSeconds?: number // 격자 선택 영역 시작 시간 (초)
  selectionEndSeconds?: number // 격자 선택 영역 끝 시간 (초)
  originalVideoDurationSeconds?: number
}

/**
 * 고유 ID 생성 헬퍼 함수
 */
export function generateSceneId(): string {
  return `scene-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * SceneScript를 ProScene으로 변환
 */
export function sceneScriptToProScene(s: SceneScript, _index: number): ProScene {
  const extended = s as ExtendedSceneScript
  return {
    id: extended.id || generateSceneId(), // 기존 ID가 없으면 새로 생성
    script: s.script || '',
    actionGuide: extended.actionGuide,
    voiceLabel: extended.voiceLabel,
    voiceTemplate: extended.voiceTemplate,
    ttsDuration: extended.ttsDuration,
    ttsAudioBase64: extended.ttsAudioBase64,
    ttsGeneratedFromScript: extended.ttsGeneratedFromScript,
    ttsGeneratedFromVoiceTemplate: extended.ttsGeneratedFromVoiceTemplate,
    videoUrl: extended.videoUrl,
    imageUrl: extended.imageUrl,
    selectionStartSeconds: extended.selectionStartSeconds,
    selectionEndSeconds: extended.selectionEndSeconds,
    originalVideoDurationSeconds: extended.originalVideoDurationSeconds,
    scriptGeneratedByAi: s.isAiGenerated === true,
    guideGeneratedByAi: s.guideGeneratedByAi === true,
  }
}

/**
 * ProScene을 SceneScript로 변환
 */
export function proSceneToSceneScript(s: ProScene, index: number): ExtendedSceneScript {
  return {
    sceneId: index + 1,
    id: s.id, // 고유 ID 유지
    script: s.script,
    actionGuide: s.actionGuide,
    voiceLabel: s.voiceLabel,
    voiceTemplate: s.voiceTemplate,
    ttsDuration: s.ttsDuration,
    ttsAudioBase64: s.ttsAudioBase64,
    ttsGeneratedFromScript: s.ttsGeneratedFromScript,
    ttsGeneratedFromVoiceTemplate: s.ttsGeneratedFromVoiceTemplate,
    videoUrl: s.videoUrl,
    imageUrl: s.imageUrl ?? undefined,
    selectionStartSeconds: s.selectionStartSeconds,
    selectionEndSeconds: s.selectionEndSeconds,
    originalVideoDurationSeconds: s.originalVideoDurationSeconds,
    isAiGenerated: s.scriptGeneratedByAi === true,
    guideGeneratedByAi: s.guideGeneratedByAi === true,
  }
}
