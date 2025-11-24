import type { MediaAsset } from '@/lib/types/media'
import { mediaAssets } from './data/mediaAssets.generated'

export const getMediaAssets = (): MediaAsset[] => {
  // 빌드 타임에 생성된 데이터 사용
  return mediaAssets
}

