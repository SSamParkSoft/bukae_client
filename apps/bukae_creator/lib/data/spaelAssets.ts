import type { MediaAsset } from '@/lib/types/media'
import type { CrawledImageAsset } from '@/lib/data/autoScenes'

const normalizeFilePath = (filePath: string) => (filePath.startsWith('/') ? filePath : `/${filePath}`)

export interface SpaelScenarioAssets {
  images: CrawledImageAsset[]
  finalVideo?: {
    url: string
    title: string
    description?: string | null
    script?: string | null
  }
}

export const mapMediaAssetsToSpaelScenario = (assets: MediaAsset[]): SpaelScenarioAssets => {
  if (!assets || assets.length === 0) {
    console.warn('[spaelAssets] 빈 assets 배열이 전달되었습니다.')
    return { images: [] }
  }

  const images = assets
    .filter((asset) => asset.type === 'image')
    .sort((a, b) => a.id - b.id)
    .map((asset) => {
      const normalizedUrl = normalizeFilePath(asset.filePath)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[spaelAssets] 이미지 매핑: ${asset.filePath} -> ${normalizedUrl}`)
      }
      return {
        id: `spael-image-${asset.id}`,
        url: normalizedUrl,
        label: asset.title,
        description: asset.description ?? '',
        scriptOverride: asset.script ?? undefined,
      }
    })

  const videoAsset = assets.find((asset) => asset.type === 'video')

  if (process.env.NODE_ENV === 'development') {
    console.log(`[spaelAssets] 시나리오 생성 완료: ${images.length}개 이미지, ${videoAsset ? '비디오 있음' : '비디오 없음'}`)
  }

  return {
    images,
    finalVideo: videoAsset
      ? {
          url: normalizeFilePath(videoAsset.filePath),
          title: videoAsset.title,
          description: videoAsset.description,
          script: videoAsset.script,
        }
      : undefined,
  }
}

