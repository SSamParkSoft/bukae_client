import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE_MB = 500 // 영상은 500MB까지
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/mov',
  'video/avi',
  'video/quicktime',
  'video/webm',
]

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { 
      endpoint: 'videos:pro:upload', 
      userId: auth.userId 
    })
    if (rl instanceof NextResponse) return rl

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sceneId = formData.get('sceneId') as string | null

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `지원하지 않는 파일 형식입니다: ${file.type}. 지원 형식: ${ALLOWED_MIME_TYPES.join(', ')}` 
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ 
        error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE_MB}MB까지 업로드 가능합니다.` 
      }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // 영상 파일 이름 생성: {timestamp}_scene_{sceneId}_video.{ext}
    const timestamp = Date.now()
    const sceneIdValue = sceneId || 'unknown'
    const fileExt = file.name.split('.').pop() || 'mp4'
    const fileName = `${timestamp}_scene_${sceneIdValue}_video.${fileExt}`
    
    // 경로 구성: pro_upload/{userId}/{fileName}
    // 사용자 ID로 구분하여 업로드
    const filePath = `${auth.userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('pro_upload')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // 같은 파일이면 덮어쓰기
      })

    if (uploadError) {
      console.error('Supabase 영상 업로드 실패:', uploadError)
      return NextResponse.json({ 
        error: `파일 업로드 실패: ${uploadError.message}` 
      }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('pro_upload')
      .getPublicUrl(filePath)

    if (!publicUrlData.publicUrl) {
      return NextResponse.json({ 
        error: '업로드된 파일의 공개 URL을 가져올 수 없어요.' 
      }, { status: 500 })
    }

    return NextResponse.json(
      { 
        success: true, 
        message: '영상 업로드 성공', 
        url: publicUrlData.publicUrl,
        filePath,
      },
      { headers: { ...(rl.headers ?? {}) } }
    )
  } catch (error) {
    console.error('영상 업로드 API 오류:', error)
    return NextResponse.json(
      {
        error: '파일 업로드 중 오류가 발생했어요.',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}
