'use server'

import { getUserFromAccessToken } from '@/lib/api/supabase-server'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { getProvider } from '@/lib/tts/core/factory'
import { enforceTtsDailyQuota, enforceCreditQuota } from '@/lib/api/rate-limit'

// 서버 액션에서 사용할 인증 함수 (route-guard의 로직 재사용)
async function getUserIdFromAccessToken(accessToken: string): Promise<string | null> {
  // 개발 환경에서 mock 테스트 계정 토큰 허용
  const isLocalhost = process.env.NODE_ENV === 'development'
  if (isLocalhost && accessToken.startsWith('dev_test_admin_token_')) {
    return 'dev-test-admin-id'
  }

  // Supabase 토큰 검증
  const supabaseUser = await getUserFromAccessToken(accessToken)
  if (supabaseUser) {
    return supabaseUser.id
  }

  // 백엔드 OAuth 토큰 검증
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  const API_BASE_URL = envUrl || (isLocalhost ? 'http://15.164.220.105.nip.io:8080' : null)

  if (!API_BASE_URL) {
    return null
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      return null
    }
    const data = (await res.json().catch(() => null)) as { id?: unknown } | null
    const id = typeof data?.id === 'string' ? data.id : null
    return id && id.trim() ? id.trim() : null
  } catch {
    return null
  }
}

export interface SynthesizeAndUploadTtsParams {
  accessToken: string
  voiceTemplate: string
  markup: string
  sceneId?: number
}

export type SynthesizeAndUploadTtsResult =
  | {
      success: true
      url: string
      blobBase64: string // base64 인코딩된 blob (다운로드 단계 제거를 위해)
    }
  | {
      success: false
      error: string
      isRateLimit?: boolean
    }

/**
 * 서버 액션: TTS 합성 및 Supabase 업로드
 * 클라이언트에서 호출하면 서버에서 TTS 합성과 업로드를 모두 처리하고 URL만 반환
 */
export async function synthesizeAndUploadTts({
  accessToken,
  voiceTemplate,
  markup,
  sceneId,
}: SynthesizeAndUploadTtsParams): Promise<SynthesizeAndUploadTtsResult> {
  try {
    // 인증 확인
    const userId = await getUserIdFromAccessToken(accessToken)
    if (!userId) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // VoiceInfo 파싱
    const voiceInfo = voiceTemplateHelpers.getVoiceInfo(voiceTemplate)
    if (!voiceInfo) {
      return { success: false, error: '유효하지 않은 목소리 정보입니다.' }
    }

    const inputText = markup.trim()
    if (!inputText) {
      return { success: false, error: 'markup이 필요합니다.' }
    }

    // Provider별 쿼터 체크
    const quotaBlocked = await enforceTtsDailyQuota({
      userId,
      charCount: inputText.length,
      provider: voiceInfo.provider,
    })
    if (quotaBlocked) {
      let errorMessage = '쿼터 초과'
      if (quotaBlocked instanceof Response) {
        try {
          const data = await quotaBlocked.json()
          errorMessage = data.error || errorMessage
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
      }
      return { 
        success: false, 
        error: errorMessage,
        isRateLimit: true 
      }
    }

    // 크레딧 차감 체크
    const creditBlocked = await enforceCreditQuota({
      userId,
      provider: voiceInfo.provider,
      charCount: inputText.length,
      accessToken,
    })
    if (creditBlocked) {
      let errorMessage = '크레딧 부족'
      if (creditBlocked instanceof Response) {
        try {
          const data = await creditBlocked.json()
          errorMessage = data.error || errorMessage
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }
      }
      return { 
        success: false, 
        error: errorMessage
      }
    }

    // TTS 합성
    const provider = getProvider(voiceInfo.provider)
    const result = await provider.synthesize({
      voiceId: voiceInfo.voiceId,
      markup: inputText,
      mode: 'markup',
    })

    const audioBuffer = result.audio
    const uint8Array = new Uint8Array(audioBuffer)

    // base64 인코딩 (즉시 처리)
    const base64 = Buffer.from(uint8Array).toString('base64')

    // Supabase 업로드 (병렬로 처리하되, 클라이언트는 base64로 즉시 진행 가능)
    const supabase = getSupabaseServiceClient()
    const timestamp = Date.now()
    const sceneIdValue = sceneId || 'unknown'
    const fileName = `${timestamp}_scene_${sceneIdValue}_scene_${sceneIdValue}_voice.mp3`
    const filePath = `tts/${userId}/${fileName}`

    // Buffer를 File로 변환
    const file = new File([uint8Array], fileName, {
      type: 'audio/mpeg',
    })

    // 업로드 시작 (비동기로 처리하되, URL은 나중에 필요할 수 있으므로 await)
    const uploadPromise = supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    // 업로드 완료 대기
    const uploadResult = await uploadPromise

    if (uploadResult.error) {
      console.error('[Server Action] Supabase 파일 업로드 실패:', uploadResult.error)
      return { success: false, error: `파일 업로드 실패: ${uploadResult.error.message}` }
    }

    const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath)

    if (!publicUrlData.publicUrl) {
      return { success: false, error: '업로드된 파일의 공개 URL을 가져올 수 없어요.' }
    }

    return {
      success: true,
      url: publicUrlData.publicUrl,
      blobBase64: base64, // base64 인코딩된 blob 반환 (클라이언트에서 즉시 사용 가능)
    }
  } catch (error) {
    console.error('[Server Action] TTS 합성 및 업로드 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'TTS 합성 중 오류가 발생했어요.',
    }
  }
}
