export type MediaAssetType = 'video' | 'image'

export interface MediaAsset {
  id: number
  type: MediaAssetType
  title: string
  description?: string | null
  filePath: string
  script?: string | null
}

