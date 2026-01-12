import type { PublicVoiceInfo } from '@/lib/types/tts'
import type { ElevenLabsVoice } from './types'
import { TTS_LANGUAGE_CODE } from './constants'
import { PREMIUM_VOICES } from './premium-voices'

/**
 * Supabase에서 voice_id 일괄 조회
 * @param names 목소리 이름 배열
 * @returns name -> voice_id 매핑
 */
async function getVoiceIdsFromSupabase(names: string[]): Promise<Map<string, string>> {
  try {
    const { getSupabaseServiceClient } = await import('@/lib/api/supabase-server')
    const supabase = getSupabaseServiceClient()
    
    const { data, error } = await supabase
      .from('e_voices')
      .select('name, voice_id')
      .in('name', names)
    
    if (error) {
      console.error('[ElevenLabs] Supabase 조회 실패:', error)
      return new Map()
    }
    
    if (!data || data.length === 0) {
      console.warn('[ElevenLabs] Supabase에서 voice_id를 찾지 못했습니다. 스크립트를 실행하여 voice_id를 저장해주세요.')
      return new Map()
    }
    
    return new Map(data.map(r => [r.name, r.voice_id]))
  } catch (error) {
    console.error('[ElevenLabs] Supabase 조회 중 오류:', error)
    return new Map()
  }
}

/**
 * ElevenLabs 목소리 목록 조회
 * 하드코딩된 Premium 목소리 메타데이터와 Supabase의 voice_id를 결합하여 반환
 */
export async function listVoices(): Promise<ElevenLabsVoice[]> {
  console.log('[ElevenLabs] listVoices() called')
  
  try {
    // 1. 하드코딩된 메타데이터 가져오기
    const premiumVoices = PREMIUM_VOICES
    console.log(`[ElevenLabs] Loading ${premiumVoices.length} premium voices from hardcoded data`)
    
    // 2. Supabase에서 voice_id 일괄 조회 (20개만, 빠름)
    const voiceIds = await getVoiceIdsFromSupabase(premiumVoices.map(v => v.name))
    console.log(`[ElevenLabs] Retrieved ${voiceIds.size} voice IDs from Supabase`)
    
    // 3. 메타데이터와 voice_id 결합하여 ElevenLabsVoice 형식으로 반환
    const voices: ElevenLabsVoice[] = premiumVoices.map(voice => {
      const voiceId = voiceIds.get(voice.name) || ''
      
      if (!voiceId) {
        console.warn(`[ElevenLabs] Voice ID not found for ${voice.name} in Supabase`)
      }
      
      return {
        voice_id: voiceId,
        name: voice.displayName,
        // 하드코딩 데이터에 없는 필드는 undefined
        category: undefined,
        description: undefined,
        labels: undefined,
        preview_url: undefined,
        verified_languages: undefined,
      }
    })
    
    // voice_id가 있는 목소리만 반환
    const validVoices = voices.filter(v => v.voice_id)
    console.log(`[ElevenLabs] Returning ${validVoices.length} valid voices`)
    
    return validVoices
  } catch (error) {
    console.error('[ElevenLabs] Failed to list voices:', error)
    if (error instanceof Error) {
      console.error('[ElevenLabs] Error message:', error.message)
      console.error('[ElevenLabs] Error stack:', error.stack)
    }
    // 에러 발생 시 빈 배열 반환 (다른 Provider는 계속 동작)
    return []
  }
}

/**
 * ElevenLabs Voice를 PublicVoiceInfo로 변환
 */
export function toPublicVoiceInfo(v: ElevenLabsVoice): PublicVoiceInfo | null {
  if (!v.voice_id || !v.name) {
    console.warn(`[ElevenLabs] Skipping voice - missing voice_id or name:`, { voice_id: v.voice_id, name: v.name })
    return null
  }

  // gender 매핑 (하드코딩 데이터에서 직접 가져오기)
  const premiumVoice = PREMIUM_VOICES.find(pv => pv.displayName === v.name)
  const ssmlGender = premiumVoice?.gender

  return {
    name: `elevenlabs:${v.voice_id}`, // provider 구분을 위한 prefix (직렬화용)
    languageCodes: [TTS_LANGUAGE_CODE],
    ssmlGender,
    provider: 'elevenlabs' as const,
    voiceId: v.voice_id,
    displayName: v.name, // 실제 이름 (UI 표시용)
  }
}
