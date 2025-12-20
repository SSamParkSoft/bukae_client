import { getSupabaseClient } from '@/lib/supabase/client'

/**
 * Supabase Storage에서 파일의 공개 URL을 가져옵니다.
 * @param bucketName - Storage 버킷 이름 (예: 'bgm', 'fonts')
 * @param filePath - 버킷 내 파일 경로 (예: 'bgm1.mp3', 'fonts/pretendard.woff2')
 * @returns 공개 URL 또는 null (파일이 없거나 에러 발생 시)
 */
export function getSupabaseStorageUrl(bucketName: string, filePath: string): string | null {
  try {
    const supabase = getSupabaseClient()
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)
    
    return data.publicUrl
  } catch {
    return null
  }
}

/**
 * BGM 파일의 Supabase Storage URL을 가져옵니다.
 * @param fileName - BGM 파일 이름 (예: 'bgm1.mp3' 또는 'bgm1/bgm1.mp3')
 * @returns 공개 URL 또는 null
 */
export function getBgmStorageUrl(fileName: string): string | null {
  return getSupabaseStorageUrl('bgms', fileName)
}

/**
 * 폰트 파일의 Supabase Storage URL을 가져옵니다.
 * @param filePath - 폰트 파일 경로 (예: 'pretendard/PretendardVariable.woff2')
 * @returns 공개 URL 또는 null
 */
export function getFontStorageUrl(filePath: string): string | null {
  return getSupabaseStorageUrl('fonts', filePath)
}

/**
 * 이미지 파일의 Supabase Storage URL을 가져옵니다.
 * @param fileName - 이미지 파일 이름 (예: 'spael-massager.png', 'num1.png')
 * @returns 공개 URL 또는 null
 */
export function getImageStorageUrl(fileName: string): string | null {
  return getSupabaseStorageUrl('images', fileName)
}

/**
 * /media/ 경로를 Supabase Storage URL로 변환합니다.
 * 환경 변수만 사용하여 빌드 타임/서버 사이드에서도 작동합니다.
 * @param mediaPath - /media/로 시작하는 경로 (예: '/media/spael-massager.png')
 * @returns Supabase Storage URL 또는 원본 경로 (변환 실패 시)
 */
export function convertMediaPathToStorageUrl(mediaPath: string): string {
  if (!mediaPath.startsWith('/media/')) {
    return mediaPath
  }
  
  const fileName = mediaPath.replace('/media/', '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  if (!supabaseUrl) {
    // 환경 변수가 없으면 원본 경로 반환 (개발 환경 등)
    return mediaPath
  }
  
  // Supabase Storage 공개 URL 직접 구성
  // 형식: {SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}/{FILE_PATH}
  return `${supabaseUrl}/storage/v1/object/public/images/${fileName}`
}

