import { buildSceneMarkup, makeTtsKey } from '@/lib/utils/tts'
import { getMp3DurationSec } from '@/lib/utils/audio'
import { authStorage } from '@/lib/api/auth-storage'
import type { TimelineData } from '@/store/useVideoCreateStore'

export interface TtsPart {
  blob: Blob
  durationSec: number
  url: string | null
  partIndex: number
  markup: string
}

export interface EnsureSceneTtsResult {
  sceneIndex: number
  parts: TtsPart[]
}

export interface EnsureSceneTtsParams {
  timeline: TimelineData
  sceneIndex: number
  voiceTemplate: string
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null; sceneId?: number; sceneIndex?: number }>>
  ttsInFlightRef: React.MutableRefObject<Map<string, Promise<{ blob: Blob; durationSec: number; markup: string; url?: string | null; sceneId?: number; sceneIndex?: number }>>>
  changedScenesRef: React.MutableRefObject<Set<number>>
  setSceneDurationFromAudio: (sceneIndex: number, durationSec: number) => void
  signal?: AbortSignal
  forceRegenerate?: boolean
}

/**
 * 씬의 TTS를 생성하고 캐시에 저장합니다.
 * 캐시 확인, 업로드, 다운로드, TTS 합성 등의 로직을 포함합니다.
 */
export async function ensureSceneTts({
  timeline,
  sceneIndex,
  voiceTemplate,
  ttsCacheRef,
  ttsInFlightRef,
  changedScenesRef,
  setSceneDurationFromAudio,
  signal,
  forceRegenerate = false,
}: EnsureSceneTtsParams): Promise<EnsureSceneTtsResult> {
  if (!timeline) throw new Error('timeline이 없습니다.')
  if (!voiceTemplate) throw new Error('목소리를 먼저 선택해주세요.')

  const scene = timeline.scenes[sceneIndex]
  if (!scene) throw new Error(`씬 ${sceneIndex}을 찾을 수 없습니다.`)

  const markups = buildSceneMarkup(timeline, sceneIndex)
  if (markups.length === 0) throw new Error('씬 대본이 비어있습니다.')

  const accessToken = authStorage.getAccessToken()
  if (!accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  // 변경된 씬이면 강제 재생성
  const isChanged = forceRegenerate || changedScenesRef.current.has(sceneIndex)
  if (isChanged) {
    // 변경된 씬의 모든 캐시 무효화
    markups.forEach((markup) => {
      const key = makeTtsKey(voiceTemplate, markup)
      ttsCacheRef.current.delete(key)
    })
    // 변경 상태는 모든 구간 처리 완료 후 제거 (아래에서 처리)
  }

  // 각 구간별로 TTS 생성 및 업로드 (순차적으로 처리하여 파일이 준비되는 대로 반환)
  const parts: TtsPart[] = []
  
  // 순차적으로 처리하여 각 파일이 준비되는 대로 parts에 추가
  for (let partIndex = 0; partIndex < markups.length; partIndex++) {
    const markup = markups[partIndex]
    const part = await (async (): Promise<TtsPart> => {
      const key = makeTtsKey(voiceTemplate, markup)

      // 강제 재생성이면 캐시와 저장소 다운로드 모두 스킵하고 바로 TTS 생성
      if (isChanged) {
        // 바로 TTS 생성으로 진행 (아래로 계속)
      } else {
        // 강제 재생성이 아니면 캐시 확인
        const cached = ttsCacheRef.current.get(key)
        if (cached) {
          // 캐시된 경우에도 URL이 있는지 확인하고 없으면 업로드
          let url = cached.url || null
          let blob = cached.blob || null
          
          if (!url && blob) {
            // blob은 있지만 URL이 없으면 업로드
            const formData = new FormData()
            formData.append('file', blob, `scene_${sceneIndex}_part${partIndex + 1}.mp3`)
            formData.append('sceneIndex', String(sceneIndex))
            formData.append('partIndex', String(partIndex))
            formData.append('sceneId', String(scene.sceneId))

            try {
              const uploadRes = await fetch('/api/media/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
              })

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json()
                url = uploadData.url || null
                // 캐시 업데이트
                ttsCacheRef.current.set(key, { ...cached, url })
              }
            } catch (error) {
              // 업로드 실패 무시
            }
          } else if (url && !blob) {
            // URL은 있지만 blob이 없으면 저장소에서 다운로드
            try {
              const downloadRes = await fetch(url)
              if (downloadRes.ok) {
                blob = await downloadRes.blob()
                const durationSec = await getMp3DurationSec(blob)
                // 캐시 업데이트 (blob 추가)
                ttsCacheRef.current.set(key, { ...cached, blob, durationSec, url })
              }
            } catch (error) {
              // 다운로드 실패 무시
            }
          }

          // blob이 없으면 null 반환하여 재생성 유도
          if (!blob) {
            // 캐시에서 삭제하여 재생성 유도
            ttsCacheRef.current.delete(key)
          } else {
            return {
              blob,
              durationSec: cached.durationSec || 0,
              url,
              partIndex,
              markup,
            }
          }
        }

        // 진행 중인 요청 확인
        const inflight = ttsInFlightRef.current.get(key)
        if (inflight) {
          const result = await inflight
          return {
            blob: result.blob,
            durationSec: result.durationSec,
            url: result.url || null,
            partIndex,
            markup,
          }
        }

        // 저장소에서 파일 경로를 추측해서 다운로드하는 로직 제거
        // 이제는 업로드 후 반환되는 URL만 사용 (랜덤 파일 이름 사용)
      }

      // 진행 중인 요청 확인
      const inflight = ttsInFlightRef.current.get(key)
      if (inflight) {
        const result = await inflight
        return {
          blob: result.blob,
          durationSec: result.durationSec,
          url: result.url || null,
          partIndex,
          markup,
        }
      }

      // 저장소에서 파일 경로를 추측해서 다운로드하는 로직 제거
      // 이제는 업로드 후 반환되는 URL만 사용 (랜덤 파일 이름 사용)

      // 강제 재생성이거나 저장소에 파일이 없으면 TTS 생성
      const p = (async () => {
        // voiceTemplate에서 provider 정보 확인 (로깅용)
        const { voiceTemplateHelpers } = await import('@/store/useVideoCreateStore')
        const voiceInfo = voiceTemplateHelpers.getVoiceInfo(voiceTemplate)
        if (voiceInfo) {
          console.log(`[ensureSceneTts] Scene ${sceneIndex}, Part ${partIndex}: Provider=${voiceInfo.provider}, VoiceId=${voiceInfo.voiceId}`)
        }

        const res = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          signal,
          body: JSON.stringify({
            voiceTemplate: voiceTemplate,
            mode: 'markup',
            markup,
          }),
        })

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
          const errorMessage = data?.error || data?.message || 'TTS 합성 실패'
          const error = new Error(errorMessage)
          if (res.status === 429) {
            (error as any).isRateLimit = true
          }
          throw error
        }

        const blob = await res.blob()
        const durationSec = await getMp3DurationSec(blob)

        // Provider 정보 확인 (응답 헤더에서)
        const providerHeader = res.headers.get('X-TTS-Provider')
        if (providerHeader) {
          console.log(`[ensureSceneTts] TTS 합성 완료: Provider=${providerHeader}, Duration=${durationSec.toFixed(2)}s`)
        }

        // Supabase 업로드
        let url: string | null = null
        try {
          const formData = new FormData()
          // 파일 이름은 업로드 API에서 TTS 형식으로 생성 (타임스탬프_scene_{sceneId}_scene_{sceneId}_voice.mp3)
          formData.append('file', blob)
          formData.append('sceneId', String(scene.sceneId))
          
          if (voiceInfo) {
            // Provider 정보를 메타데이터로 전달 (로깅용, 선택사항)
            console.log(`[ensureSceneTts] Supabase 업로드 시작: Provider=${voiceInfo.provider}, SceneId=${scene.sceneId}`)
          }

          const uploadRes = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
          })

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            url = uploadData.url || null
            
            // 업로드 후 저장소에서 다운로드해서 캐시에 저장 (최신 파일 보장)
            // 다운로드는 선택적이므로 실패해도 생성한 blob 사용
            if (url) {
              try {
                // URL이 유효한지 확인
                if (url.startsWith('http://') || url.startsWith('https://')) {
                  const downloadRes = await fetch(url, {
                    method: 'GET',
                    headers: {
                      'Accept': 'audio/mpeg, audio/*, */*',
                    },
                  })
                  if (downloadRes.ok) {
                    const downloadedBlob = await downloadRes.blob()
                    const downloadedDurationSec = await getMp3DurationSec(downloadedBlob)
                    
                    // 캐시에 저장 (다운로드한 파일 사용)
                    const entry = { 
                      blob: downloadedBlob, 
                      durationSec: downloadedDurationSec, 
                      markup, 
                      url, 
                      sceneId: scene.sceneId, 
                      sceneIndex 
                    }
                    ttsCacheRef.current.set(key, entry)
                    return entry
                  }
                }
              } catch (downloadError) {
                // 다운로드 실패 무시 (생성한 blob 사용)
              }
            }
          }
        } catch (error) {
          // 업로드 실패 무시
        }

        // 업로드 실패하거나 다운로드 실패한 경우 생성한 blob 사용
        const entry = { blob, durationSec, markup, url, sceneId: scene.sceneId, sceneIndex }
        ttsCacheRef.current.set(key, entry)
        return entry
      })().finally(() => {
        ttsInFlightRef.current.delete(key)
      })

      ttsInFlightRef.current.set(key, p)
      const result = await p

      return {
        blob: result.blob,
        durationSec: result.durationSec,
        url: result.url || null,
        partIndex,
        markup,
      }
    })()

    parts.push(part)
  }

  // 전체 씬 duration 업데이트 (모든 구간의 duration 합)
  const totalDuration = parts.reduce((sum, part) => sum + part.durationSec, 0)
  if (totalDuration > 0) {
    setSceneDurationFromAudio(sceneIndex, totalDuration)
  }

  // 변경 상태 제거 (모든 구간 처리 완료 후)
  if (isChanged) {
    changedScenesRef.current.delete(sceneIndex)
  }

  return {
    sceneIndex,
    parts,
  }
}

