/**
 * Premium 목소리 voice_id Supabase 저장 스크립트
 * 
 * 실행 방법: pnpm tsx scripts/save-premium-voice-ids.ts
 * 
 * 이미 찾은 voice_id를 Supabase e_voices 테이블에 저장합니다.
 */

// .env.local 파일 로드
import { config } from 'dotenv'
import { resolve } from 'path'

const envPath = resolve(__dirname, '../.env.local')
config({ path: envPath })

import { getSupabaseServiceClient } from '../lib/api/supabase-server'

// Premium 목소리 voice_id 목록
const VOICE_IDS: Record<string, string> = {
  Adam: 'pNInz6obpgDQGcFmaJgB',
  Alice: 'Xb7hH8MSUJpSbSDYk0k2',
  Bill: 'pqHfZKP75CvOlQylNhV4',
  Brian: 'nPczCjzI2devNBz1zQrb',
  Callum: 'N2lVS1w4EtoT3dr4eOWO',
  Charlie: 'IKne3meq5aSn9XLyUdCD',
  Chris: 'iP95p4xoKVk53GoZ742B',
  Daniel: 'onwK4e9ZLuTAKqWW03F9',
  Eric: 'cjVigY5qzO86Huf0OWal',
  George: 'JBFqnCBsd6RMkjVDRZzb',
  Harry: 'SOYHLrjzK2X1ezoPC6cr',
  Jessica: 'cgSgspJ2msm6clMCkdW9',
  Laura: 'FGY2WhTYpPnrIDTdsKH5',
  Liam: 'TX3LPaxmHKxFdv7VOQHJ',
  Lily: 'pFZP5JQG7iQjIQuC4Bku',
  Matilda: 'XrExE9yKIg1WjnnlVkGX',
  River: 'SAz9YHcvj6GT2YYXdXww',
  Roger: 'CwhRBWXzGAHq8TQ4Fs17',
  Sarah: 'EXAVITQu4vr4xnSDxMaL',
  Will: 'bIHbv24MWmeRgasZH58o',
}

async function saveToSupabase() {
  console.log('='.repeat(60))
  console.log('Premium Voice IDs Saver')
  console.log('='.repeat(60))
  console.log()
  
  try {
    const supabase = getSupabaseServiceClient()
    
    // Supabase에 저장할 데이터 준비
    const records = Object.entries(VOICE_IDS).map(([name, voice_id]) => ({
      name,
      voice_id,
    }))
    
    console.log(`[Save Voice IDs] Preparing to save ${records.length} records...`)
    
    // upsert 사용 (이미 있으면 업데이트, 없으면 삽입)
    const { data, error } = await supabase
      .from('e_voices')
      .upsert(records, {
        onConflict: 'name',
      })
      .select()
    
    if (error) {
      console.error('[Save Voice IDs] ❌ Failed to save to Supabase:', error)
      throw error
    }
    
    console.log(`[Save Voice IDs] ✓ Successfully saved ${data?.length || 0} records to Supabase`)
    console.log()
    
    // 저장된 데이터 확인
    console.log('[Save Voice IDs] Saved voice IDs:')
    for (const record of records) {
      console.log(`  - ${record.name}: ${record.voice_id}`)
    }
    
    console.log()
    console.log('='.repeat(60))
    console.log('✓ Successfully completed!')
    console.log('='.repeat(60))
    
    // 최종 요약
    console.log('\nSummary:')
    console.log(`  - Total premium voices: ${records.length}`)
    console.log(`  - Saved to Supabase: ${records.length}`)
    
  } catch (error) {
    console.error('[Save Voice IDs] ❌ Fatal error:', error)
    if (error instanceof Error) {
      console.error('[Save Voice IDs] Error message:', error.message)
      console.error('[Save Voice IDs] Error stack:', error.stack)
    }
    process.exit(1)
  }
}

// 스크립트 실행
saveToSupabase()
