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
  /** @deprecated 전역 voiceTemplate은 더 이상 사용하지 않습니다. 각 씬의 scene.voiceTemplate만 사용합니다. */
  voiceTemplate?: string
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

  const scene = timeline.scenes[sceneIndex]
  if (!scene) throw new Error(`씬 ${sceneIndex}을 찾을 수 없습니다.`)

  // 씬별 voiceTemplate만 사용 (전역 voiceTemplate fallback 제거)
  const sceneVoiceTemplate = scene.voiceTemplate
  if (!sceneVoiceTemplate || sceneVoiceTemplate.trim() === '') {
    throw new Error(`씬 ${sceneIndex + 1}에 보이스를 먼저 선택해주세요.`)
  }

  const markups = buildSceneMarkup(timeline, sceneIndex)
  if (markups.length === 0) throw new Error('씬 대본이 비어있습니다.')

  const accessToken = authStorage.getAccessToken()
  if (!accessToken) {
    throw new Error('로그인이 필요합니다.')
  }

  // 변경된 씬이면 강제 재생성
  const isChanged = forceRegenerate || changedScenesRef.current.has(sceneIndex)
  if (isChanged) {
    // 변경된 씬의 모든 캐시 무효화 (씬별 voiceTemplate 사용)
    markups.forEach((markup) => {
      const key = makeTtsKey(sceneVoiceTemplate, markup)
      ttsCacheRef.current.delete(key)
    })
    // 변경 상태는 모든 구간 처리 완료 후 제거 (아래에서 처리)
  }

  // 각 구간별로 TTS 생성 및 업로드 (병렬 처리로 최적화)
  // 동시 요청 수를 제한하여 레이트 리밋 및 브라우저 연결 제한 고려
  // 브라우저는 도메인당 보통 6개 동시 연결만 허용하므로, 레이트 리밋(10개/분)과 함께 고려하여 5개로 제한
  const MAX_CONCURRENT_PARTS = 5
  
  // 배치로 나눠서 처리 (동시 요청 수 제한)
  const allParts: TtsPart[] = []
  
  for (let i = 0; i < markups.length; i += MAX_CONCURRENT_PARTS) {
    const batch = markups.slice(i, i + MAX_CONCURRENT_PARTS)
    const batchPromises = batch.map(async (markup, batchIndex): Promise<TtsPart> => {
      const partIndex = i + batchIndex
      const key = makeTtsKey(sceneVoiceTemplate, markup)

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
              console.error('[ensureSceneTts] 업로드 실패:', error)
              alert('파일 업로드에 실패했습니다. 개발자에게 문의해주세요.')
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
              console.error('[ensureSceneTts] 다운로드 실패:', error)
              alert('파일 다운로드에 실패했습니다. 개발자에게 문의해주세요.')
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

      // 진행 중인 요청 확인 (중복 체크)
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

      // 강제 재생성이거나 저장소에 파일이 없으면 TTS 생성 (직접 API 호출로 병렬 처리 보장)
      // promise를 즉시 생성하고 시작 (병렬 처리 보장)
      const p = (async () => {
        // 1. TTS 합성 API 호출 (직접 fetch로 병렬 처리 보장)
        const synthesizeRes = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            voiceTemplate: sceneVoiceTemplate,
            mode: 'markup',
            markup,
          }),
          signal,
        })

        if (!synthesizeRes.ok) {
          const errorData = await synthesizeRes.json().catch(() => ({ error: 'TTS 합성 실패' }))
          const error = new Error(errorData.error || 'TTS 합성 실패')
          if (synthesizeRes.status === 429) {
            ;(error as Error & { isRateLimit?: boolean }).isRateLimit = true
          }
          throw error
        }

        // 2. 오디오 blob 받기
        const blob = await synthesizeRes.blob()
        const durationSec = await getMp3DurationSec(blob)

        // 3. Supabase 업로드 (병렬 처리 가능하지만 여기서는 순차 처리)
        let url: string | null = null
        try {
          const formData = new FormData()
          formData.append('file', blob, `scene_${sceneIndex}_part${partIndex + 1}.mp3`)
          formData.append('sceneIndex', String(sceneIndex))
          formData.append('partIndex', String(partIndex))
          formData.append('sceneId', String(scene.sceneId))

          const uploadRes = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
            signal,
          })

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json()
            url = uploadData.url || null
          } else {
            console.error('[ensureSceneTts] 업로드 실패:', uploadRes.status, uploadRes.statusText)
            alert('파일 업로드에 실패했습니다. 개발자에게 문의해주세요.')
          }
        } catch (uploadError) {
          console.error('[ensureSceneTts] 업로드 실패:', uploadError)
          alert('파일 업로드에 실패했습니다. 개발자에게 문의해주세요.')
        }

        // 캐시에 저장
        const entry = { 
          blob, 
          durationSec, 
          markup, 
          url, 
          sceneId: scene.sceneId, 
          sceneIndex 
        }
        ttsCacheRef.current.set(key, entry)
        
        // 디버깅: 캐시 저장 확인
        
        return entry
      })().finally(() => {
        ttsInFlightRef.current.delete(key)
      })

      // promise를 즉시 시작하고 ttsInFlightRef에 저장 (병렬 처리 보장)
      ttsInFlightRef.current.set(key, p)
      
      // promise를 즉시 반환 (진짜 병렬 처리)
      return p.then((result) => ({
        blob: result.blob,
        durationSec: result.durationSec,
        url: result.url || null,
        partIndex,
        markup,
      }))
    })
    
    // 배치 내의 모든 promise를 동시에 시작하고 완료 대기
    const batchResults = await Promise.all(batchPromises)
    allParts.push(...batchResults)
  }

  // 모든 part를 배치별로 순차 처리 (배치 내에서는 병렬)
  const parts: TtsPart[] = allParts
  
  // partIndex 순서대로 정렬 (원래 순서 유지)
  parts.sort((a: TtsPart, b: TtsPart) => a.partIndex - b.partIndex)
  
  // 최종 duration만 업데이트 (병렬 처리로 모든 part가 동시에 완료되므로)
  // 각 part 완료 시마다 업데이트하는 것은 불필요 (성능 최적화)

  // 최종 duration 업데이트 (모든 구간의 duration 합)
  const totalDuration = parts.reduce((sum: number, part: TtsPart) => sum + part.durationSec, 0)
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

