import { useQuery } from '@tanstack/react-query'

import type { MediaAsset } from '@/lib/types/media'

const fetchMediaAssets = async (): Promise<MediaAsset[]> => {
  const response = await fetch('/api/media')
  if (!response.ok) {
    throw new Error('미디어 데이터를 불러오지 못했습니다.')
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

