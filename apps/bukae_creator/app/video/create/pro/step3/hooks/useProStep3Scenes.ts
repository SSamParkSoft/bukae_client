'use client'

import { useMemo } from 'react'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'
import { getEffectiveSourceDuration } from '@/app/video/create/pro/step3/utils/proPlaybackUtils'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'

// Pro step2에서 사용하는 확장된 Scene 타입
export type ProScene = {
  id: string
  script: string
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number
  ttsAudioBase64?: string // TTS 오디오 데이터 (base64 인코딩된 문자열)
  videoUrl?: string | null
  selectionStartSeconds?: number
  selectionEndSeconds?: number
  originalVideoDurationSeconds?: number
}

// SceneScript를 ProScene으로 변환
function sceneScriptToProScene(s: SceneScript, index: number): ProScene {
  // SceneScript의 확장된 필드 확인 (localStorage에서 복원된 데이터)
  const extended = s as SceneScript & {
    id?: string
    voiceLabel?: string
    voiceTemplate?: string | null
    ttsDuration?: number
    ttsAudioBase64?: string // TTS 오디오 데이터 (base64 인코딩된 문자열)
    videoUrl?: string | null
    selectionStartSeconds?: number
    selectionEndSeconds?: number
    originalVideoDurationSeconds?: number
  }

  return {
    id: extended.id || `scene-${index}`,
    script: s.script || '',
    voiceLabel: extended.voiceLabel,
    voiceTemplate: extended.voiceTemplate,
    ttsDuration: extended.ttsDuration,
    ttsAudioBase64: extended.ttsAudioBase64, // ttsAudioBase64 포함
    videoUrl: extended.videoUrl,
    selectionStartSeconds: extended.selectionStartSeconds, // Step2에서 설정한 값 포함
    selectionEndSeconds: extended.selectionEndSeconds, // Step2에서 설정한 값 포함
    originalVideoDurationSeconds: extended.originalVideoDurationSeconds,
  }
}

/**
 * Pro step3에서 사용하는 씬 데이터 변환 훅
 * 
 * useVideoCreateStore의 scenes를 구독하고, ProScene 및 ProStep3Scene으로 변환하여 반환합니다.
 * 
 * @returns proScenes: ProScene[] - 기본 ProScene 배열
 * @returns proStep3Scenes: ProStep3Scene[] - ProStep3Scene 배열 (selectionStartSeconds, selectionEndSeconds 포함)
 */
export function useProStep3Scenes() {
  const storeScenes = useVideoCreateStore((state) => state.scenes)

  // store의 scenes를 ProScene으로 변환
  const proScenes: ProScene[] = useMemo(() => {
    const safeScenes = ensureSceneArray<SceneScript>(storeScenes)
    if (!isValidSceneArray(safeScenes)) {
      console.warn('[useProStep3Scenes] storeScenes가 배열이 아니거나 빈 배열입니다.', {
        storeScenes,
        isArray: Array.isArray(storeScenes),
        length: Array.isArray(storeScenes) ? storeScenes.length : 'N/A',
      })
      return []
    }
    return safeScenes.map((s, index) => sceneScriptToProScene(s, index))
  }, [storeScenes])

  // ProStep3Scene으로 변환 (Step2에서 설정한 selectionStartSeconds, selectionEndSeconds 사용)
  const proStep3Scenes: ProStep3Scene[] = useMemo(() => {
    // proScenes가 배열이 아니거나 빈 배열이면 빈 배열 반환
    if (!isValidSceneArray(proScenes)) {
      return []
    }
    return proScenes.map((scene) => {
      const ttsDuration = scene.ttsDuration || 10
      
      // Step2에서 설정한 값이 있으면 그대로 사용, 없으면 기본값 사용
      // selectionStartSeconds가 없으면 0부터 시작
      const selectionStartSeconds = scene.selectionStartSeconds ?? 0

      const originalDuration = scene.originalVideoDurationSeconds ?? 0
      const isExtended = originalDuration > 0 && originalDuration < ttsDuration
      const effectiveSourceDuration = isExtended
        ? getEffectiveSourceDuration(ttsDuration, originalDuration)
        : originalDuration > 0 ? originalDuration : ttsDuration

      // 확장 모드(원본 < TTS)일 때: 저장된 선택이 원본 한 번 분량 이하면 TTS 길이만큼 격자로 확장 (UI가 확장 타임라인 전체에서 0~TTS 선택하도록)
      const storedEnd = scene.selectionEndSeconds
      const selectionSpan = storedEnd != null && storedEnd > selectionStartSeconds ? storedEnd - selectionStartSeconds : 0
      const shouldExpandToTts =
        isExtended &&
        (storedEnd == null || storedEnd <= selectionStartSeconds || selectionSpan <= originalDuration)

      const selectionEndSeconds = shouldExpandToTts
        ? selectionStartSeconds + Math.min(ttsDuration, effectiveSourceDuration)
        : storedEnd != null && storedEnd > selectionStartSeconds
          ? storedEnd
          : selectionStartSeconds + ttsDuration

      if (scene.selectionEndSeconds != null && scene.selectionEndSeconds <= selectionStartSeconds && !shouldExpandToTts) {
        console.warn('[useProStep3Scenes] selectionEndSeconds가 유효하지 않아 기본값으로 대체:', {
          sceneId: scene.id,
          storedSelectionEndSeconds: scene.selectionEndSeconds,
          selectionStartSeconds,
          fallback: selectionStartSeconds + ttsDuration,
        })
      }

      return {
        id: scene.id,
        script: scene.script,
        videoUrl: scene.videoUrl,
        selectionStartSeconds,
        selectionEndSeconds,
        originalVideoDurationSeconds: scene.originalVideoDurationSeconds,
        voiceLabel: scene.voiceLabel,
        voiceTemplate: scene.voiceTemplate,
        ttsDuration,
        ttsAudioBase64: scene.ttsAudioBase64,
      }
    })
  }, [proScenes])

  return {
    proScenes,
    proStep3Scenes,
  }
}
