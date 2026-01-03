import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE_MB = 10 // 10MB
const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/mp3']

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { endpoint: 'media:upload', userId: auth.userId })
    if (rl instanceof NextResponse) return rl

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sceneId = formData.get('sceneId') as string | null

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `지원하지 않는 파일 형식입니다: ${file.type}` }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE_MB}MB까지 업로드 가능합니다.` }, { status: 400 })
    }

    // 서비스 역할 키를 사용하여 Supabase 클라이언트 생성 (RLS 우회)
    // 주의: 서비스 역할 키는 서버 사이드에서만 사용되어야 합니다.
    const supabase = getSupabaseServiceClient()

    // TTS API 형식으로 파일 이름 생성: {timestamp}_scene_{sceneId}_scene_{sceneId}_voice.mp3
    const timestamp = Date.now()
    const sceneIdValue = sceneId || 'unknown'
    const fileName = `${timestamp}_scene_${sceneIdValue}_scene_${sceneIdValue}_voice.mp3`
    
    // 경로 구성: userId 기반 경로 사용
    // media/tts/{userId}/{timestamp}_scene_{sceneId}_scene_{sceneId}_voice.mp3
    const filePath = `tts/${auth.userId}/${fileName}`
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // 같은 씬이면 덮어쓰기 (같은 파일 이름이 생성될 수 있음)
      })

    if (uploadError) {
      console.error('Supabase 파일 업로드 실패:', uploadError)
      return NextResponse.json({ error: `파일 업로드 실패: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath)

    if (!publicUrlData.publicUrl) {
      return NextResponse.json({ error: '업로드된 파일의 공개 URL을 가져올 수 없어요.' }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, message: '파일 업로드 성공', url: publicUrlData.publicUrl },
      { headers: { ...(rl.headers ?? {}) } }
    )
  } catch (error) {
    console.error('미디어 업로드 API 오류:', error)
    return NextResponse.json(
      {
        error: '파일 업로드 중 오류가 발생했어요.',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}

