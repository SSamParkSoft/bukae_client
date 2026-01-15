import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/api/route-guard'
import { enforceRateLimit } from '@/lib/api/rate-limit'
import { getSupabaseServiceClient } from '@/lib/api/supabase-server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE_MB = 20 // 이미지는 20MB까지
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
]

export async function POST(request: Request) {
  try {
    const auth = await requireUser(request)
    if (auth instanceof NextResponse) return auth

    const rl = await enforceRateLimit(request, { 
      endpoint: 'images:upload', 
      userId: auth.userId 
    })
    if (rl instanceof NextResponse) return rl

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sceneIndex = formData.get('sceneIndex') as string | null
    const jobId = formData.get('jobId') as string | null

    if (!file) {
      return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 })
    }

    if (!jobId || jobId.trim() === '') {
      return NextResponse.json({ error: 'jobId가 필요합니다.' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `지원하지 않는 파일 형식입니다: ${file.type}` 
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ 
        error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE_MB}MB까지 업로드 가능합니다.` 
      }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // 이미지 파일 이름 생성: {timestamp}_scene_{sceneIndex}_image.{ext}
    const timestamp = Date.now()
    const sceneIndexValue = sceneIndex || 'unknown'
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}_scene_${sceneIndexValue}_image.${fileExt}`
    
    // 경로 구성: images/{userId}/{jobId}/{fileName}
    // jobId로 구분하여 같은 영상 작업의 이미지들을 한 폴더에 정리
    const filePath = `images/${auth.userId}/${jobId}/${fileName}`
    
    // 이미지 크기 읽기 (업로드 전에)
    let imageWidth = 0
    let imageHeight = 0
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const metadata = await sharp(buffer).metadata()
      imageWidth = metadata.width || 0
      imageHeight = metadata.height || 0
    } catch (sizeError) {
      console.warn('[images/upload] 이미지 크기 읽기 실패:', sizeError)
      // 크기 읽기 실패해도 업로드는 계속 진행
    }

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Supabase 이미지 업로드 실패:', uploadError)
      return NextResponse.json({ 
        error: `파일 업로드 실패: ${uploadError.message}` 
      }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    if (!publicUrlData.publicUrl) {
      return NextResponse.json({ 
        error: '업로드된 파일의 공개 URL을 가져올 수 없어요.' 
      }, { status: 500 })
    }

    return NextResponse.json(
      { 
        success: true, 
        message: '이미지 업로드 성공', 
        url: publicUrlData.publicUrl,
        width: imageWidth,
        height: imageHeight
      },
      { headers: { ...(rl.headers ?? {}) } }
    )
  } catch (error) {
    console.error('이미지 업로드 API 오류:', error)
    return NextResponse.json(
      {
        error: '파일 업로드 중 오류가 발생했어요.',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}
