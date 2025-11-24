export type SceneLayout = 'default' | 'highlight'

export interface AutoScene {
  id: string
  assetId: string
  imageUrl: string
  imageLabel: string
  recommendedScript: string
  editedScript: string
  layout: SceneLayout
}
