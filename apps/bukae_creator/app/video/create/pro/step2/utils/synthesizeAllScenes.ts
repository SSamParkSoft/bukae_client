import { authStorage } from '@/lib/api/auth-storage'

export interface SceneTtsData {
  script: string
  voiceTemplate: string | null
}

export interface SynthesizeSceneResult {
  success: boolean
  error?: string
  duration?: number
  audioBlob?: Blob
}

/**
 * 단일 씬의 TTS를 합성합니다.
 */
async function synthesizeScene(
  script: string,
  voiceTemplate: string | null
): Promise<SynthesizeSceneResult> {
  if (!script.trim()) {
    return { success: false, error: '스크립트가 비어있습니다.' }
  }

  if (!voiceTemplate) {
    return { success: false, error: '보이스가 선택되지 않았습니다.' }
  }

  const accessToken = authStorage.getAccessToken()
  if (!accessToken) {
    return { success: false, error: '로그인이 필요합니다.' }
  }

  try {
    const response = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        voiceTemplate,
        mode: 'text',
        text: script,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'TTS 합성 실패' }))
      return { success: false, error: errorData.error || 'TTS 합성 실패' }
    }

    const blob = await response.blob()
    
    // 오디오 duration 계산 (간단한 추정)
    const audio = new Audio(URL.createObjectURL(blob))
    const duration = await new Promise<number>((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration)
        URL.revokeObjectURL(audio.src)
      })
      audio.addEventListener('error', () => {
        resolve(0)
        URL.revokeObjectURL(audio.src)
      })
    })

    return {
      success: true,
      duration,
      audioBlob: blob,
    }
  } catch (error) {
    console.error('TTS 합성 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'TTS 합성 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 모든 씬에 대해 TTS 합성을 수행합니다.
 * 배치 처리로 레이트 리밋을 방지합니다.
 */
export async function synthesizeAllScenes(
  scenes: SceneTtsData[],
  onProgress?: (completed: number, total: number) => void
): Promise<{
  success: boolean
  error?: string
  results: Array<{ success: boolean; duration?: number; error?: string }>
}> {
  const results: Array<{ success: boolean; duration?: number; error?: string }> = []
  
  // 배치 크기: 한 번에 3개씩 처리 (레이트 리밋 방지)
  const BATCH_SIZE = 3
  const BATCH_DELAY = 1000 // 배치 간 딜레이 1초

  for (let i = 0; i < scenes.length; i += BATCH_SIZE) {
    const batch = scenes.slice(i, i + BATCH_SIZE)
    
    // 배치 내 씬들을 병렬 처리
    const batchPromises = batch.map(async (scene) => {
      const result = await synthesizeScene(scene.script, scene.voiceTemplate)
      return {
        success: result.success,
        duration: result.duration,
        error: result.error,
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // 진행 상황 업데이트
    onProgress?.(results.length, scenes.length)

    // 배치 간 딜레이 (마지막 배치가 아니면)
    if (i + BATCH_SIZE < scenes.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
    }
  }

  // 실패한 씬이 있는지 확인
  const failedScenes = results.filter((r) => !r.success)
  if (failedScenes.length > 0) {
    const errorMessages = failedScenes.map((r, idx) => {
      const sceneIndex = results.indexOf(r) + 1
      return `씬 ${sceneIndex}: ${r.error || '알 수 없는 오류'}`
    })
    return {
      success: false,
      error: `다음 씬들의 TTS 합성에 실패했습니다:\n${errorMessages.join('\n')}`,
      results,
    }
  }

  return {
    success: true,
    results,
  }
}
