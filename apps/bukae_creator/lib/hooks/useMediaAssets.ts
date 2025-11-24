import { useQuery } from '@tanstack/react-query'

import type { MediaAsset } from '@/lib/types/media'

const fetchMediaAssets = async (): Promise<MediaAsset[]> => {
  const response = await fetch('/api/media')
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || errorData.message || '미디어 데이터를 불러오지 못했습니다.'
    console.error('[useMediaAssets] API 에러 상세:', {
      status: response.status,
      statusText: response.statusText,
      errorData,
      fullError: JSON.stringify(errorData, null, 2),
    })
    // 에러 메시지에 더 많은 정보 포함
    const detailedError = new Error(
      `${errorMessage}${errorData.errorName ? ` (${errorData.errorName})` : ''}`
    )
    if (errorData.stack) {
      console.error('[useMediaAssets] 서버 스택:', errorData.stack)
    }
    throw detailedError
  }
  return response.json()
}

export const useMediaAssets = () => {
  return useQuery({
    queryKey: ['media-assets'],
    queryFn: fetchMediaAssets,
    staleTime: 5 * 60 * 1000,
  })
}

