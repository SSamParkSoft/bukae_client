'use client'

import { useMemo } from 'react'
import { getScenePlaceholder } from '@/lib/utils/placeholder-image'

interface UseSceneThumbnailsParams {
  scenes: Array<{ imageUrl?: string }>
  selectedImages: string[]
}

export function useSceneThumbnails({
  scenes,
  selectedImages,
}: UseSceneThumbnailsParams) {
  // sceneThumbnails 최적화: scenes와 selectedImages의 실제 변경사항만 추적
  const scenesImageUrls = useMemo(() => {
    return scenes.map(s => s.imageUrl || '')
  }, [scenes])
  
  const scenesImageKey = useMemo(() => {
    return scenesImageUrls.join(',') + '|' + selectedImages.join(',')
  }, [scenesImageUrls, selectedImages])
  
  const sceneThumbnails = useMemo(
    () => scenes.map((scene, index) => {
      const url = scene.imageUrl || selectedImages[index] || ''
      if (!url) return ''
      
      // URL 검증 및 수정
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url
      }
      if (url.startsWith('//')) {
        return `https:${url}`
      }
      if (url.startsWith('/')) {
        return url // 상대 경로는 그대로 사용
      }
      // 잘못된 URL인 경우 기본 placeholder 반환
      return getScenePlaceholder(index)
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenesImageKey]
  )

  return {
    sceneThumbnails,
  }
}
