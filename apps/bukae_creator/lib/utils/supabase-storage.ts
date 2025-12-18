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

