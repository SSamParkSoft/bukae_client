import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const supabase = getSupabaseServiceClient()
    const prefix = `tts/${auth.userId}`
    const allPaths: string[] = []

    // 페이지네이션으로 사용자 TTS 파일 전체 수집
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.storage.from('media').list(prefix, {
        limit: PAGE_SIZE,
        offset,
      })

      if (error) {
        console.error('[tts cleanup] 목록 조회 실패:', error)
        return NextResponse.json({ error: 'TTS 파일 목록을 가져오지 못했습니다.' }, { status: 500 })
      }

      if (!data || data.length === 0) break

      for (const item of data) {
        // 폴더가 아닌 파일만 제거 대상으로 추가
        if (item.metadata !== null) {
          allPaths.push(`${prefix}/${item.name}`)
        }
      }

      if (data.length < PAGE_SIZE) break
    }

    if (allPaths.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const { error: removeError } = await supabase.storage.from('media').remove(allPaths)
    if (removeError) {
      console.error('[tts cleanup] 삭제 실패:', removeError)
      return NextResponse.json({ error: 'TTS 파일 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: allPaths.length })
  } catch (error) {
    console.error('[tts cleanup] 처리 중 오류:', error)
    return NextResponse.json(
      { error: 'TTS 파일 정리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

