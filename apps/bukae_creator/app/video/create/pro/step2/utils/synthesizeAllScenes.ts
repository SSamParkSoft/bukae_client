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
  audioBase64?: string // base64 인코딩된 오디오 데이터 (Step3에서 사용하기 위해)
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

    // blob을 base64로 변환 (Step3에서 사용하기 위해)
    let audioBase64: string | undefined
    try {
      audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result
          if (typeof result === 'string') {
            // data:audio/...;base64, 부분을 제거하고 순수 base64 문자열만 반환
            const base64String = result.split(',')[1]
            if (!base64String) {
              reject(new Error('base64 문자열 추출 실패'))
              return
            }
            resolve(base64String)
          } else {
            reject(new Error('FileReader 결과가 문자열이 아닙니다.'))
          }
        }
        reader.onerror = (error) => {
          console.error('[synthesizeScene] FileReader 오류:', error)
          reject(new Error('FileReader 오류'))
        }
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('[synthesizeScene] base64 변환 실패:', error)
      // base64 변환 실패해도 TTS 합성 자체는 성공한 것으로 처리
      // 하지만 audioBase64는 undefined로 남김
    }

    return {
      success: true,
      duration,
      audioBlob: blob,
      audioBase64,
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
  results: Array<{ success: boolean; duration?: number; error?: string; audioBase64?: string }>
}> {
  const results: Array<{ success: boolean; duration?: number; error?: string; audioBase64?: string }> = []
  
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
        audioBase64: result.audioBase64,
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
