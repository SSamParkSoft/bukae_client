/**
 * Premium 목소리 voice_id 찾기 및 Supabase 저장 스크립트
 * 
 * 실행 방법: pnpm tsx scripts/find-premium-voice-ids.ts
 * 
 * 이 스크립트는:
 * 1. ElevenLabs API를 호출하여 Premium 목소리들의 voice_id를 찾습니다
 * 2. 찾은 voice_id를 Supabase e_voices 테이블에 저장/업데이트합니다
 */

// .env.local 파일 로드
import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local 파일 경로 설정
const envPath = resolve(__dirname, '../.env.local')
config({ path: envPath })

import { PREMIUM_VOICES } from '../lib/tts/providers/elevenlabs/premium-voices'
import { getElevenLabsClient } from '../lib/tts/providers/elevenlabs/client'
import { getSupabaseServiceClient } from '../lib/api/supabase-server'

/**
 * Premium 목소리 이름 목록 (첫 부분만 매칭)
 */
const PREMIUM_VOICE_NAMES = PREMIUM_VOICES.map(v => v.name.toLowerCase())

async function findPremiumVoiceIds(): Promise<Map<string, string>> {
  console.log('[Find Voice IDs] Starting to find premium voice IDs...')
  console.log(`[Find Voice IDs] Looking for ${PREMIUM_VOICE_NAMES.length} premium voices`)
  
  const client = getElevenLabsClient()
  const foundVoiceIds = new Map<string, string>()
  
  // Step 1: search API로 Premium 목소리들의 voice_id 찾기
  let nextPageToken: string | null | undefined = undefined
  let hasMore = true
  let pageCount = 0
  
  console.log('[Find Voice IDs] Step 1: Searching for premium voices using search API...')
  
  while (hasMore) {
    pageCount++
    console.log(`[Find Voice IDs] Fetching page ${pageCount}...`)
    
    const requestParams: {
      page_size?: number
      next_page_token?: string
      include_total_count?: boolean
    } = {
      page_size: 100,
      include_total_count: false,
    }
    
    if (nextPageToken) {
      requestParams.next_page_token = nextPageToken
    }
    
    try {
      const response = await client.voices.search(requestParams)
      
      if (!response || typeof response !== 'object') {
        console.error('[Find Voice IDs] Invalid response structure:', response)
        break
      }
      
      if (response.voices && Array.isArray(response.voices) && response.voices.length > 0) {
        // Premium 목소리 이름과 매칭되는 voice_id 찾기
        for (const v of response.voices) {
          const voiceId = v.voiceId || v.voice_id
          const name = v.name
          
          if (!voiceId || !name) continue
          
          // 이름의 첫 부분 추출 (예: "Roger - Laid-Back..." -> "Roger")
          const firstName = name.split(/[\s-]/)[0]?.toLowerCase()
          if (!firstName) continue
          
          // Premium 목록에 있는지 확인
          if (PREMIUM_VOICE_NAMES.includes(firstName)) {
            // 원본 이름으로 매핑 (대소문자 구분)
            const originalName = PREMIUM_VOICES.find(pv => pv.name.toLowerCase() === firstName)?.name
            if (originalName && !foundVoiceIds.has(originalName)) {
              foundVoiceIds.set(originalName, voiceId)
              console.log(`[Find Voice IDs] ✓ Found: ${originalName} -> ${voiceId}`)
            }
          }
        }
      }
      
      hasMore = response.hasMore === true || response.has_more === true
      nextPageToken = response.nextPageToken || response.next_page_token || null
      
      if (!hasMore || !nextPageToken) {
        break
      }
      
      // Premium 목소리를 모두 찾았으면 종료
      if (foundVoiceIds.size >= PREMIUM_VOICE_NAMES.length) {
        console.log('[Find Voice IDs] Found all premium voices, stopping search')
        break
      }
    } catch (error) {
      console.error('[Find Voice IDs] Error fetching voices:', error)
      if (error instanceof Error) {
        console.error('[Find Voice IDs] Error message:', error.message)
      }
      break
    }
  }
  
  console.log(`[Find Voice IDs] Found ${foundVoiceIds.size} premium voice IDs`)
  
  // 찾지 못한 목소리 확인
  const foundNames = Array.from(foundVoiceIds.keys()).map(n => n.toLowerCase())
  const missingNames = PREMIUM_VOICES.filter(v => !foundNames.includes(v.name.toLowerCase()))
  
  if (missingNames.length > 0) {
    console.warn(`[Find Voice IDs] ⚠️  Missing voices (${missingNames.length}):`, missingNames.map(v => v.name))
  }
  
  return foundVoiceIds
}

async function saveToSupabase(voiceIds: Map<string, string>): Promise<void> {
  console.log('[Find Voice IDs] Step 2: Saving to Supabase e_voices table...')
  
  const supabase = getSupabaseServiceClient()
  
  // Supabase에 저장할 데이터 준비
  const records = Array.from(voiceIds.entries()).map(([name, voice_id]) => ({
    name,
    voice_id,
    updated_at: new Date().toISOString(),
  }))
  
  console.log(`[Find Voice IDs] Preparing to save ${records.length} records...`)
  
  // upsert 사용 (이미 있으면 업데이트, 없으면 삽입)
  const { data, error } = await supabase
    .from('e_voices')
    .upsert(records, {
      onConflict: 'name',
    })
    .select()
  
  if (error) {
    console.error('[Find Voice IDs] ❌ Failed to save to Supabase:', error)
    throw error
  }
  
  console.log(`[Find Voice IDs] ✓ Successfully saved ${data?.length || 0} records to Supabase`)
  
  // 저장된 데이터 확인
  console.log('\n[Find Voice IDs] Saved voice IDs:')
  for (const record of records) {
    console.log(`  - ${record.name}: ${record.voice_id}`)
  }
}

async function main() {
  try {
    console.log('='.repeat(60))
    console.log('Premium Voice IDs Finder')
    console.log('='.repeat(60))
    console.log()
    
    // Step 1: voice_id 찾기
    const voiceIds = await findPremiumVoiceIds()
    
    if (voiceIds.size === 0) {
      console.error('[Find Voice IDs] ❌ No voice IDs found. Please check your ELEVENLABS_API_KEY.')
      process.exit(1)
    }
    
    // Step 2: Supabase에 저장
    await saveToSupabase(voiceIds)
    
    console.log()
    console.log('='.repeat(60))
    console.log('✓ Successfully completed!')
    console.log('='.repeat(60))
    
    // 최종 요약
    console.log('\nSummary:')
    console.log(`  - Total premium voices: ${PREMIUM_VOICE_NAMES.length}`)
    console.log(`  - Found voice IDs: ${voiceIds.size}`)
    console.log(`  - Saved to Supabase: ${voiceIds.size}`)
    
  } catch (error) {
    console.error('[Find Voice IDs] ❌ Fatal error:', error)
    if (error instanceof Error) {
      console.error('[Find Voice IDs] Error message:', error.message)
      console.error('[Find Voice IDs] Error stack:', error.stack)
    }
    process.exit(1)
  }
}

// 스크립트 실행
main()
