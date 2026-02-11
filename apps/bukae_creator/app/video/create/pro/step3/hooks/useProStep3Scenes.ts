'use client'

import { useMemo } from 'react'
import { useVideoCreateStore, type SceneScript } from '@/store/useVideoCreateStore'
import { ensureSceneArray, isValidSceneArray } from '@/app/video/create/_utils/scene-array'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/components/ProSceneListPanel'

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
  }

  // 디버깅: Step2에서 설정한 selection 값 확인
  if (index === 0) {
    console.log('[useProStep3Scenes] sceneScriptToProScene 변환:', {
      index,
      hasSelectionStartSeconds: extended.selectionStartSeconds !== undefined,
      selectionStartSeconds: extended.selectionStartSeconds,
      hasSelectionEndSeconds: extended.selectionEndSeconds !== undefined,
      selectionEndSeconds: extended.selectionEndSeconds,
      script: s.script?.substring(0, 30),
    })
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

  // ProStep3Scene으로 변환 (selectionStartSeconds, selectionEndSeconds는 기본값 사용)
  const proStep3Scenes: ProStep3Scene[] = useMemo(() => {
    // proScenes가 배열이 아니거나 빈 배열이면 빈 배열 반환
    if (!isValidSceneArray(proScenes)) {
      return []
    }
    return proScenes.map((scene, index) => {
      const extended = scene as ProScene & {
        selectionStartSeconds?: number
        selectionEndSeconds?: number
      }

      // selectionStartSeconds와 selectionEndSeconds가 없으면 기본값 사용
      // ttsDuration을 기준으로 선택 영역 설정 (0부터 ttsDuration까지)
      const ttsDuration = scene.ttsDuration || 10
      // ProScene에서 이미 selectionStartSeconds와 selectionEndSeconds를 포함하고 있으므로 그대로 사용
      const selectionStartSeconds = scene.selectionStartSeconds ?? 0
      const selectionEndSeconds = scene.selectionEndSeconds ?? ttsDuration

      // 디버깅: ProStep3Scene 변환 시 selection 값 확인
      if (index === 0) {
        console.log('[useProStep3Scenes] ProStep3Scene 변환:', {
          index,
          sceneSelectionStartSeconds: scene.selectionStartSeconds,
          sceneSelectionEndSeconds: scene.selectionEndSeconds,
          finalSelectionStartSeconds: selectionStartSeconds,
          finalSelectionEndSeconds: selectionEndSeconds,
          script: scene.script?.substring(0, 30),
        })
      }

      return {
        id: scene.id,
        script: scene.script,
        videoUrl: scene.videoUrl,
        selectionStartSeconds, // Step2에서 설정한 값 사용
        selectionEndSeconds, // Step2에서 설정한 값 사용
        voiceLabel: scene.voiceLabel,
        voiceTemplate: scene.voiceTemplate,
        ttsDuration: scene.ttsDuration,
        ttsAudioBase64: scene.ttsAudioBase64, // ttsAudioBase64 포함
      }
    })
  }, [proScenes])

  return {
    proScenes,
    proStep3Scenes,
  }
}
